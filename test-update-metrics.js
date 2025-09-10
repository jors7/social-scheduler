// Test script for Instagram metrics update
// Run this in the browser console while on http://localhost:3001/dashboard/analytics

async function testUpdateMetrics() {
  console.log('Testing Instagram metrics update...');
  
  try {
    const response = await fetch('/api/instagram/update-metrics', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    const data = await response.json();
    
    if (response.ok) {
      console.log('✅ Success:', data);
      
      if (data.updatedCount > 0) {
        console.log(`Updated ${data.updatedCount} out of ${data.totalPosts} Instagram posts`);
        console.log('Refresh the page to see updated metrics in Top Posts');
      } else {
        console.log('No posts were updated. This could mean:');
        console.log('1. No Instagram posts found');
        console.log('2. Posts don\'t have valid post IDs');
        console.log('3. Instagram API issues');
      }
      
      if (data.errors && data.errors.length > 0) {
        console.log('⚠️ Some errors occurred:', data.errors);
      }
    } else {
      console.error('❌ Error:', data);
      
      if (response.status === 401) {
        console.log('You need to be logged in. Please log in and try again.');
      } else if (response.status === 404) {
        console.log('No Instagram account connected. Please connect an Instagram account in Settings.');
      }
    }
  } catch (error) {
    console.error('❌ Network error:', error);
  }
}

// Run the test
testUpdateMetrics();