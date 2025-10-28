import { getResendClient } from './resend';

/**
 * Add a contact to the Resend marketing audience
 * Users are auto-subscribed and can unsubscribe via email links
 */
export async function addContactToAudience(
  email: string,
  firstName?: string,
  lastName?: string
) {
  try {
    const resend = getResendClient();
    const audienceId = process.env.RESEND_AUDIENCE_ID;

    if (!audienceId) {
      console.warn('⚠️ RESEND_AUDIENCE_ID not configured, skipping audience add');
      return { success: false, error: 'No audience ID configured' };
    }

    console.log('📬 Adding contact to Resend audience:', email);

    const { data, error } = await resend.contacts.create({
      email,
      firstName,
      lastName,
      unsubscribed: false,
      audienceId
    });

    if (error) {
      // Don't log error if contact already exists (409 conflict)
      if ((error as any).statusCode === 409) {
        console.log('ℹ️ Contact already exists in audience:', email);
        return { success: true, alreadyExists: true };
      }

      console.error('❌ Failed to add contact to audience:', error);
      return { success: false, error };
    }

    console.log('✅ Contact added to audience:', data?.id);
    return { success: true, data };
  } catch (error) {
    console.error('❌ Error adding contact to audience:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}
