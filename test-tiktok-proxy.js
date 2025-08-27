// Test script to verify TikTok can access videos through proxy

async function testProxy() {
  // Example Supabase video URL - replace with an actual one from your logs
  const supabaseUrl = 'https://vomglwxzhuyfkraertrm.supabase.co/storage/v1/object/public/post-media/YOUR_VIDEO.mp4';
  
  // Convert to proxy URL
  const proxyUrl = `https://socialcal.app/api/media/proxy?url=${encodeURIComponent(supabaseUrl)}`;
  
  console.log('Testing proxy URL:', proxyUrl);
  
  try {
    // Test if URL is accessible
    const response = await fetch(proxyUrl, { method: 'HEAD' });
    
    console.log('Status:', response.status);
    console.log('Content-Type:', response.headers.get('content-type'));
    console.log('Content-Length:', response.headers.get('content-length'));
    
    if (response.ok) {
      console.log('✅ Proxy is working! TikTok should be able to access this video.');
    } else {
      console.log('❌ Proxy returned error:', response.status);
    }
  } catch (error) {
    console.log('❌ Failed to access proxy:', error.message);
  }
}

// To use this:
// 1. Replace the supabaseUrl with an actual video URL from your console logs
// 2. Run: node test-tiktok-proxy.js
// 3. Or test in browser console by copying the proxy URL and opening it

console.log(`
To test your proxy:
1. Look in browser console for a line like:
   "Converted video URL for TikTok: https://socialcal.app/api/media/proxy?url=..."
   
2. Copy that full URL and open it in a new browser tab
   
3. You should be able to download/play the video

4. If it works in browser, TikTok should be able to access it too
`);

// Uncomment and update URL to test:
// testProxy();