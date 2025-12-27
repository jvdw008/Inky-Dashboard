#!/bin/bash
# File: /home/sensei/inky/server/start_scheduler.sh

cd /home/sensei/inky/server

# Load environment variables safely
#if [ -f .env ]; then
#  export $(grep -v '^#' .env | xargs)
#fi

# Start Node using PATH resolution
exec /usr/local/node18/bin/node index.js
