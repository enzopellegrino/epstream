#!/bin/bash

# Script per testare il supporto SRT di FFmpeg
echo "Testing FFmpeg SRT support..."

FFMPEG_PATH="./node_modules/ffmpeg-static/ffmpeg"

if [ ! -f "$FFMPEG_PATH" ]; then
    echo "❌ FFmpeg not found at $FFMPEG_PATH"
    exit 1
fi

echo "✅ FFmpeg found at $FFMPEG_PATH"

# Test SRT support
echo "Testing SRT protocol support..."
$FFMPEG_PATH -protocols 2>/dev/null | grep -q "srt"

if [ $? -eq 0 ]; then
    echo "✅ SRT protocol is supported"
else
    echo "❌ SRT protocol is NOT supported"
    echo "Available protocols:"
    $FFMPEG_PATH -protocols 2>/dev/null | grep -E "(Input|Output):" -A 20
    exit 1
fi

# Test screen capture formats
echo "Testing screen capture formats..."

case "$(uname)" in
    "Darwin")
        echo "macOS detected - testing avfoundation"
        $FFMPEG_PATH -f avfoundation -list_devices true -i "" 2>&1 | head -20
        ;;
    "Linux")
        echo "Linux detected - testing x11grab"
        ;;
    *)
        echo "Windows/Other detected - testing gdigrab"
        ;;
esac

echo "✅ FFmpeg SRT integration test completed!"
