// Quick script to check TikTok upload status
const publishId = 'v_inbox_url~v2.7553622158757922839';

async function checkStatus() {
  try {
    const response = await fetch('https://www.socialcal.app/api/tiktok/check-status', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        publishId: publishId
      })
    });

    const data = await response.json();
    console.log('TikTok Upload Status:', JSON.stringify(data, null, 2));
    
    if (data.status === 'FAILED') {
      console.log('\n❌ Upload failed!');
      console.log('Error:', data.errorMessage || 'Unknown error');
    } else if (data.status === 'PROCESSING_DOWNLOAD') {
      console.log('\n⏳ Still downloading video from your server...');
    } else if (data.status === 'PROCESSING_UPLOAD') {
      console.log('\n📤 Processing video upload...');
    } else if (data.status === 'PUBLISH_COMPLETE') {
      console.log('\n✅ Video published to drafts!');
    }
  } catch (error) {
    console.error('Failed to check status:', error);
  }
}

checkStatus();