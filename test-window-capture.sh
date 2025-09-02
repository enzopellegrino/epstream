#!/bin/bash

echo "=== Test Window Capture Methods on macOS ==="

echo "1. Listing all windows with their IDs:"
osascript -e 'tell application "System Events" to get name of (processes whose background only is false)'

echo -e "\n2. Getting Chrome window info:"
osascript -e '
tell application "System Events"
    repeat with proc in (processes whose name contains "Chrome")
        try
            set windowList to every window of proc
            repeat with win in windowList
                try
                    set winName to name of win
                    log "Chrome window: " & winName
                end try
            end repeat
        end try
    end repeat
end tell
'

echo -e "\n3. Testing screencapture with window ID:"
echo "Available screencapture options for window capture:"
echo "screencapture -l \$(osascript -e 'tell app \"Chrome\" to id of window 1') /tmp/test.png"

echo -e "\n4. Testing with CGWindowListCopyWindowInfo:"
python3 -c "
import Quartz
from Quartz import CGWindowListCopyWindowInfo, kCGNullWindowID, kCGWindowListOptionOnScreenOnly

window_list = CGWindowListCopyWindowInfo(kCGWindowListOptionOnScreenOnly, kCGNullWindowID)
for window in window_list:
    if 'kCGWindowOwnerName' in window and 'Chrome' in window['kCGWindowOwnerName']:
        print(f'Window ID: {window.get(\"kCGWindowNumber\", \"Unknown\")}')
        print(f'Owner: {window.get(\"kCGWindowOwnerName\", \"Unknown\")}')
        print(f'Name: {window.get(\"kCGWindowName\", \"Unknown\")}')
        print(f'Bounds: {window.get(\"kCGWindowBounds\", \"Unknown\")}')
        print('---')
" 2>/dev/null || echo "Python Quartz module not available"

echo -e "\nTest completed!"
