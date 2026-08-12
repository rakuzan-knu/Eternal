#!/bin/bash

# Backup Metrics Exporter
# Exposes backup metrics for Prometheus

BACKUP_DIR="/backups"
METRICS_FILE="/tmp/backup_metrics.txt"
PORT="${BACKUP_METRICS_PORT:-9114}"

log() {
  echo "[$(date +'%Y-%m-%d %H:%M:%S')] $1"
}

generate_metrics() {
  {
    echo "# HELP backup_latest_size_bytes Size of the latest backup in bytes"
    echo "# TYPE backup_latest_size_bytes gauge"
    
    LATEST_BACKUP=$(find "${BACKUP_DIR}" -maxdepth 1 -name "backup_*.sql.gz" -type f -printf '%T@ %s\n' 2>/dev/null | sort -rn | head -1)
    
    if [ -n "$LATEST_BACKUP" ]; then
      SIZE=$(echo "$LATEST_BACKUP" | awk '{print $2}')
      echo "backup_latest_size_bytes $SIZE"
    else
      echo "backup_latest_size_bytes 0"
    fi
    
    echo ""
    echo "# HELP backup_latest_time_seconds Timestamp of the latest backup"
    echo "# TYPE backup_latest_time_seconds gauge"
    
    LATEST_TIME=$(find "${BACKUP_DIR}" -maxdepth 1 -name "backup_*.sql.gz" -type f -printf '%T@\n' 2>/dev/null | sort -rn | head -1)
    
    if [ -n "$LATEST_TIME" ]; then
      echo "backup_latest_time_seconds $(echo "$LATEST_TIME" | cut -d. -f1)"
    else
      echo "backup_latest_time_seconds 0"
    fi
    
    echo ""
    echo "# HELP backups_total_count Total number of backups stored"
    echo "# TYPE backups_total_count gauge"
    COUNT=$(find "${BACKUP_DIR}" -maxdepth 1 -name "backup_*.sql.gz" -type f | wc -l)
    echo "backups_total_count $COUNT"
    
    echo ""
    echo "# HELP backup_disk_usage_bytes Total disk usage of backups"
    echo "# TYPE backup_disk_usage_bytes gauge"
    USAGE=$(find "${BACKUP_DIR}" -maxdepth 1 -name "backup_*.sql.gz" -type f -exec du -b {} + | awk '{sum+=$1} END {print sum}')
    echo "backup_disk_usage_bytes ${USAGE:-0}"
  } > "${METRICS_FILE}"
}

handle_metrics_request() {
  cat "${METRICS_FILE}"
}

log "Starting Backup Metrics Exporter on port $PORT..."
log "Backup directory: $BACKUP_DIR"

# Generate metrics immediately
generate_metrics

# Start simple HTTP server
while true; do
  {
    read -r REQUEST
    PATH_REQUESTED=$(echo "$REQUEST" | awk '{print $2}')
    
    if [ "$PATH_REQUESTED" = "/metrics" ] || [ "$PATH_REQUESTED" = "/" ]; then
      echo -ne "HTTP/1.1 200 OK\r\nContent-Type: text/plain\r\n\r\n"
      handle_metrics_request
    else
      echo -ne "HTTP/1.1 404 Not Found\r\n\r\n"
    fi
  } | nc -l 0.0.0.0 "$PORT" 2>/dev/null
  
  # Regenerate metrics every 30 seconds
  sleep 30 &
  SLEEP_PID=$!
  wait $SLEEP_PID 2>/dev/null || generate_metrics
done
