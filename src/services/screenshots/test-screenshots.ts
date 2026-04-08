/**
 * Test script for the screenshot service
 * 
 * Usage:
 *   tsx src/services/screenshots/test-screenshots.ts
 */

import { captureScreenshots } from './screenshotService.js';
import fs from 'fs';
import path from 'path';

async function testScreenshots() {
  console.log('🧪 Testing screenshot service with anti-bot protection...\n');
  
  const testUrl = 'https://example.com';
  
  try {
    console.log(`📸 Capturing screenshots for: ${testUrl}`);
    console.log(`⏱️  Started at: ${new Date().toISOString()}`);
    console.log(`🛡️  Anti-bot features: ENABLED\n`);
    
    const startTime = Date.now();
    const result = await captureScreenshots({ url: testUrl });
    const duration = Date.now() - startTime;
    
    console.log(`✅ Screenshots captured successfully!`);
    console.log(`⏱️  Duration: ${duration}ms (${(duration / 1000).toFixed(1)}s)\n`);
    
    // Display base64 stats
    console.log('📊 Screenshot Statistics:');
    console.log(`   Desktop (1920x1080): ${(result.desktop.length / 1024).toFixed(2)} KB (base64)`);
    console.log(`   Mobile (375x667):    ${(result.mobile.length / 1024).toFixed(2)} KB (base64)`);
    console.log(`   Total:               ${((result.desktop.length + result.mobile.length) / 1024).toFixed(2)} KB\n`);
    
    // Calculate actual image sizes (base64 is ~33% larger than binary)
    const desktopActualKB = (result.desktop.length * 0.75) / 1024;
    const mobileActualKB = (result.mobile.length * 0.75) / 1024;
    console.log('📐 Actual Image Sizes (JPEG):');
    console.log(`   Desktop: ~${desktopActualKB.toFixed(2)} KB`);
    console.log(`   Mobile:  ~${mobileActualKB.toFixed(2)} KB\n`);
    
    // Optionally save to files for inspection
    const outputDir = path.join(process.cwd(), 'test-output');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    // Decode and save as actual image files
    const desktopBuffer = Buffer.from(result.desktop, 'base64');
    const mobileBuffer = Buffer.from(result.mobile, 'base64');
    
    fs.writeFileSync(path.join(outputDir, 'desktop.jpg'), desktopBuffer);
    fs.writeFileSync(path.join(outputDir, 'mobile.jpg'), mobileBuffer);
    
    console.log(`💾 Saved screenshots to: ${outputDir}/`);
    console.log(`   - desktop.jpg (1920x1080, ${(desktopBuffer.length / 1024).toFixed(2)} KB)`);
    console.log(`   - mobile.jpg (375x667, ${(mobileBuffer.length / 1024).toFixed(2)} KB)\n`);
    
    console.log('✨ Test completed successfully!');
    console.log('💡 Tip: Open the images to verify they captured correctly');
    
  } catch (error: any) {
    console.error('❌ Test failed:', error.message);
    console.error(error);
    process.exit(1);
  }
}

// Run test
testScreenshots().then(() => {
  process.exit(0);
});
