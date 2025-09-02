#!/bin/bash

echo "🔍 Testing screen capture permissions..."

# Check if app has screen recording permissions
osascript -e 'tell application "System Events" to get every application process' > /dev/null 2>&1

if [ $? -eq 0 ]; then
    echo "✅ Accessibility permissions: OK"
else
    echo "❌ Accessibility permissions: DENIED"
    echo "Go to System Preferences > Security & Privacy > Privacy > Accessibility"
    echo "Add your terminal app and Electron app"
fi

# Test basic desktop capture
echo ""
echo "🎥 Testing desktop capturer..."

node -e "
const { app, desktopCapturer } = require('electron');

app.whenReady().then(async () => {
    try {
        const sources = await desktopCapturer.getSources({
            types: ['window', 'screen'],
            thumbnailSize: { width: 150, height: 150 }
        });
        
        console.log('✅ Desktop capturer works!');
        console.log('Total sources found:', sources.length);
        
        const chromeWindows = sources.filter(s => 
            s.name.toLowerCase().includes('chrome')
        );
        
        console.log('Chrome windows found:', chromeWindows.length);
        chromeWindows.forEach(w => console.log('  -', w.name));
        
        app.quit();
    } catch (error) {
        console.error('❌ Desktop capturer error:', error.message);
        app.quit();
    }
});
"

echo ""
echo "🔍 Screen capture permissions test completed!"
