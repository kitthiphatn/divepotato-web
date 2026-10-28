# shellcheck shell=bash
# Shared settings and helpers for the Dive Potato deploy scripts (sourced, not run).
# ค่าตั้งต้นและฟังก์ชันที่สคริปต์ deploy ใช้ร่วมกัน
#
# Every setting can be overridden from the environment, e.g. `sudo DOMAIN=x.example.com bash install.sh`.

BASE_DIR="${BASE_DIR:-/opt/divepotato}"
APP_USER="${APP_USER:-divepotato}"
APP_DIR="${APP_DIR:-$BASE_DIR/app}"                # git checkout, built here
DATA_DIR="${DATA_DIR:-$BASE_DIR/data}"             # SQLite database
MEDIA_PATH="${MEDIA_PATH:-$BASE_DIR/media}"        # uploaded images
BACKUP_DIR="${BACKUP_DIR:-$BASE_DIR/backups}"
RELEASES_DIR="${RELEASES_DIR:-$BASE_DIR/releases}" # built, ready-to-run copies of the app
CURRENT_LINK="${CURRENT_LINK:-$BASE_DIR/current}"  # -> the release the service runs
ENV_FILE="${ENV_FILE:-$BASE_DIR/.env}"
SERVICE="${SERVICE:-divepotato}"
PORT="${PORT:-3006}"
DOMAIN="${DOMAIN:-demo.cleanandcare.live}"
REPO_URL="${REPO_URL:-https://github.com/kitthiphatn/divepotato-web.git}"
KEEP_RELEASES="${KEEP_RELEASES:-3}"
# Lets the scripts run where systemd isn't available (tests): SYSTEMCTL=true
SYSTEMCTL="${SYSTEMCTL:-systemctl}"

# Messages: Thai first, English underneath
say() { printf '\n\033[1;34m==>\033[0m %s\n    %s\n' "$1" "$2"; }
ok() { printf '\033[1;32m[OK]\033[0m %s / %s\n' "$1" "$2"; }
warn() { printf '\033[1;33m[!]\033[0m %s\n    %s\n' "$1" "$2" >&2; }
die() {
  printf '\n\033[1;31m[ผิดพลาด / ERROR]\033[0m %s\n    %s\n' "$1" "$2" >&2
  exit 1
}

require_root() {
  if [ "$(id -u)" -ne 0 ]; then
    die "ต้องรันด้วย sudo เช่น: sudo bash $0" "Run this with sudo, e.g.: sudo bash $0"
  fi
}

# Runs a command as the app user (directly when we already are that user, as in tests)
as_app() {
  if [ "$(id -un)" = "$APP_USER" ]; then
    env npm_config_cache="$BASE_DIR/.npm" npm_config_update_notifier=false "$@"
  else
    sudo -u "$APP_USER" -H env npm_config_cache="$BASE_DIR/.npm" npm_config_update_notifier=false "$@"
  fi
}

# Reads one KEY=value from the .env file (no shell evaluation)
env_value() {
  local key="$1" file="${2:-$ENV_FILE}"
  [ -r "$file" ] || return 0
  sed -n "s/^[[:space:]]*$key=//p" "$file" | tail -n 1 | sed -e 's/^["'\'']//' -e 's/["'\'']$//'
}

