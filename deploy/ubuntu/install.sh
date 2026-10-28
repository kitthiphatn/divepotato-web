#!/usr/bin/env bash
# First-time install of the Dive Potato demo on Ubuntu Server 24.04 LTS. Safe to run again.
# ติดตั้งเว็บ Dive Potato บน Ubuntu Server 24.04 ครั้งแรก (รันซ้ำได้ ไม่ทับข้อมูลเดิม)
#
#   sudo bash deploy/ubuntu/install.sh
#   sudo SEED=1 bash deploy/ubuntu/install.sh                       # + sample data and demo users
#   sudo SEED=1 SEED_PHOTOS_DIR=/home/dive/photos bash deploy/ubuntu/install.sh
#   sudo BRANCH=feat/p0-deploy DOMAIN=demo.cleanandcare.live bash deploy/ubuntu/install.sh
#
# Layout: /opt/divepotato/{app,data,media,backups,releases,current,.env}
#   app/       git checkout of BRANCH; builds happen here
#   releases/  built copies of the app; current -> the one the service runs
#   data/      divepotato.db (never replaced)       media/  uploaded images (never replaced)
#   backups/   nightly + pre-update backups (14 days)
set -euo pipefail

HERE="$(cd "$(dirname "$(readlink -f "$0")")" && pwd)"
# shellcheck source=deploy/ubuntu/lib.sh
. "$HERE/lib.sh"

BRANCH="${BRANCH:-main}"
SEED="${SEED:-0}"
SEED_PHOTOS_DIR="${SEED_PHOTOS_DIR:-}"
NODE_MAJOR=22

require_root

if ! grep -q 'VERSION_ID="24.04"' /etc/os-release 2>/dev/null; then
  warn "สคริปต์นี้ทำมาสำหรับ Ubuntu 24.04 เครื่องนี้เป็นรุ่นอื่น จะลองต่อไป" \
    "Written for Ubuntu 24.04; this looks like another release, carrying on"
fi

# --- 1. System packages ------------------------------------------------------------------------
say "ติดตั้งโปรแกรมพื้นฐาน (git, sqlite3, build-essential ...)" \
  "Installing base packages (git, sqlite3, build-essential ...)"
export DEBIAN_FRONTEND=noninteractive
apt-get update -q
apt-get install -y -q ca-certificates curl gnupg git sqlite3 build-essential openssl \
  ufw unattended-upgrades

if ! command -v node > /dev/null || [ "$(node -p 'process.versions.node.split(".")[0]')" != "$NODE_MAJOR" ]; then
  say "ติดตั้ง Node.js $NODE_MAJOR LTS จาก NodeSource" "Installing Node.js $NODE_MAJOR LTS from NodeSource"
  install -d -m 0755 /etc/apt/keyrings
  curl -fsSL https://deb.nodesource.com/gpgkey/nodesource-repo.gpg.key |
    gpg --dearmor --yes -o /etc/apt/keyrings/nodesource.gpg
  echo "deb [signed-by=/etc/apt/keyrings/nodesource.gpg] https://deb.nodesource.com/node_$NODE_MAJOR.x nodistro main" \
    > /etc/apt/sources.list.d/nodesource.list
  apt-get update -q
  apt-get install -y -q nodejs
fi
ok "Node.js $(node -v)" "Node.js $(node -v)"

# --- 2. Security basics --------------------------------------------------------------------------
say "เปิดไฟร์วอลล์ (อนุญาตแค่ SSH) และอัปเดตความปลอดภัยอัตโนมัติ" \
  "Firewall (SSH only) and automatic security updates"
# The Cloudflare Tunnel connects outwards, so no web port has to be open
ufw allow OpenSSH > /dev/null
ufw --force enable > /dev/null
cat > /etc/apt/apt.conf.d/20auto-upgrades << 'EOF'
APT::Periodic::Update-Package-Lists "1";
APT::Periodic::Unattended-Upgrade "1";
EOF
systemctl enable --now unattended-upgrades > /dev/null 2>&1 || true
ok "ufw: $(ufw status | head -n 1)" "unattended-upgrades on"

