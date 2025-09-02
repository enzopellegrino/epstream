const { app, BrowserWindow, desktopCapturer } = require('electron');

async function testDesktopCapturer() {
    try {
        console.log('🎥 Testing desktop capturer...');
        
        const sources = await desktopCapturer.getSources({
            types: ['window'],
            thumbnailSize: { width: 150, height: 150 }
        });
        
        console.log('✅ Desktop capturer works!');
        console.log('Total window sources found:', sources.length);
        
        // List all windows
        console.log('\n📋 All windows:');
        sources.forEach((source, index) => {
            console.log(`  ${index + 1}. ${source.name} (ID: ${source.id})`);
        });
        
        // Filter Chrome windows - expand search criteria
        const chromeWindows = sources.filter(s => {
            const name = s.name.toLowerCase();
            return name.includes('chrome') || 
                   name.includes('google chrome') ||
                   name.includes('google') ||
                   name.includes('chromium') ||
                   s.name === 'Google'; // Exact match for "Google"
        });
        
        console.log(`\n🌐 Chrome windows found: ${chromeWindows.length}`);
        chromeWindows.forEach((window, index) => {
            console.log(`  ${index + 1}. ${window.name} (ID: ${window.id})`);
        });
        
        if (chromeWindows.length === 0) {
            console.log('\n❗ No Chrome windows found. Is Chrome running?');
        } else {
            console.log('\n✅ Chrome windows detected successfully!');
        }
        
    } catch (error) {
        console.error('❌ Desktop capturer error:', error.message);
        console.error('Full error:', error);
    }
    
    app.quit();
}

app.whenReady().then(() => {
    testDesktopCapturer();
});