# Absolute path of the SQLite file from DATABASE_URL (file:/abs/path or file:./relative)
db_path() {
  local url
  url="${DATABASE_URL:-$(env_value DATABASE_URL)}"
  url="${url:-file:$DATA_DIR/divepotato.db}"
  url="${url#file:}"
  url="${url#//}"
  case "$url" in
    /*) printf '%s\n' "$url" ;;
    *) printf '%s\n' "$APP_DIR/${url#./}" ;;
  esac
}

# Media folder from MEDIA_DIR in .env (falls back to MEDIA_PATH)
media_path() {
  local dir
  dir="${MEDIA_DIR:-$(env_value MEDIA_DIR)}"
  dir="${dir:-$MEDIA_PATH}"
  case "$dir" in
    /*) printf '%s\n' "$dir" ;;
    *) printf '%s\n' "$APP_DIR/${dir#./}" ;;
  esac
}

# Builds the checked-out code into a new folder under releases/ and prints its path.
# The running site is not touched, so a failed build never takes it down.
build_release() {
  local stamp rel tmpdb public_url
  stamp="$(date +%Y%m%d-%H%M%S)"
  rel="$RELEASES_DIR/$stamp"
  public_url="$(env_value NEXT_PUBLIC_SERVER_URL)"
  public_url="${public_url:-https://$DOMAIN}"
  mkdir -p "$RELEASES_DIR" "$BASE_DIR/build-tmp"
  chown "$APP_USER:$APP_USER" "$RELEASES_DIR" "$BASE_DIR/build-tmp"
  # Throwaway database for the build: pages pre-rendered at build time must not touch the real one
  tmpdb="$BASE_DIR/build-tmp/build-$stamp.db"

  say "ติดตั้งแพ็กเกจ (npm ci)..." "Installing packages (npm ci)..." >&2
  (cd "$APP_DIR" && as_app npm ci --include=dev --no-audit --no-fund) >&2 ||
    die "npm ci ไม่สำเร็จ เว็บเดิมยังทำงานอยู่" "npm ci failed; the running site was not changed"

  say "build เว็บ (ใช้เวลาหลายนาที)..." "Building the site (takes several minutes)..." >&2
  if ! (cd "$APP_DIR" && as_app env DATABASE_URL="file:$tmpdb" \
    NEXT_PUBLIC_SERVER_URL="$public_url" NEXT_TELEMETRY_DISABLED=1 npm run build) >&2; then
    rm -f "$tmpdb"*
    die "build ไม่สำเร็จ เว็บเดิมยังทำงานอยู่ (ไม่ได้รีสตาร์ท)" \
      "Build failed; the running site was not changed or restarted"
  fi
  rm -f "$tmpdb"*

  # Package the standalone server the same way the Lomprayah release build does
  as_app mkdir -p "$rel.partial"
  as_app cp -a "$APP_DIR/.next/standalone/." "$rel.partial/"
  as_app cp -a "$APP_DIR/.next/static" "$rel.partial/.next/static"
  if [ -d "$APP_DIR/public" ]; then as_app cp -a "$APP_DIR/public" "$rel.partial/public"; fi
  # Settings come from the systemd EnvironmentFile; keep no copy of the secrets in the release
  rm -f "$rel.partial"/.env*
  as_app git -C "$APP_DIR" rev-parse HEAD > "$rel.partial/RELEASE" 2> /dev/null || true
  mv "$rel.partial" "$rel"
  printf '%s\n' "$rel"
}

# Points current -> the given release (atomic rename)
switch_release() {
  ln -sfn "$1" "$CURRENT_LINK.new"
  mv -T "$CURRENT_LINK.new" "$CURRENT_LINK"
}

# Keeps the newest KEEP_RELEASES releases (never the one in use)
prune_releases() {
  local in_use dir
  in_use="$(readlink -f "$CURRENT_LINK" 2>/dev/null || true)"
  rm -rf "$RELEASES_DIR"/*.partial
  # Release names are timestamps, so a reverse name sort is newest first
  find "$RELEASES_DIR" -mindepth 1 -maxdepth 1 -type d -name '20*' | sort -r |
    tail -n +"$((KEEP_RELEASES + 1))" | while read -r dir; do
    [ "$(readlink -f "$dir")" = "$in_use" ] || rm -rf "$dir"
  done
}

# Waits for a URL on the local app to answer 200 (up to ~90 s, the first start runs migrations)
check_url() {
  local path="$1" code="" i
  for i in $(seq 1 45); do
    code="$(curl -s -o /dev/null -w '%{http_code}' --max-time 20 "http://127.0.0.1:$PORT$path" || true)"
    [ "$code" = "200" ] && break
    [ "$i" -lt 45 ] && sleep 2
  done
  if [ "$code" = "200" ]; then
    ok "$path ตอบ 200" "$path answered 200"
  else
    warn "$path ตอบ ${code:-ไม่มีคำตอบ}" "$path answered ${code:-nothing} (expected 200)"
    return 1
  fi
}

health_check() {
  local failed=0
  check_url /th || failed=1
  check_url /backoffice/login || failed=1
  return "$failed"
}
