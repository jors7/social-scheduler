// Test script for Threads metrics update
// Run this in the browser console while on http://localhost:3001/dashboard/analytics

async function testThreadsMetrics() {
  console.log('Testing Threads metrics update...');
  
  try {
    const response = await fetch('/api/threads/update-metrics', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    const data = await response.json();
    
    if (response.ok) {
      console.log('✅ Success:', data);
      
      if (data.updatedCount > 0) {
        console.log(`Updated ${data.updatedCount} out of ${data.totalPosts} Threads posts`);
        console.log('Refresh the page to see updated metrics in Top Posts');
      } else {
        console.log('No posts were updated. This could mean:');
        console.log('1. No Threads posts found');
        console.log('2. Posts don\'t have valid post IDs');
        console.log('3. Threads API issues or permission limitations');
      }
      
      if (data.errors && data.errors.length > 0) {
        console.log('⚠️ Some errors occurred:', data.errors);
      }
    } else {
      console.error('❌ Error:', data);
      
      if (response.status === 401) {
        console.log('You need to be logged in. Please log in and try again.');
      } else if (response.status === 404) {
        console.log('No Threads account connected. Please connect a Threads account in Settings.');
      }
    }
  } catch (error) {
    console.error('❌ Network error:', error);
  }
}

// Test both Instagram and Threads
async function testAllMetrics() {
  console.log('=== Testing All Social Media Metrics ===\n');
  
  // Test Instagram
  console.log('📷 Instagram Metrics:');
  try {
    const igResponse = await fetch('/api/instagram/update-metrics', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    const igData = await igResponse.json();
    
    if (igResponse.ok) {
      console.log(`✅ Instagram: Updated ${igData.updatedCount} posts`);
    } else {
      console.log(`❌ Instagram: ${igData.error}`);
    }
  } catch (e) {
    console.error('❌ Instagram failed:', e.message);
  }
  
  console.log('\n🧵 Threads Metrics:');
  try {
    const threadsResponse = await fetch('/api/threads/update-metrics', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    const threadsData = await threadsResponse.json();
    
    if (threadsResponse.ok) {
      console.log(`✅ Threads: Updated ${threadsData.updatedCount} posts`);
    } else {
      console.log(`❌ Threads: ${threadsData.error}`);
    }
  } catch (e) {
    console.error('❌ Threads failed:', e.message);
  }
  
  console.log('\n🔄 Refresh the page to see updated metrics');
}

// Run the test
console.log('Choose test to run:');
console.log('1. testThreadsMetrics() - Test Threads only');
console.log('2. testAllMetrics() - Test both Instagram and Threads');
console.log('\nRun by typing the function name in console');

// Auto-run Threads test
testThreadsMetrics();