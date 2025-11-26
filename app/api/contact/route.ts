import { NextRequest, NextResponse } from 'next/server';
import { sendContactFormToAdmin, sendContactFormConfirmation } from '@/lib/email/send';

interface ContactFormData {
  name: string;
  email: string;
  subject: string;
  message: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: ContactFormData = await request.json();

    // Validate required fields
    const { name, email, subject, message } = body;
    if (!name || !email || !subject || !message) {
      return NextResponse.json(
        { error: 'All fields are required' },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email address' },
        { status: 400 }
      );
    }

    // Validate message length (prevent spam)
    if (message.length > 5000) {
      return NextResponse.json(
        { error: 'Message is too long (maximum 5000 characters)' },
        { status: 400 }
      );
    }

    console.log('📧 Processing contact form submission:', {
      name,
      email,
      subject,
      messageLength: message.length
    });

    // Send both emails in parallel
    const [adminResult, confirmationResult] = await Promise.all([
      sendContactFormToAdmin(name, email, subject, message),
      sendContactFormConfirmation(email, name, subject)
    ]);

    // Check if admin email failed (critical)
    if (!adminResult.success) {
      console.error('❌ Failed to send admin notification:', adminResult.error);
      return NextResponse.json(
        { error: 'Failed to send contact form. Please try again or email us directly at jan@socialcal.app' },
        { status: 500 }
      );
    }

    // Log warning if confirmation email failed (non-critical)
    if (!confirmationResult.success) {
      console.warn('⚠️  Failed to send confirmation email:', confirmationResult.error);
      // Don't fail the request if only confirmation fails
    }

    console.log('✅ Contact form processed successfully');

    return NextResponse.json(
      {
        success: true,
        message: 'Message sent successfully'
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('❌ Contact form error:', error);
    return NextResponse.json(
      { error: 'An error occurred while sending your message. Please try again.' },
      { status: 500 }
    );
  }
}
