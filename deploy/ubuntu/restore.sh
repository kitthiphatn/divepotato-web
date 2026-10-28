#!/usr/bin/env bash
# Restores the database and media from a backup: stops the site, restores, starts it again.
# กู้ข้อมูลจาก backup: หยุดเว็บ คืนฐานข้อมูลและรูป แล้วเปิดเว็บใหม่
#
#   sudo bash /opt/divepotato/app/deploy/ubuntu/restore.sh                     # list backups
#   sudo bash /opt/divepotato/app/deploy/ubuntu/restore.sh 2026-10-28          # latest of that day
#   sudo bash /opt/divepotato/app/deploy/ubuntu/restore.sh 2026-10-28_030000-nightly
#   YES=1 ...                                                                  # don't ask
#
# The current data is backed up first (label "pre-restore"), so a restore can be undone.
set -euo pipefail

HERE="$(cd "$(dirname "$(readlink -f "$0")")" && pwd)"
# shellcheck source=deploy/ubuntu/lib.sh
. "$HERE/lib.sh"

require_root

list_backups() {
  find "$BACKUP_DIR" -mindepth 1 -maxdepth 1 -type d -name '20*' ! -name '*.partial' -printf '%f\n' 2> /dev/null | sort
}

WANT="${1:-}"
if [ -z "$WANT" ]; then
  say "backup ที่มี (ใส่ชื่อหรือวันที่ต่อท้ายคำสั่ง)" "Available backups (pass a name or a date)"
  list_backups | sed 's/^/    /'
  echo "    เช่น / e.g.: sudo bash $0 $(date +%Y-%m-%d)"
  exit 0
fi

# Latest backup whose name starts with what was given
NAME="$(list_backups | awk -v w="$WANT" 'index($0, w) == 1' | tail -n 1)"
[ -n "$NAME" ] || die "ไม่พบ backup '$WANT' (รันโดยไม่ใส่ชื่อเพื่อดูรายการ)" \
  "No backup matching '$WANT' (run without arguments to list them)"
SRC="$BACKUP_DIR/$NAME"
DB="$(db_path)"
MEDIA="$(media_path)"

say "จะกู้ข้อมูลจาก $NAME" "About to restore $NAME"
[ -f "$SRC/divepotato.db" ] && echo "    database -> $DB"
[ -f "$SRC/media.tar.gz" ] && echo "    media    -> $MEDIA"
if [ "${YES:-0}" != 1 ]; then
  read -r -p "    ข้อมูลปัจจุบันจะถูกแทนที่ (สำรองไว้ก่อนให้) พิมพ์ y เพื่อทำต่อ / Type y to continue: " answer
  [ "$answer" = y ] || die "ยกเลิก" "Cancelled"
fi

# Safety copy of what is there now
as_app env BASE_DIR="$BASE_DIR" ENV_FILE="$ENV_FILE" BACKUP_DIR="$BACKUP_DIR" \
  bash "$HERE/backup.sh" pre-restore

say "หยุดเว็บ" "Stopping the site"
$SYSTEMCTL stop "$SERVICE"
# Start the site again whatever happens below
trap '$SYSTEMCTL start "$SERVICE" || true' EXIT

if [ -f "$SRC/divepotato.db" ]; then
  mkdir -p "$(dirname "$DB")"
  cp "$SRC/divepotato.db" "$DB.restoring"
  rm -f "$DB-wal" "$DB-shm" "$DB-journal"
  mv -f "$DB.restoring" "$DB"
  chown "$APP_USER:$APP_USER" "$DB"
  ok "คืนฐานข้อมูลแล้ว" "Database restored"
fi

if [ -f "$SRC/media.tar.gz" ]; then
  work="$(mktemp -d "$(dirname "$MEDIA")/.media-restore.XXXXXX")"
  tar -xzf "$SRC/media.tar.gz" -C "$work"
  # The archive holds one folder (the media folder's name at backup time)
  set -- "$work"/*/
  extracted="${1%/}"
  [ -d "$extracted" ] || die "ไฟล์ media.tar.gz ไม่ถูกต้อง" "media.tar.gz has an unexpected layout"
  mkdir -p "$MEDIA"
  # Swap the folder contents in place (the folder itself stays, systemd allows writes to it)
  find "$MEDIA" -mindepth 1 -maxdepth 1 -exec rm -rf {} +
  cp -a "$extracted/." "$MEDIA/"
  rm -rf "$work"
  chown -R "$APP_USER:$APP_USER" "$MEDIA"
  ok "คืนรูปแล้ว" "Media restored"
fi

say "เปิดเว็บ" "Starting the site"
trap - EXIT
$SYSTEMCTL start "$SERVICE"
if health_check; then
  ok "กู้ข้อมูลจาก $NAME เสร็จ" "Restored $NAME"
else
  die "เว็บยังไม่ตอบหลังกู้ข้อมูล ดู: journalctl -u $SERVICE -n 100" \
    "The site isn't answering after the restore; see: journalctl -u $SERVICE -n 100"
fi
