// =====================================================
// ADMIN AFFILIATE APPROVAL API
// =====================================================
// Allows admins to approve or reject affiliate applications

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import {
  approveApplication,
  rejectApplication,
} from '@/lib/affiliate/service';

function getServiceClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  return createClient(supabaseUrl, supabaseServiceKey);
}

export async function POST(request: NextRequest) {
  try {
    // Verify admin authentication
    const cookieStore = cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value;
          },
        },
      }
    );

    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // TODO: Add admin role check here
    // For now, any authenticated user can approve
    // In production, check user.user_metadata.role === 'admin'

    const { application_id, action, rejection_reason } = await request.json();

    if (!application_id || !action) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    if (!['approve', 'reject'].includes(action)) {
      return NextResponse.json(
        { success: false, error: 'Invalid action. Must be "approve" or "reject"' },
        { status: 400 }
      );
    }

    const supabaseAdmin = getServiceClient();

    // Get the application
    const { data: application, error: appError } = await supabaseAdmin
      .from('affiliate_applications')
      .select('*')
      .eq('id', application_id)
      .single();

    if (appError || !application) {
      return NextResponse.json(
        { success: false, error: 'Application not found' },
        { status: 404 }
      );
    }

    if (application.status !== 'pending') {
      return NextResponse.json(
        { success: false, error: 'Application has already been reviewed' },
        { status: 400 }
      );
    }

    if (action === 'approve') {
      // Approve the application and create affiliate profile
      const result = await approveApplication(application_id, user.id);

      // Queue welcome email
      try {
        await supabaseAdmin.from('pending_emails').insert({
          email_type: 'affiliate_application_approved',
          to_email: application.email,
          subject: 'Welcome to the SocialCal Affiliate Program!',
          email_data: {
            first_name: application.first_name,
            referral_code: result.affiliate.referral_code,
            commission_rate: result.affiliate.commission_rate,
            login_url: `${process.env.NEXT_PUBLIC_APP_URL || 'https://www.socialcal.app'}/affiliate/login`,
            dashboard_url: `${process.env.NEXT_PUBLIC_APP_URL || 'https://www.socialcal.app'}/affiliate/dashboard`,
          },
        });
      } catch (emailError) {
        console.error('Error queuing approval email:', emailError);
        // Don't fail the request if email fails
      }

      return NextResponse.json({
        success: true,
        message: 'Application approved successfully',
        affiliate: result.affiliate,
      });

    } else {
      // Reject the application
      await rejectApplication(
        application_id,
        user.id,
        rejection_reason || 'Application did not meet our requirements'
      );

      // Queue rejection email
      try {
        await supabaseAdmin.from('pending_emails').insert({
          email_type: 'affiliate_application_rejected',
          to_email: application.email,
          subject: 'Update on Your SocialCal Affiliate Application',
          email_data: {
            first_name: application.first_name,
            rejection_reason: rejection_reason || 'Application did not meet our requirements',
          },
        });
      } catch (emailError) {
        console.error('Error queuing rejection email:', emailError);
        // Don't fail the request if email fails
      }

      return NextResponse.json({
        success: true,
        message: 'Application rejected',
      });
    }

  } catch (error) {
    console.error('Error processing application:', error);
    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