# --- 3. User and folders -------------------------------------------------------------------------
if ! id "$APP_USER" > /dev/null 2>&1; then
  say "สร้างผู้ใช้ระบบ $APP_USER" "Creating system user $APP_USER"
  useradd --system --user-group --home-dir "$BASE_DIR" --no-create-home \
    --shell /usr/sbin/nologin "$APP_USER"
fi
install -d -m 0750 -o "$APP_USER" -g "$APP_USER" "$BASE_DIR" "$DATA_DIR" "$MEDIA_PATH" \
  "$BACKUP_DIR" "$RELEASES_DIR" "$BASE_DIR/.npm"

# --- 4. Code -------------------------------------------------------------------------------------
if [ -d "$APP_DIR/.git" ]; then
  ok "มีโค้ดอยู่แล้วที่ $APP_DIR (อัปเดตด้วย update.sh)" "Code already at $APP_DIR (use update.sh to update)"
else
  say "ดาวน์โหลดโค้ด ($BRANCH) จาก $REPO_URL" "Cloning $REPO_URL ($BRANCH)"
  as_app git clone --branch "$BRANCH" "$REPO_URL" "$APP_DIR" ||
    die "clone ไม่สำเร็จ ตรวจชื่อ branch ($BRANCH) และอินเทอร์เน็ต" \
      "Clone failed; check the branch name ($BRANCH) and the internet connection"
fi
[ -f "$APP_DIR/deploy/ubuntu/backup.sh" ] ||
  die "branch นี้ยังไม่มีสคริปต์ deploy/ubuntu ให้ใช้ BRANCH=feat/p0-deploy" \
    "This branch has no deploy/ubuntu scripts yet; use BRANCH=feat/p0-deploy"

# --- 5. Settings (.env) --------------------------------------------------------------------------
if [ -f "$ENV_FILE" ]; then
  ok "มีไฟล์ตั้งค่า $ENV_FILE อยู่แล้ว (ไม่เขียนทับ)" "$ENV_FILE exists, left as is"
else
  say "สร้างไฟล์ตั้งค่า $ENV_FILE พร้อมรหัสลับใหม่" "Writing $ENV_FILE with a new secret"
  (
    umask 077
    cat > "$ENV_FILE" << EOF
# Dive Potato settings (written by install.sh on $(date -I)). Keep this file private.
# Changing PAYLOAD_SECRET signs everyone out.
PAYLOAD_SECRET=$(openssl rand -hex 32)
DATABASE_URL=file:$DATA_DIR/divepotato.db
MEDIA_DIR=$MEDIA_PATH
NEXT_PUBLIC_SERVER_URL=https://$DOMAIN
NODE_ENV=production
EOF
  )
fi
chown "$APP_USER:$APP_USER" "$ENV_FILE"
chmod 600 "$ENV_FILE"
# The build and the seed read the same settings
as_app ln -sfn "$ENV_FILE" "$APP_DIR/.env"

# --- 6. Build ------------------------------------------------------------------------------------
built=0
if [ -e "$CURRENT_LINK" ] && [ "${REBUILD:-0}" != 1 ]; then
  ok "build ไว้แล้ว ($(readlink -f "$CURRENT_LINK"))" "Already built; REBUILD=1 to build again"
else
  rel="$(build_release)" || exit 1
  switch_release "$rel"
  prune_releases
  built=1
  ok "build เสร็จ: $rel" "Build done: $rel"
fi

# --- 7. Sample data ------------------------------------------------------------------------------
# Database migrations: Payload applies them itself when the app (or the seed) starts with
# NODE_ENV=production (prodMigrations in src/payload.config.ts), so there is no separate step.
if [ "$SEED" = 1 ]; then
  say "ใส่ข้อมูลตัวอย่างและบัญชีทดลอง" "Adding sample data and demo users"
  if [ -n "$SEED_PHOTOS_DIR" ] && ! as_app test -r "$SEED_PHOTOS_DIR"; then
    warn "ผู้ใช้ $APP_USER อ่านโฟลเดอร์รูป $SEED_PHOTOS_DIR ไม่ได้ จะข้ามรูป" \
      "$APP_USER can't read $SEED_PHOTOS_DIR; photos will be skipped"
  fi
  seed_env=(NODE_ENV=production "SEED_PHOTOS_DIR=${SEED_PHOTOS_DIR:-/nonexistent}")
  if [ -n "${SEED_ADMIN_EMAIL:-}" ]; then seed_env+=("SEED_ADMIN_EMAIL=$SEED_ADMIN_EMAIL"); fi
  if [ -n "${SEED_ADMIN_PASSWORD:-}" ]; then seed_env+=("SEED_ADMIN_PASSWORD=$SEED_ADMIN_PASSWORD"); fi
  (cd "$APP_DIR" && as_app env "${seed_env[@]}" npm run seed) ||
    die "ใส่ข้อมูลตัวอย่างไม่สำเร็จ" "Seeding failed"
