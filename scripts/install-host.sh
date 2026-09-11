#!/bin/sh

mkdir -p "$HOME/.mozilla/native-messaging-hosts"

cat > "$HOME/.mozilla/native-messaging-hosts/firefox_logger.json" <<JSON
{
  "name": "firefox_logger",
  "description": "Firefox Logger Native Messaging Host",
  "path": "$PWD/native-host.sh",
  "type": "stdio",
  "allowed_extensions": [
    "firefox_logger@local"
  ]
}
JSON

echo "Firefox Logger native host installed"
