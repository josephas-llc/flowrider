#!/bin/bash
# Flowrider iCloud Backup Script
# Backs up LEO AI database and config to iCloud Drive

ICLOUD_BACKUP="/Users/zacharykramer/Library/Mobile Documents/com~apple~CloudDocs/Backups/flowrider"
FLOWRIDER_DATA="$HOME/.flowrider"

# Create backup directory if needed
mkdir -p "$ICLOUD_BACKUP"

# Check if flowrider data exists
if [ ! -d "$FLOWRIDER_DATA" ]; then
    echo "No flowrider data found at $FLOWRIDER_DATA"
    echo "Run Flowrider at least once to create the data directory."
    exit 0
fi

# Backup with timestamp
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

echo "Starting Flowrider backup to iCloud..."
echo "Source: $FLOWRIDER_DATA"
echo "Destination: $ICLOUD_BACKUP"

# Copy databases (with timestamp for versioning)
if [ -f "$FLOWRIDER_DATA/leo-ai.db" ]; then
    cp "$FLOWRIDER_DATA/leo-ai.db" "$ICLOUD_BACKUP/leo-ai.db"
    cp "$FLOWRIDER_DATA/leo-ai.db" "$ICLOUD_BACKUP/leo-ai_$TIMESTAMP.db"
    echo "  Backed up: leo-ai.db"
fi

if [ -f "$FLOWRIDER_DATA/flowrider.db" ]; then
    cp "$FLOWRIDER_DATA/flowrider.db" "$ICLOUD_BACKUP/flowrider.db"
    cp "$FLOWRIDER_DATA/flowrider.db" "$ICLOUD_BACKUP/flowrider_$TIMESTAMP.db"
    echo "  Backed up: flowrider.db"
fi

if [ -f "$FLOWRIDER_DATA/config.json" ]; then
    cp "$FLOWRIDER_DATA/config.json" "$ICLOUD_BACKUP/config.json"
    echo "  Backed up: config.json"
fi

# Clean up old timestamped backups (keep last 7)
echo "Cleaning old backups (keeping last 7)..."
cd "$ICLOUD_BACKUP"
ls -t leo-ai_*.db 2>/dev/null | tail -n +8 | xargs rm -f 2>/dev/null
ls -t flowrider_*.db 2>/dev/null | tail -n +8 | xargs rm -f 2>/dev/null

echo "Backup complete!"
echo "Files in iCloud backup:"
ls -lh "$ICLOUD_BACKUP"