fi

# --- 8. systemd services -------------------------------------------------------------------------
say "ติดตั้ง service ให้เว็บเปิดเองตอนเปิดเครื่อง และ backup ทุกคืนตี 3" \
  "Installing the systemd service (starts on boot) and the nightly 03:00 backup"
NODE_BIN="$(command -v node)"
cat > "/etc/systemd/system/$SERVICE.service" << EOF
# Written by deploy/ubuntu/install.sh
[Unit]
Description=Dive Potato website and backoffice (Next.js + Payload)
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=$APP_USER
Group=$APP_USER
EnvironmentFile=$ENV_FILE
Environment=NODE_ENV=production
# Only reachable from this machine; the public gets in through the Cloudflare Tunnel
Environment=HOSTNAME=127.0.0.1
Environment=PORT=$PORT
Environment=NODE_OPTIONS=--no-deprecation
Environment=NEXT_TELEMETRY_DISABLED=1
WorkingDirectory=$CURRENT_LINK
ExecStart=$NODE_BIN $CURRENT_LINK/server.js
Restart=always
RestartSec=5

# Hardening: the whole file system is read-only except the folders below.
# releases/ is writable because Next.js keeps its page and image cache inside .next/ of the release.
NoNewPrivileges=true
ProtectSystem=strict
ReadWritePaths=$DATA_DIR $MEDIA_PATH $BACKUP_DIR $RELEASES_DIR
PrivateTmp=true
PrivateDevices=true
ProtectHome=true
ProtectKernelTunables=true
ProtectKernelModules=true
ProtectControlGroups=true
RestrictSUIDSGID=true

[Install]
WantedBy=multi-user.target
EOF

cat > "/etc/systemd/system/$SERVICE-backup.service" << EOF
# Written by deploy/ubuntu/install.sh
[Unit]
Description=Dive Potato backup (database + media)

[Service]
Type=oneshot
User=$APP_USER
Group=$APP_USER
Environment=BASE_DIR=$BASE_DIR
ExecStart=$APP_DIR/deploy/ubuntu/backup.sh nightly
EOF

cat > "/etc/systemd/system/$SERVICE-backup.timer" << EOF
# Written by deploy/ubuntu/install.sh
[Unit]
Description=Nightly Dive Potato backup at 03:00

[Timer]
OnCalendar=*-*-* 03:00:00
# Runs at the next boot if the PC was off at 03:00
Persistent=true

[Install]
WantedBy=timers.target
EOF

$SYSTEMCTL daemon-reload
$SYSTEMCTL enable "$SERVICE.service" "$SERVICE-backup.timer" > /dev/null
$SYSTEMCTL start "$SERVICE-backup.timer"
if [ "$built" = 1 ]; then
  $SYSTEMCTL restart "$SERVICE"
else
  $SYSTEMCTL start "$SERVICE"
fi

say "ตรวจว่าเว็บทำงาน" "Health check"
if health_check; then
  say "ติดตั้งเสร็จ! เว็บทำงานที่ http://127.0.0.1:$PORT (เฉพาะในเครื่องนี้)" \
    "Installed! The site runs on http://127.0.0.1:$PORT (this machine only)"
  echo "    ขั้นต่อไป / Next: sudo bash $APP_DIR/deploy/ubuntu/tunnel.sh"
  echo "    แล้วเปิด / then open https://$DOMAIN and https://$DOMAIN/backoffice"
else
  die "เว็บยังไม่ตอบ ดู log ด้วย: journalctl -u $SERVICE -n 100" \
    "The site isn't answering; see the log: journalctl -u $SERVICE -n 100"
fi
