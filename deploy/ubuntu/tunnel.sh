#!/usr/bin/env bash
# Puts the site on the internet at https://$DOMAIN through a Cloudflare Tunnel. Safe to run again.
# เปิดเว็บให้คนนอกเข้าได้ทาง https://$DOMAIN ผ่าน Cloudflare Tunnel (ไม่ต้องเปิดพอร์ตที่เราเตอร์)
#
#   sudo bash /opt/divepotato/app/deploy/ubuntu/tunnel.sh
#   sudo DOMAIN=demo.cleanandcare.live TUNNEL_NAME=divepotato-demo bash .../tunnel.sh
#   OVERWRITE_DNS=1 ...   # replace an existing DNS record for $DOMAIN
#
# Needs: the domain's zone (cleanandcare.live) in your Cloudflare account.
set -euo pipefail

HERE="$(cd "$(dirname "$(readlink -f "$0")")" && pwd)"
# shellcheck source=deploy/ubuntu/lib.sh
. "$HERE/lib.sh"

TUNNEL_NAME="${TUNNEL_NAME:-divepotato-demo}"
CF_DIR="${CF_DIR:-/etc/cloudflared}"
# Written by `cloudflared tunnel login`; lets cloudflared manage tunnels and DNS for the account
CERT="${TUNNEL_ORIGIN_CERT:-$HOME/.cloudflared/cert.pem}"

require_root

# --- 1. Install cloudflared from Cloudflare's apt repository ----------------------------------
if ! command -v cloudflared > /dev/null; then
  say "ติดตั้ง cloudflared จาก apt ของ Cloudflare" "Installing cloudflared from Cloudflare's apt repository"
  install -d -m 0755 /usr/share/keyrings
  curl -fsSL https://pkg.cloudflare.com/cloudflare-main.gpg -o /usr/share/keyrings/cloudflare-main.gpg
  echo 'deb [signed-by=/usr/share/keyrings/cloudflare-main.gpg] https://pkg.cloudflare.com/cloudflared any main' \
    > /etc/apt/sources.list.d/cloudflared.list
  apt-get update -q
  DEBIAN_FRONTEND=noninteractive apt-get install -y -q cloudflared
fi
ok "$(cloudflared --version | head -n 1)" "cloudflared installed"

# --- 2. Log in to Cloudflare (once) -------------------------------------------------------------
if [ ! -f "$CERT" ]; then
  say "ล็อกอิน Cloudflare: คัดลอกลิงก์ที่ขึ้นด้านล่างไปเปิดในเบราว์เซอร์ (บนคอมเครื่องไหนก็ได้) แล้วเลือกโดเมน ${DOMAIN#*.}" \
    "Cloudflare login: open the link printed below in any browser and pick the ${DOMAIN#*.} zone"
  echo "    (รอจนกว่าจะกด Authorize ในเบราว์เซอร์ / waiting until you click Authorize)"
  cloudflared tunnel login
  [ -f "$CERT" ] || die "ล็อกอินไม่สำเร็จ ลองรันสคริปต์นี้อีกครั้ง" "Login didn't finish; run this script again"
fi
export TUNNEL_ORIGIN_CERT="$CERT"
ok "ล็อกอิน Cloudflare แล้ว" "Logged in to Cloudflare ($CERT)"

# --- 3. Named tunnel ----------------------------------------------------------------------------
tunnel_id() {
  cloudflared tunnel list --name "$TUNNEL_NAME" 2> /dev/null |
    awk -v n="$TUNNEL_NAME" '$2 == n && length($1) == 36 { print $1; exit }'
}
install -d -m 0755 "$CF_DIR"
TID="$(tunnel_id)"
if [ -z "$TID" ]; then
  say "สร้าง tunnel ชื่อ $TUNNEL_NAME" "Creating tunnel $TUNNEL_NAME"
  cloudflared tunnel create --credentials-file "$CF_DIR/$TUNNEL_NAME.json" "$TUNNEL_NAME"
  TID="$(tunnel_id)"
  [ -n "$TID" ] || die "สร้าง tunnel ไม่สำเร็จ" "Couldn't create the tunnel"
else
  ok "มี tunnel $TUNNEL_NAME อยู่แล้ว ($TID)" "Tunnel $TUNNEL_NAME already exists ($TID)"
fi
CRED="$CF_DIR/$TUNNEL_NAME.json"
if [ ! -f "$CRED" ]; then
  # Tunnel made earlier (or on another machine): fetch its credentials again
  cloudflared tunnel token --cred-file "$CRED" "$TUNNEL_NAME"
fi
chmod 600 "$CRED"

# --- 4. DNS: $DOMAIN -> tunnel ------------------------------------------------------------------
say "ตั้ง DNS $DOMAIN ให้ชี้มาที่ tunnel" "Routing DNS $DOMAIN to the tunnel"
dns_args=()
if [ "${OVERWRITE_DNS:-0}" = 1 ]; then dns_args=(--overwrite-dns); fi
if ! cloudflared tunnel route dns "${dns_args[@]}" "$TUNNEL_NAME" "$DOMAIN"; then
  die "ตั้ง DNS ไม่สำเร็จ ถ้ามี record $DOMAIN อยู่แล้วให้ลบใน Cloudflare หรือรันใหม่ด้วย OVERWRITE_DNS=1" \
    "DNS routing failed; if $DOMAIN already has a record, delete it in Cloudflare or rerun with OVERWRITE_DNS=1"
fi

# --- 5. Config ----------------------------------------------------------------------------------
say "เขียน $CF_DIR/config.yml" "Writing $CF_DIR/config.yml"
cat > "$CF_DIR/config.yml.new" << EOF
# Written by deploy/ubuntu/tunnel.sh
tunnel: $TID
credentials-file: $CRED

ingress:
  - hostname: $DOMAIN
    service: http://127.0.0.1:$PORT
  - service: http_status:404
EOF
cloudflared tunnel --config "$CF_DIR/config.yml.new" ingress validate > /dev/null ||
  die "config.yml ไม่ถูกต้อง" "config.yml failed validation"
mv "$CF_DIR/config.yml.new" "$CF_DIR/config.yml"

# --- 6. Service ---------------------------------------------------------------------------------
if [ -f /etc/systemd/system/cloudflared.service ] || $SYSTEMCTL cat cloudflared.service > /dev/null 2>&1; then
  ok "มี service cloudflared อยู่แล้ว รีสตาร์ทให้ใช้ค่าใหม่" "cloudflared service exists; restarting it"
else
  say "ติดตั้ง cloudflared เป็น service (เปิดเองตอนเปิดเครื่อง)" "Installing cloudflared as a service (starts on boot)"
  cloudflared --config "$CF_DIR/config.yml" service install
fi
$SYSTEMCTL enable cloudflared > /dev/null 2>&1 || true
$SYSTEMCTL restart cloudflared

say "เสร็จแล้ว! รอ 1-2 นาทีแล้วเปิด https://$DOMAIN และ https://$DOMAIN/backoffice" \
  "Done! Give it a minute or two, then open https://$DOMAIN and https://$DOMAIN/backoffice"
echo "    สถานะ / status: systemctl status cloudflared    log: journalctl -u cloudflared -f"
