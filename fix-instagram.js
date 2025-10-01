/**
 * Browser console script to fix Instagram account issues
 *
 * Instructions:
 * 1. Open http://localhost:3001/dashboard in your browser
 * 2. Make sure you're logged in
 * 3. Open browser console (F12 or Cmd+Option+I on Mac)
 * 4. Copy and paste this entire script
 * 5. Press Enter to run it
 */

(async function fixInstagramAccount() {
  console.log('🔍 Checking for problematic Instagram accounts...');

  try {
    // Step 1: Check for problematic accounts
    const checkResponse = await fetch('/api/social-accounts/cleanup');

    if (!checkResponse.ok) {
      throw new Error(`Failed to check accounts: ${checkResponse.statusText}`);
    }

    const checkData = await checkResponse.json();
    console.log('📊 Account analysis:', checkData);

    // Step 2: Find problematic Instagram accounts
    const instagramAccounts = checkData.accountsByPlatform?.instagram || [];
    console.log(`Found ${instagramAccounts.length} Instagram account(s)`);

    if (instagramAccounts.length === 0) {
      console.log('✅ No Instagram accounts found. Please connect your Instagram account first.');
      return;
    }

    const activeInstagram = instagramAccounts.filter(acc => acc.is_active);
    console.log(`Active Instagram accounts: ${activeInstagram.length}`);

    if (activeInstagram.length > 1) {
      console.log('⚠️  Multiple active Instagram accounts detected!');

      // Sort by creation date (newest first)
      const sorted = activeInstagram.sort((a, b) =>
        new Date(b.created_at) - new Date(a.created_at)
      );

      console.log('Newest account (will keep active):', sorted[0]);
      console.log('Older accounts (will deactivate):', sorted.slice(1));

      // Deactivate old accounts
      for (let i = 1; i < sorted.length; i++) {
        const oldAccount = sorted[i];
        console.log(`Deactivating old account: ${oldAccount.id} (${oldAccount.username})`);

        const deactivateResponse = await fetch('/api/social-accounts/cleanup', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            accountId: oldAccount.id,
            action: 'deactivate'
          })
        });

        if (!deactivateResponse.ok) {
          console.error(`Failed to deactivate ${oldAccount.id}:`, await deactivateResponse.text());
        } else {
          const result = await deactivateResponse.json();
          console.log(`✅ ${result.message}`);
        }
      }

      console.log('✅ Instagram account cleanup complete!');
      console.log('🔄 Please refresh the analytics page to see updated data.');

    } else if (activeInstagram.length === 1) {
      console.log('✅ Only one active Instagram account found - this is correct!');
      console.log('Account details:', activeInstagram[0]);
      console.log('If analytics still shows 0, the token might be expired. Try disconnecting and reconnecting Instagram from Settings.');
    } else {
      console.log('⚠️  No active Instagram accounts found.');
      console.log('Please connect your Instagram account from the Settings page.');
    }

  } catch (error) {
    console.error('❌ Error:', error);
  }
})();
