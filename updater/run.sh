#!/bin/sh

LOG_FILE="/app/db_data/update.log"
TRIGGER_FILE="/app/db_data/update.trigger"
HOST_SOURCE="/app/host_source"

echo "[$(date '+%Y-%m-%d %H:%M:%S')] Updater module started. Waiting for triggers..."

while true; do
  if [ -f "$TRIGGER_FILE" ]; then
    rm -f "$TRIGGER_FILE"
    
    echo "=== O.T.A Update Started at $(date '+%Y-%m-%d %H:%M:%S') ===" > "$LOG_FILE"
    echo "Module 'updater' acquired the trigger." >> "$LOG_FILE"
    
    # Git operations
    echo "--- git pull start ---" >> "$LOG_FILE"
    git config --global --add safe.directory "$HOST_SOURCE"
    if ! cd "$HOST_SOURCE"; then
       echo "ERROR: cd to $HOST_SOURCE failed" >> "$LOG_FILE"
       continue
    fi
    
    if ! git pull >> "$LOG_FILE" 2>&1; then
      echo "ERROR: git pull failed. Check internet connection or repository permissions." >> "$LOG_FILE"
      continue
    fi
    echo "--- git pull done ---" >> "$LOG_FILE"
    
    echo "--- rebuilding containers ---" >> "$LOG_FILE"
    export BUILDX_NO_DEFAULT_ATTESTATIONS=1
    export DOCKER_BUILDKIT=1
    
    # Build
    if ! BUILDX_NO_DEFAULT_ATTESTATIONS=1 docker compose -p portal-ssh build server client >> "$LOG_FILE" 2>&1; then
      echo "ERROR: Docker build failed. Check logs." >> "$LOG_FILE"
      continue
    fi
    
    # Restart
    echo "--- restarting services ---" >> "$LOG_FILE"
    if ! docker compose -p portal-ssh up -d server client >> "$LOG_FILE" 2>&1; then
      echo "ERROR: Docker up failed." >> "$LOG_FILE"
      continue
    fi
    
    echo "--- update done at $(date '+%Y-%m-%d %H:%M:%S') ---" >> "$LOG_FILE"
    echo "Updater finished successfully. Going back to sleep."
  fi
  sleep 3
done
