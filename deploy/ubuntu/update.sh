#!/usr/bin/env bash
# Updates the site to the latest code of its branch.
# อัปเดตเว็บเป็นโค้ดล่าสุด: backup -> ดึงโค้ด -> build ใหม่ -> สลับไปใช้ -> รีสตาร์ท -> ตรวจ
#
#   sudo bash /opt/divepotato/app/deploy/ubuntu/update.sh
#   sudo BRANCH=main bash /opt/divepotato/app/deploy/ubuntu/update.sh   # switch branch
#
# The new version is built into its own folder under releases/ while the site keeps running;
# if the build fails nothing is switched or restarted. Database migrations run on start.
set -euo pipefail

HERE="$(cd "$(dirname "$(readlink -f "$0")")" && pwd)"
# shellcheck source=deploy/ubuntu/lib.sh
. "$HERE/lib.sh"

# Everything runs inside main(), which bash reads in full before starting: the git update below
# rewrites this very file, and bash would otherwise read the new version halfway through.
main() {
require_root
[ -d "$APP_DIR/.git" ] || die "ไม่พบโค้ดที่ $APP_DIR ให้รัน install.sh ก่อน" "No checkout at $APP_DIR; run install.sh first"

BRANCH="${BRANCH:-$(as_app git -C "$APP_DIR" rev-parse --abbrev-ref HEAD)}"
previous="$(readlink -f "$CURRENT_LINK" 2> /dev/null || true)"

# 1. Backup
say "สำรองข้อมูลก่อนอัปเดต" "Backing up before the update"
as_app env BASE_DIR="$BASE_DIR" ENV_FILE="$ENV_FILE" BACKUP_DIR="$BACKUP_DIR" \
  bash "$HERE/backup.sh" pre-update

# 2. Code
say "ดึงโค้ดล่าสุดของ $BRANCH" "Fetching the latest $BRANCH"
old_rev="$(as_app git -C "$APP_DIR" rev-parse --short HEAD)"
as_app git -C "$APP_DIR" fetch --quiet origin "+refs/heads/$BRANCH:refs/remotes/origin/$BRANCH" ||
  die "ดึงโค้ดไม่สำเร็จ (ชื่อ branch หรืออินเทอร์เน็ต)" "git fetch failed (branch name or internet)"
if [ "$(as_app git -C "$APP_DIR" rev-parse --abbrev-ref HEAD)" != "$BRANCH" ]; then
  as_app git -C "$APP_DIR" checkout --quiet -B "$BRANCH" "origin/$BRANCH"
fi
as_app git -C "$APP_DIR" merge --quiet --ff-only "origin/$BRANCH" ||
  die "โค้ดในเครื่องถูกแก้ไว้ อัปเดตแบบ fast-forward ไม่ได้ ดู: git -C $APP_DIR status" \
    "Local changes in $APP_DIR block a fast-forward; see: git -C $APP_DIR status"
new_rev="$(as_app git -C "$APP_DIR" rev-parse --short HEAD)"
ok "$old_rev -> $new_rev" "code at $new_rev"

# 3. Build (the running site is untouched until this succeeds)
rel="$(build_release)" || exit 1

# 4. Switch and restart
say "สลับไปใช้เวอร์ชันใหม่และรีสตาร์ท" "Switching to the new build and restarting"
switch_release "$rel"
$SYSTEMCTL restart "$SERVICE"

# 5. Health check
say "ตรวจว่าเว็บทำงาน" "Health check"
if health_check; then
  prune_releases
  say "อัปเดตสำเร็จ ($new_rev)" "Update succeeded ($new_rev)"
else
  printf '\n\033[1;31m[อัปเดตไม่สำเร็จ / UPDATE FAILED]\033[0m\n' >&2
  echo "    ดู log / See the log:  journalctl -u $SERVICE -n 100" >&2
  if [ -n "$previous" ]; then
    echo "    ย้อนกลับเวอร์ชันเดิม / Roll back the code:" >&2
    echo "      sudo ln -sfn $previous $CURRENT_LINK && sudo systemctl restart $SERVICE" >&2
    echo "    ถ้าต้องคืนฐานข้อมูลด้วย / If the database must go back too:" >&2
    echo "      sudo bash $HERE/restore.sh <ชื่อ backup pre-update ด้านบน / pre-update backup above>" >&2
  fi
  exit 1
fi
}

main "$@"; exit $?
