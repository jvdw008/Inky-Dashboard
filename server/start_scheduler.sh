#!/bin/bash
# File: /home/sensei/server/start_scheduler.sh

# Navigate to project directory
cd /home/sensei/inky/server || exit 1

# Load environment variables
#export $(grep -v '^#' .env | xargs)

# Start Node scheduler
/usr/bin/node index.js
