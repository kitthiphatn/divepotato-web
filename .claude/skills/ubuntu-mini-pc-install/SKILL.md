---
name: ubuntu-mini-pc-install
description: Step-by-step guide for installing Ubuntu Server on a mini PC, getting it on Wi-Fi, SSH-ing in from Windows and deploying the Dive Potato demo with deploy/ubuntu. Use when setting up a new demo/server machine or when an install, network, SSH or seed step fails.
---

# ติดตั้งมินิพีซี Ubuntu + เว็บ Dive Potato (บทเรียนจากการติดตั้งจริง)

> **English summary:** what actually worked on 2026-10-30 when installing the demo on an ASUS NUC 14
> Essential, plus every problem hit on the way and its fix. Pair it with `deploy/ubuntu/README.md`
> (what the scripts do). Guide the owner one step at a time; they work from photos of a console
> and later from PowerShell over SSH, so give short copy-paste commands, one per code block.

## วิธีใช้ skill นี้ (สำหรับ Claude)

- เจ้าของสั่งงานจากรูปถ่ายหน้าจอ ส่งคำสั่ง**ทีละบรรทัด หนึ่ง code block ต่อหนึ่งคำสั่ง**
- ก่อน SSH ได้ เจ้าของต้อง**พิมพ์เอง**บนคีย์บอร์ดเครื่อง ให้เลือกคำสั่งที่สั้นและไม่ต้องนับช่องว่าง
  (พิมพ์ผิดบ่อย: `chomod`, ขาด `/`, ใช้ `(` แทน `{`, `ture`, ขาด `:`)
- พอ SSH ได้แล้ว ให้ก๊อปวางได้ (คลิกขวาใน PowerShell = วาง) ทุกอย่างจะง่ายขึ้นมาก รีบไปให้ถึงจุดนั้น
- อ่าน prompt ในรูปทุกครั้งว่าอยู่เครื่องไหน: `PS C:\...>` = Windows, `ubuntu-server@...` = มินิพีซี

## 1. BIOS (ทำก่อนบูต USB)

เครื่องที่ใช้: ASUS NUC 14 Essential (NUC14MNK) — **F2 = BIOS, F10 = เลือกบูต**

- **ปิด Secure Boot**
- **ปิด Intel VT-d** (ถ้าเปิดอยู่แล้วตัวติดตั้งค้างระหว่างบูต)
- โหมดบูต **UEFI** เท่านั้น (ไม่ใช้ Legacy/CSM)

ก่อนแก้ BIOS ตัวติดตั้งค้าง/พังซ้ำหลายรอบ หลังปิดสองอย่างนี้ติดตั้งผ่านรอบเดียว

## 2. USB และตัวติดตั้ง

- ใช้ **Ubuntu Server 24.04 LTS** (ตอนนั้นเป็น 24.04.3 เลือก HWE kernel ได้) — 26.04 ตัวติดตั้งมีบั๊ก
- เขียน USB ด้วย **Rufus แบบ DD Image** ถ้าบูตแล้วขึ้น "Unable to find a medium containing a live
  file system" ให้เขียน USB ใหม่หรือเปลี่ยนแท่ง
- หน้า Update installer: เลือก **Continue without updating**
- **หน้า Storage: เลือกดิสก์ SSD เอง** (เช่น `HS-SSD-E100N_256G`) อย่าปล่อยค่าเริ่มต้น
  เพราะเคยเลือก USB เป็นเป้าหมาย → error `Device or resource busy: /dev/sdb1` ไม่ต้องติ๊ก LVM
- ติ๊ก **Install OpenSSH server**, ไม่ต้องเลือก snap
- ถ้าตัวติดตั้งพังแล้ว ให้**ปิดเครื่องแล้วบูตใหม่** อย่าใช้ "Restart the installer" (มันจะค้าง error เดิม)
- ดู log ได้ที่ Help → Enter shell: `/var/log/installer/curtin-install.log`,
  `subiquity-server-debug.log`
- ติดตั้งแบบไม่มีเน็ตเคยค้างที่ "configuring apt" ถ้ามีสาย LAN ให้ต่อไว้ตอนติดตั้งจะดีกว่า

## 3. ต่อ Wi-Fi หลังติดตั้ง (ถ้าติดตั้งแบบไม่มีเน็ต)

ตัวติดตั้งไม่ได้สร้างไฟล์ network ให้ `ip -4 addr` จะเห็นแค่ `lo`

ห้ามให้พิมพ์ YAML หลายบรรทัดใน nano (ย่อหน้าเพี้ยนทุกรอบ) ใช้ **YAML แบบบรรทัดเดียว** แทน
(เช็กชื่อการ์ดก่อนด้วย `ip -br link` ปกติคือ `wlo1`)

```
sudo -i
```
```
echo '{network: {version: 2, wifis: {wlo1: {dhcp4: true, nameservers: {addresses: [1.1.1.1, 8.8.8.8]}, access-points: {"ชื่อWiFi": {password: "รหัสWiFi"}}}}}}' > /etc/netplan/01-wifi.yaml
```
```
chmod 600 /etc/netplan/01-wifi.yaml
```
```
netplan apply
```
```
ip -4 addr
```

- ใช้ `>` ตัวเดียว (`>>` = ต่อท้าย ไฟล์จะมีบรรทัดซ้ำ → error ที่บรรทัด 2) ถ้าซ้ำแล้ว:
  `sed -i '2,$d' /etc/netplan/01-wifi.yaml`
