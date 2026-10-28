# ติดตั้งเว็บ Dive Potato (เดโม) บนมินิพีซี Ubuntu

> **English summary:** self-hosted demo on an Ubuntu Server 24.04 LTS mini PC, published at
> https://demo.cleanandcare.live through a Cloudflare Tunnel. `install.sh` sets up Node 22, a
> `divepotato` system user, `/opt/divepotato`, the build and a hardened systemd service on
> 127.0.0.1:3006; `tunnel.sh` installs cloudflared and the named tunnel; `backup.sh` runs nightly
> at 03:00 (14 days kept); `update.sh` builds a new release before switching to it.

เว็บจะรันอยู่บนมินิพีซีที่บ้าน/ร้าน แล้วเปิดให้คนนอกเข้าได้ที่ **https://demo.cleanandcare.live**
ผ่าน Cloudflare Tunnel

- **HTTPS ฟรี** จาก Cloudflare ไม่ต้องซื้อหรือต่ออายุใบรับรองเอง
- **ไม่ต้องเปิดพอร์ต (port forwarding) ที่เราเตอร์** และไม่ต้องมี IP จริง เครื่องเป็นฝ่ายต่อออกไปหา Cloudflare เอง
- **ต้องเปิดเครื่องทิ้งไว้** ถ้าปิดเครื่องหรือเน็ตหลุด เว็บจะเข้าไม่ได้จนกว่าจะเปิดกลับมา

## สิ่งที่ต้องมี / What you need

- มินิพีซี (RAM 8 GB ขึ้นไปดีที่สุด ตอน build ใช้ RAM เยอะ, ดิสก์ว่าง 20 GB+) ต่อสาย LAN
- แฟลชไดรฟ์ 8 GB+ สำหรับติดตั้ง Ubuntu
- บัญชี Cloudflare ที่มีโดเมน `cleanandcare.live` อยู่แล้ว (Nameserver ชี้ไป Cloudflare)
- คอม Windows สำหรับสั่งงานผ่าน SSH

## 1. ติดตั้ง Ubuntu Server 24.04 LTS

