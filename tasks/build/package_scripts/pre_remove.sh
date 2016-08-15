#!/bin/sh
set -e

echo -n "Stopping kibi service..."
if command -v systemctl >/dev/null && systemctl is-active kibi.service >/dev/null; then
    systemctl --no-reload stop kibi.service
elif [ -x /etc/init.d/kibi ]; then
    if command -v invoke-rc.d >/dev/null; then
        invoke-rc.d kibi stop
    elif command -v service >/dev/null; then
        service kibi stop
    else
        /etc/init.d/kibi stop
    fi
fi
echo " OK"
