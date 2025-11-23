import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { CreateFeatureRequestResponse, CreateFeatureRequestForm } from '@/lib/feature-requests/types';
import { MESSAGES, VALIDATION, FEATURE_CATEGORIES } from '@/lib/feature-requests/constants';

// POST /api/feature-requests/custom
// Submit a custom feature request
export async function POST(request: Request) {
  try {
    const supabase = await createClient();

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: MESSAGES.ERROR_NOT_AUTHENTICATED },
        { status: 401 }
      );
    }

    // Get request body
    const body: CreateFeatureRequestForm = await request.json();
    const { title, description, category } = body;

    // Validate input
    if (!title || title.trim().length < VALIDATION.TITLE_MIN_LENGTH) {
      return NextResponse.json(
        { error: MESSAGES.TITLE_TOO_SHORT },
        { status: 400 }
      );
    }

    if (title.length > VALIDATION.TITLE_MAX_LENGTH) {
      return NextResponse.json(
        { error: MESSAGES.TITLE_TOO_LONG },
        { status: 400 }
      );
    }

    if (description && description.length > VALIDATION.DESCRIPTION_MAX_LENGTH) {
      return NextResponse.json(
        { error: MESSAGES.DESCRIPTION_TOO_LONG },
        { status: 400 }
      );
    }

    if (!category) {
      return NextResponse.json(
        { error: MESSAGES.CATEGORY_REQUIRED },
        { status: 400 }
      );
    }

    // Validate category exists
    const validCategories = FEATURE_CATEGORIES.map(c => c.id);
    if (!validCategories.includes(category)) {
      return NextResponse.json(
        { error: 'Invalid category' },
        { status: 400 }
      );
    }

    // Optional: Rate limiting check (3 custom requests per day)
    const oneDayAgo = new Date();
    oneDayAgo.setDate(oneDayAgo.getDate() - 1);

    const { data: recentRequests, error: checkError } = await supabase
      .from('feature_requests')
      .select('id')
      .eq('requested_by', user.id)
      .eq('is_custom', true)
      .gte('created_at', oneDayAgo.toISOString());

    if (checkError) {
      console.error('Error checking rate limit:', checkError);
      // Continue anyway, don't block on rate limit check failure
    }

    if (recentRequests && recentRequests.length >= VALIDATION.MAX_CUSTOM_REQUESTS_PER_DAY) {
      return NextResponse.json(
        { error: `You can only submit ${VALIDATION.MAX_CUSTOM_REQUESTS_PER_DAY} feature requests per day. Please try again tomorrow.` },
        { status: 429 }
      );
    }

    // Insert feature request
    const { data: newFeature, error: insertError } = await supabase
      .from('feature_requests')
      .insert({
        title: title.trim(),
        description: description?.trim() || null,
        category,
        status: 'submitted',
        priority: 'medium',
        is_custom: true,
        requested_by: user.id,
        vote_count: 0, // Will be incremented to 1 by auto-vote below
      })
      .select()
      .single();

    if (insertError || !newFeature) {
      console.error('Error creating feature request:', insertError);
      return NextResponse.json(
        { error: 'Failed to create feature request' },
        { status: 500 }
      );
    }

    // Automatically vote for your own feature request
    const { error: voteError } = await supabase
      .from('feature_votes')
      .insert({
        user_id: user.id,
        feature_request_id: newFeature.id,
      });

    if (voteError) {
      console.error('Error auto-voting for feature:', voteError);
      // Don't fail the request if auto-vote fails
    }

    const response: CreateFeatureRequestResponse = {
      success: true,
      featureId: newFeature.id,
      message: MESSAGES.REQUEST_SUBMITTED,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error in POST /api/feature-requests/custom:', error);
    return NextResponse.json(
      { error: MESSAGES.ERROR_GENERIC },
      { status: 500 }
    );
  }
}