1. ดาวน์โหลด **Ubuntu Server 24.04 LTS** จาก https://ubuntu.com/download/server
2. เขียนลงแฟลชไดรฟ์ด้วย [Rufus](https://rufus.ie) หรือ balenaEtcher แล้วบูตมินิพีซีจากแฟลชไดรฟ์
3. ทำตามตัวติดตั้ง (ใช้ค่าเริ่มต้นได้เกือบทั้งหมด):
   - ภาษา English, แป้นพิมพ์ English (US)
   - Network: ใช้ DHCP ตามที่ขึ้นมา **จด IP ไว้** (เช่น `192.168.1.50`)
   - Storage: Use an entire disk
   - Profile: ตั้งชื่อผู้ใช้ เช่น `dive` และรหัสผ่าน (จำไว้ ใช้ทั้งล็อกอินและ `sudo`)
   - **ติ๊ก "Install OpenSSH server"** (สำคัญ ไม่งั้นจะ SSH เข้าไม่ได้)
   - ไม่ต้องเลือก snap เพิ่ม
4. ติดตั้งเสร็จ ถอดแฟลชไดรฟ์ แล้ว Reboot

> แนะนำ: ตั้ง IP ของมินิพีซีให้คงที่ในหน้าตั้งค่าเราเตอร์ (DHCP reservation) จะได้ SSH ที่ IP เดิมทุกครั้ง
> (ไม่จำเป็นสำหรับเว็บ เพราะ Tunnel ไม่สนใจ IP ในบ้าน)

## 2. SSH เข้าเครื่องจาก Windows

เปิด **PowerShell** บนคอม Windows (อยู่วงเดียวกับมินิพีซี) แล้วพิมพ์

```powershell
ssh dive@192.168.1.50
```

(เปลี่ยน `dive` และ IP ให้ตรงกับของคุณ) ครั้งแรกจะถาม `Are you sure ... (yes/no)` ให้พิมพ์ `yes`
แล้วใส่รหัสผ่าน คำสั่งในขั้นต่อจากนี้ทั้งหมดพิมพ์ในหน้าต่าง SSH นี้

## 3. ติดตั้งเว็บ (install.sh)

```bash
sudo apt update && sudo apt install -y git
git clone https://github.com/kitthiphatn/divepotato-web.git
cd divepotato-web
sudo SEED=1 bash deploy/ubuntu/install.sh
```

- ใช้เวลาประมาณ 10-20 นาที (ดาวน์โหลด Node.js, แพ็กเกจ และ build)
- `SEED=1` = ใส่ **ข้อมูลตัวอย่าง** (ทริป คอร์ส การจอง ฯลฯ) และ **บัญชีทดลอง** ไม่ใส่ก็ได้ถ้าจะเริ่มจากฐานข้อมูลว่าง
- มีรูปร้าน `.webp`? คัดลอกขึ้นเครื่องก่อน แล้วเพิ่ม `SEED_PHOTOS_DIR=/home/dive/photos`
  (ผู้ใช้ `divepotato` ต้องอ่านโฟลเดอร์นั้นได้ เช่น `chmod -R a+rX /home/dive/photos` และ `chmod a+x /home/dive`)
- ตั้งรหัสผ่าน admin เองได้: `sudo SEED=1 SEED_ADMIN_PASSWORD='รหัสยาวๆ' bash deploy/ubuntu/install.sh`

> **ตอนนี้โค้ด deploy ยังอยู่ใน branch `feat/p0-deploy` (ยังไม่ merge เข้า `main`)**
> ระหว่างนี้ให้ใส่ `BRANCH=feat/p0-deploy` ด้วย:
> `git checkout feat/p0-deploy && sudo SEED=1 BRANCH=feat/p0-deploy bash deploy/ubuntu/install.sh`

สคริปต์ทำอะไรบ้าง / What it does (รันซ้ำได้ ไม่ทับข้อมูลและ `.env` เดิม):

1. ติดตั้ง Node.js 22 LTS (NodeSource), git, sqlite3, build-essential
2. เปิดไฟร์วอลล์ `ufw` ให้เข้าได้แค่ SSH และเปิดอัปเดตความปลอดภัยอัตโนมัติ (unattended-upgrades)
3. สร้างผู้ใช้ระบบ `divepotato` และโฟลเดอร์

   ```
   /opt/divepotato/
     .env        ค่าตั้งค่าและรหัสลับ (chmod 600) ห้ามแชร์
     app/        โค้ดจาก GitHub (build ที่นี่)
     releases/   เวอร์ชันที่ build แล้ว (เก็บ 3 ชุดล่าสุด)
     current ->  เวอร์ชันที่เว็บใช้อยู่
     data/       ฐานข้อมูล divepotato.db
     media/      รูปที่อัปโหลดจากหลังบ้าน
     backups/    สำเนาสำรอง (เก็บ 14 วัน)
   ```

4. build เว็บ แล้วติดตั้ง service `divepotato` (เปิดเองตอนเปิดเครื่อง, ล่มแล้วเปิดใหม่เอง)
   ฟังเฉพาะ `127.0.0.1:3006` คนนอกเข้าตรงไม่ได้ ต้องผ่าน Tunnel เท่านั้น
5. ตั้ง backup อัตโนมัติทุกคืนตี 3

ฐานข้อมูลจะถูกสร้าง/อัปเดตโครงสร้าง (migration) ให้อัตโนมัติตอนเว็บเริ่มทำงาน
(Database migrations run automatically when the app starts with `NODE_ENV=production`.)

## 4. เปิดให้คนนอกเข้า (tunnel.sh)

```bash
sudo bash /opt/divepotato/app/deploy/ubuntu/tunnel.sh
```

1. สคริปต์ติดตั้ง `cloudflared` แล้วขึ้นลิงก์ `https://dash.cloudflare.com/argotunnel?...`
2. **คัดลอกลิงก์ไปเปิดในเบราว์เซอร์บนคอม Windows** ล็อกอิน Cloudflare เลือกโดเมน
   `cleanandcare.live` แล้วกด **Authorize** (ใน PowerShell ลากเมาส์คลุมลิงก์แล้วคลิกขวาเพื่อคัดลอก)
3. สคริปต์ทำต่อเอง: สร้าง tunnel `divepotato-demo`, ตั้ง DNS `demo.cleanandcare.live`,
   เขียน `/etc/cloudflared/config.yml` และติดตั้ง service `cloudflared`

ถ้ามี DNS record `demo` อยู่ก่อนแล้ว สคริปต์จะหยุดและบอก ให้ลบ record นั้นใน Cloudflare
หรือรันใหม่ด้วย `sudo OVERWRITE_DNS=1 bash .../tunnel.sh`

## 5. ลองใช้งาน

- หน้าเว็บ: https://demo.cleanandcare.live
- หลังบ้าน: https://demo.cleanandcare.live/backoffice

บัญชีทดลอง (ถ้ารันด้วย `SEED=1`):

| บทบาท | ชื่อผู้ใช้ | รหัสผ่าน |
|---|---|---|
| Admin | `admin` | `divepotato-demo` (หรือ `SEED_ADMIN_PASSWORD` ที่ตั้งไว้) |
| พนักงาน | `staff` | `divepotato-demo` |
| บรรณาธิการ | `editor` | `divepotato-demo` |
| ไกด์ | `guide` | `divepotato-demo` |

> **สำคัญ:** เว็บนี้เปิดสู่อินเทอร์เน็ต รหัส `divepotato-demo` เป็นรหัสที่ทุกคนรู้ (อยู่ใน GitHub)
> หลังล็อกอินครั้งแรก ให้ไปที่ **ตั้งค่า** แล้วตั้งรหัสผ่านใหม่ให้ทุกบัญชี
> (The demo passwords are public; change them in Settings right after the first login.)

ถ้าไม่ได้ใช้ `SEED=1` ให้เปิด `https://demo.cleanandcare.live/admin` **ทันที** แล้วสร้างบัญชีผู้ดูแลคนแรก
(คนแรกที่เปิดหน้านี้จะได้สร้างบัญชี)

## งานประจำ / Day-to-day

### อัปเดตเว็บเป็นเวอร์ชันล่าสุด / Update

```bash
sudo bash /opt/divepotato/app/deploy/ubuntu/update.sh
```

ทำตามลำดับ: backup → ดึงโค้ดล่าสุดของ branch เดิม → build เป็นเวอร์ชันใหม่ (เว็บเดิมยังเปิดอยู่)
→ สลับไปใช้ → รีสตาร์ท → ตรวจ `/th` และ `/backoffice/login`
ถ้า build พัง เว็บเดิมยังทำงานตามปกติ ถ้าตรวจไม่ผ่าน สคริปต์จะบอกคำสั่งย้อนกลับให้
เปลี่ยน branch ได้ด้วย `sudo BRANCH=main bash .../update.sh`

### ดู log / Logs

```bash
journalctl -u divepotato -f          # log ของเว็บ (กด Ctrl+C เพื่อออก)
journalctl -u cloudflared -f         # log ของ tunnel
systemctl status divepotato cloudflared
sudo systemctl restart divepotato    # รีสตาร์ทเว็บ
```

### สำรองข้อมูล / Backup

ระบบ backup ให้เองทุกคืนตี 3 และก่อนทุกครั้งที่อัปเดต (เก็บ 14 วัน) ที่
`/opt/divepotato/backups/<วันที่_เวลา>/` (ฐานข้อมูล `divepotato.db` + รูป `media.tar.gz`)

```bash
sudo bash /opt/divepotato/app/deploy/ubuntu/backup.sh      # backup ตอนนี้เลย
systemctl list-timers divepotato-backup.timer               # ดูรอบถัดไป
```

ควรคัดลอก backup ออกจากเครื่องเป็นระยะ (เครื่องพัง = backup ในเครื่องหายด้วย) เช่นจาก PowerShell:

```powershell
scp -r dive@192.168.1.50:/opt/divepotato/backups .
```

(ต้องให้ผู้ใช้ `dive` อ่านได้ก่อน: `sudo cp -r /opt/divepotato/backups ~ && sudo chown -R dive ~/backups`
แล้ว `scp -r dive@192.168.1.50:backups .`)

### กู้ข้อมูล / Restore

```bash
sudo bash /opt/divepotato/app/deploy/ubuntu/restore.sh              # ดูรายการ backup
sudo bash /opt/divepotato/app/deploy/ubuntu/restore.sh 2026-10-28   # กู้ชุดล่าสุดของวันนั้น
```

สคริปต์จะถามยืนยัน, backup ข้อมูลปัจจุบันไว้ก่อน (ชื่อลงท้าย `-pre-restore` เผื่อเปลี่ยนใจ),
หยุดเว็บ, คืนฐานข้อมูลและรูป แล้วเปิดเว็บและตรวจให้

## ไฟดับ / เครื่องรีสตาร์ท (After a power cut)

ไม่ต้องทำอะไร: เมื่อเครื่องเปิดกลับมา `divepotato` และ `cloudflared` เปิดเอง
และถ้าเครื่องปิดอยู่ตอนตี 3 จะ backup ให้ตอนเปิดเครื่อง รอ 1-2 นาทีแล้วลองเปิดเว็บ ถ้ายังไม่ขึ้น:

```bash
systemctl status divepotato cloudflared
sudo systemctl restart divepotato cloudflared
```

> แนะนำ: ใน BIOS ของมินิพีซี ตั้ง **"Restore on AC Power Loss" = Power On** เพื่อให้เครื่องเปิดเองเมื่อไฟกลับ

## แก้ปัญหา / Troubleshooting

| อาการ | ทำอย่างไร |
|---|---|
| เว็บขึ้น Error 1033 / 502 ของ Cloudflare | tunnel หรือเว็บไม่ทำงาน: `systemctl status cloudflared divepotato` แล้ว restart |
| `update.sh` บอก build ไม่สำเร็จ | เว็บเดิมยังทำงาน ดูข้อความ error ด้านบน, RAM ไม่พอให้ปิดโปรแกรมอื่นแล้วลองใหม่ |
| ลืมรหัส admin | ให้ admin คนอื่นตั้งรหัสใหม่ใน ตั้งค่า หรือกู้จาก backup |
| อยากเปลี่ยนโดเมน | แก้ `NEXT_PUBLIC_SERVER_URL` ใน `/opt/divepotato/.env`, รัน `sudo DOMAIN=โดเมนใหม่ bash .../tunnel.sh` แล้ว `update.sh` (build ใหม่) |

## ความปลอดภัย / Security notes

- `ufw` อนุญาตแค่ SSH (พอร์ต 22) ไม่มีพอร์ตเว็บเปิดรับจากภายนอก เพราะ tunnel ต่อออกไปหา Cloudflare
- เว็บฟังเฉพาะ `127.0.0.1:3006` และรันเป็นผู้ใช้ `divepotato` ที่แก้ไฟล์ได้แค่ `data/`, `media/`,
  `backups/`, `releases/` (systemd `ProtectSystem=strict`, `NoNewPrivileges`, `PrivateTmp`)
- `/opt/divepotato/.env` มี `PAYLOAD_SECRET` (chmod 600) ห้ามส่งให้ใคร ถ้าเปลี่ยนค่านี้ทุกคนต้องล็อกอินใหม่
- Ubuntu ติดตั้งแพตช์ความปลอดภัยเอง (unattended-upgrades)