- error `did not find expected ',' or '}'` = ปีกกาไม่ครบ นับด้วย
  `grep -o '{' /etc/netplan/01-wifi.yaml | wc -l` เทียบกับ `'}'` แล้วเติมด้วย
  `sed -i 's/$/}/' /etc/netplan/01-wifi.yaml`
- `netplan apply` ผ่านแต่ไม่ได้ IP → ดู `journalctl -u netplan-wpa-wlo1 --no-pager | tail -20`
  ถ้าเจอ `4-Way Handshake failed - pre-shared key may be incorrect` = **รหัส Wi-Fi ผิด**
  ให้แก้ในไฟล์ด้วย `nano` (ตอนนี้บรรทัดเดียว แก้ง่าย)
- **ต้องใส่ `nameservers` 1.1.1.1/8.8.8.8 ไว้เลย** DNS ของเราเตอร์บ้านเคยหา `deb.nodesource.com`
  ไม่เจอ ทำให้ install.sh ล้มตอนลง Node.js

## 4. SSH จาก Windows

บนมินิพีซี:
```
hostname -I
```
```
apt update && apt install -y openssh-server
```
บน Windows (PowerShell, **ไม่ใช่**หน้าต่าง SSH):
```
ssh ชื่อuser@IP
```
- รหัสไม่ผ่าน → ตั้งใหม่ที่เครื่อง (เป็น root อยู่): `passwd ชื่อuser`
- ตอนพิมพ์รหัส แป้นต้องเป็น**ภาษาอังกฤษ**; ปุ่ม `~` สลับภาษาจะใส่ `` ` `` เข้าไปในคำสั่งด้วย
  ให้สลับภาษาด้วย Win+Space หรืออยู่ภาษาอังกฤษตลอดในหน้าต่าง SSH
- ข้อความไทยของสคริปต์เพี้ยนใน PowerShell เก่าได้ ไม่กระทบงาน (มีอังกฤษกำกับ) ใช้ Windows Terminal จะสวยกว่า

## 5. ติดตั้งเว็บ

ดูรายละเอียดใน `deploy/ubuntu/README.md` ลำดับที่ใช้จริง (ปรับ BRANCH ตามที่ merge แล้ว):

```
sudo apt install -y git
```
```
git clone --branch <branch> https://github.com/kitthiphatn/divepotato-web.git
```
```
cd divepotato-web
```
**ส่งรูปก่อนรัน seed** (ถ้าลืม seed จะไม่ใส่รูป และรันซ้ำก็ไม่เติมให้ เพราะข้ามของที่มีแล้ว)
บน Windows:
```
scp -r "C:\path\to\photos" ชื่อuser@IP:/home/ชื่อuser/photos
```
บนมินิพีซี (โฟลเดอร์ home อ่านไม่ได้สำหรับ user ระบบ `divepotato` จึงต้องคัดลอกไป /opt):
```
sudo mkdir -p /opt/divepotato/seed-photos && sudo cp ~/photos/*.webp /opt/divepotato/seed-photos/ && sudo chmod -R a+rX /opt/divepotato/seed-photos
```
```
sudo SEED=1 SEED_PHOTOS_DIR=/opt/divepotato/seed-photos BRANCH=<branch> DOMAIN=demo.cleanandcare.live bash deploy/ubuntu/install.sh
```
- เช็ก: `curl -sI http://127.0.0.1:3006 | head -1` → `307` (พาไป /th) ถือว่าปกติ

### ลืมใส่รูป / อยากล้างข้อมูลตัวอย่างใหม่

seed ข้ามของที่มีอยู่แล้ว ต้องย้ายฐานข้อมูลออกก่อน โฟลเดอร์ `data/` อ่านได้เฉพาะ root/แอป
**`*` ใน shell ธรรมดาจะหาไฟล์ไม่เจอ** ต้องครอบด้วย `sudo sh -c`:
```
sudo systemctl stop divepotato
```
```
sudo mkdir -p /opt/divepotato/old && sudo sh -c 'mv /opt/divepotato/data/divepotato.db* /opt/divepotato/old/'
```
แล้วรัน install.sh แบบด้านบนอีกรอบ (ไม่ build ใหม่ เร็ว) และ `sudo systemctl restart divepotato`
ผลลัพธ์ต้อง**ไม่มี**บรรทัด `Bookings: already there` ถ้ามีแปลว่าฐานข้อมูลเก่ายังอยู่

## 6. Cloudflare Tunnel

```
sudo bash /opt/divepotato/app/deploy/ubuntu/tunnel.sh
```
- ลิงก์ `dash.cloudflare.com/argotunnel?...` ยาวจนตัดบรรทัด ต้องก๊อปให้ครบถึง `%3D`
- เปิดในเบราว์เซอร์ Windows → เลือกโดเมน → Authorize แล้วสคริปต์ทำต่อเอง
- เช็ก: `sudo systemctl status cloudflared --no-pager | head -12` → `active (running)`
- เปิดเว็บแล้วขึ้น `DNS_PROBE_FINISHED_NXDOMAIN` ทันทีหลังสร้าง = เครื่อง/เบราว์เซอร์จำผลเก่า
  (เบราว์เซอร์ที่ตั้ง DNS เองเช่น secure DNS ก็เป็นได้) `ipconfig /flushdns` หรือลองมือถือเน็ต 4G

## 7. ก่อนส่งให้ลูกค้า

- บัญชีทดลอง `admin` / `staff` / `editor` / `guide` รหัส `divepotato-demo` อยู่ใน README สาธารณะ
  เปลี่ยนที่ `/admin` → Users → Change Password ก่อนส่งลิงก์
- seed ใหม่ทุกครั้ง รหัสจะกลับเป็นค่าเริ่มต้น
