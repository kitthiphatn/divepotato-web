#!/usr/bin/env bash
# Backs up the database (consistent copy with sqlite3 .backup) and the media folder.
# สำรองฐานข้อมูลและรูปที่อัปโหลด เก็บไว้ 14 วัน
#
#   sudo bash /opt/divepotato/app/deploy/ubuntu/backup.sh            # manual backup
#   backup.sh nightly | pre-update | pre-restore                     # optional label
#
# Result: /opt/divepotato/backups/<YYYY-MM-DD_HHMMSS>[-label]/{divepotato.db,media.tar.gz}
# Run nightly at 03:00 by divepotato-backup.timer. Paths can be overridden for tests:
#   BASE_DIR, ENV_FILE, DATABASE_URL, MEDIA_DIR, BACKUP_DIR, KEEP_DAYS
set -euo pipefail

HERE="$(cd "$(dirname "$(readlink -f "$0")")" && pwd)"
# shellcheck source=deploy/ubuntu/lib.sh
. "$HERE/lib.sh"

LABEL="${1:-}"
KEEP_DAYS="${KEEP_DAYS:-14}"
DB="$(db_path)"
MEDIA="$(media_path)"

command -v sqlite3 > /dev/null || die "ไม่พบโปรแกรม sqlite3 (sudo apt install sqlite3)" "sqlite3 not found (sudo apt install sqlite3)"
mkdir -p "$BACKUP_DIR"

name="$(date +%Y-%m-%d_%H%M%S)${LABEL:+-$LABEL}"
dest="$BACKUP_DIR/$name"
tmp="$dest.partial"
rm -rf "$tmp"
mkdir -p "$tmp"
trap 'rm -rf "$tmp"' EXIT

say "สำรองข้อมูล -> $dest" "Backing up to $dest"

if [ -f "$DB" ]; then
  # .backup copies a consistent snapshot even while the site is writing
  sqlite3 -cmd '.timeout 30000' "$DB" ".backup '$tmp/divepotato.db'"
  check="$(sqlite3 "$tmp/divepotato.db" 'PRAGMA integrity_check;')"
  [ "$check" = ok ] || die "สำเนาฐานข้อมูลเสีย: $check" "The database copy failed its integrity check: $check"
  ok "ฐานข้อมูล $(du -h "$tmp/divepotato.db" | cut -f1)" "database $DB"
else
  warn "ไม่พบฐานข้อมูล $DB (ข้าม)" "No database at $DB (skipped)"
fi

if [ -d "$MEDIA" ]; then
  tar -czf "$tmp/media.tar.gz" -C "$(dirname "$MEDIA")" "$(basename "$MEDIA")"
  ok "รูป $(du -h "$tmp/media.tar.gz" | cut -f1)" "media $MEDIA"
else
  warn "ไม่พบโฟลเดอร์รูป $MEDIA (ข้าม)" "No media folder at $MEDIA (skipped)"
fi

mv "$tmp" "$dest"
trap - EXIT
# Run by hand with sudo: hand the files to the app user so the nightly job can prune them later
if [ "$(id -u)" -eq 0 ] && id "$APP_USER" > /dev/null 2>&1; then
  chown -R "$APP_USER:$APP_USER" "$dest"
fi
chmod 700 "$dest"

# Keep KEEP_DAYS days
find "$BACKUP_DIR" -mindepth 1 -maxdepth 1 -type d -name '20*' ! -name '*.partial' \
  -mtime +"$((KEEP_DAYS - 1))" -print -exec rm -rf {} + | sed 's/^/    removed old backup: /'

ok "สำรองเสร็จ: $name" "Backup done: $name"
