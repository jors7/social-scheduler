// =====================================================
// AFFILIATE APPLICATION API
// =====================================================
// Handles affiliate application submissions

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import type { SubmitApplicationRequest } from '@/types/affiliate';

// =====================================================
// SUPABASE CLIENT (Service Role)
// =====================================================

function getServiceClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  return createClient(supabaseUrl, supabaseServiceKey);
}

// =====================================================
// POST /api/affiliate/apply
// =====================================================

export async function POST(request: NextRequest) {
  try {
    const body: SubmitApplicationRequest = await request.json();

    // Validate required fields
    if (
      !body.first_name ||
      !body.last_name ||
      !body.email ||
      !body.password ||
      !body.paypal_email ||
      !body.application_reason ||
      !body.audience_size ||
      !body.primary_platform ||
      !body.affiliate_experience
    ) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Validate application reason length (100-500 chars)
    if (body.application_reason.length < 100 || body.application_reason.length > 500) {
      return NextResponse.json(
        { success: false, error: 'Application reason must be between 100-500 characters' },
        { status: 400 }
      );
    }

    // Validate promotional methods
    if (!body.promotional_methods || body.promotional_methods.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Please select at least one promotional method' },
        { status: 400 }
      );
    }

    // Validate social media profiles
    if (!body.social_media_profiles || body.social_media_profiles.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Please add at least one social media profile' },
        { status: 400 }
      );
    }

    const supabase = getServiceClient();

    // Check if user with this email already exists
    const { data: existingUser } = await supabase.auth.admin.listUsers();
    const userExists = existingUser?.users.some((u) => u.email === body.email);

    if (userExists) {
      return NextResponse.json(
        { success: false, error: 'An account with this email already exists' },
        { status: 400 }
      );
    }

    // Create Supabase auth user
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: body.email,
      password: body.password,
      email_confirm: false, // Require email confirmation
      user_metadata: {
        user_type: 'affiliate',
        full_name: `${body.first_name} ${body.last_name}`,
      },
    });

    if (authError || !authData.user) {
      console.error('Error creating auth user:', authError);
      return NextResponse.json(
        { success: false, error: 'Failed to create account. Please try again.' },
        { status: 500 }
      );
    }

    // Create application record
    const { data: application, error: appError } = await supabase
      .from('affiliate_applications')
      .insert({
        user_id: authData.user.id,
        first_name: body.first_name,
        last_name: body.last_name,
        email: body.email,
        company: body.company || null,
        website: body.website || null,
        application_reason: body.application_reason,
        audience_size: body.audience_size,
        primary_platform: body.primary_platform,
        promotional_methods: body.promotional_methods,
        social_media_profiles: body.social_media_profiles,
        affiliate_experience: body.affiliate_experience,
        status: 'pending',
      })
      .select()
      .single();

    if (appError) {
      console.error('Error creating application:', appError);

      // Clean up: delete the auth user if application creation failed
      await supabase.auth.admin.deleteUser(authData.user.id);

      return NextResponse.json(
        { success: false, error: 'Failed to submit application. Please try again.' },
        { status: 500 }
      );
    }

    // TODO: Send notification email to admin
    // TODO: Send confirmation email to applicant

    // Send confirmation email to applicant using existing email queue
    try {
      await supabase.from('pending_emails').insert({
        email_type: 'affiliate_application_submitted',
        to_email: body.email,
        subject: 'Your SocialCal Affiliate Application Has Been Received',
        email_data: {
          first_name: body.first_name,
          application_id: application.id,
        },
      });
    } catch (emailError) {
      console.error('Error queuing confirmation email:', emailError);
      // Don't fail the request if email fails
    }

    // TODO: Send notification to admin
    try {
      // Get admin email from settings or use default
      const adminEmail = process.env.EMAIL_REPLY_TO || 'support@socialcal.app';

      await supabase.from('pending_emails').insert({
        email_type: 'affiliate_application_admin_notification',
        to_email: adminEmail,
        subject: `New Affiliate Application from ${body.first_name} ${body.last_name}`,
        email_data: {
          applicant_name: `${body.first_name} ${body.last_name}`,
          applicant_email: body.email,
          application_id: application.id,
          audience_size: body.audience_size,
          primary_platform: body.primary_platform,
        },
      });
    } catch (emailError) {
      console.error('Error queuing admin notification:', emailError);
      // Don't fail the request if email fails
    }

    return NextResponse.json({
      success: true,
      message: 'Application submitted successfully',
      application_id: application.id,
    });
  } catch (error) {
    console.error('Error in affiliate application:', error);
    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
