import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { VoteFeatureResponse } from '@/lib/feature-requests/types';
import { MESSAGES } from '@/lib/feature-requests/constants';

// POST /api/feature-requests/vote
// Vote for a feature request (or unvote if already voted)
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
    const { featureId } = await request.json();

    if (!featureId) {
      return NextResponse.json(
        { error: 'Feature ID is required' },
        { status: 400 }
      );
    }

    // Check if user has already voted
    const { data: existingVote, error: checkError } = await supabase
      .from('feature_votes')
      .select('id')
      .eq('user_id', user.id)
      .eq('feature_request_id', featureId)
      .maybeSingle();

    if (checkError && checkError.code !== 'PGRST116') {
      console.error('Error checking existing vote:', checkError);
      return NextResponse.json(
        { error: 'Failed to check vote status' },
        { status: 500 }
      );
    }

    if (existingVote) {
      // User has already voted - remove the vote (unvote)
      const { error: deleteError } = await supabase
        .from('feature_votes')
        .delete()
        .eq('id', existingVote.id);

      if (deleteError) {
        console.error('Error removing vote:', deleteError);
        return NextResponse.json(
          { error: 'Failed to remove vote' },
          { status: 500 }
        );
      }

      // Get updated vote count
      const { data: feature } = await supabase
        .from('feature_requests')
        .select('vote_count')
        .eq('id', featureId)
        .single();

      const response: VoteFeatureResponse = {
        success: true,
        newVoteCount: feature?.vote_count || 0,
        message: MESSAGES.UNVOTE_SUCCESS,
      };

      return NextResponse.json(response);
    } else {
      // User hasn't voted - add the vote
      const { error: insertError } = await supabase
        .from('feature_votes')
        .insert({
          user_id: user.id,
          feature_request_id: featureId,
        });

      if (insertError) {
        console.error('Error inserting vote:', insertError);
        return NextResponse.json(
          { error: 'Failed to record vote' },
          { status: 500 }
        );
      }

      // Get updated vote count
      const { data: feature } = await supabase
        .from('feature_requests')
        .select('vote_count')
        .eq('id', featureId)
        .single();

      const response: VoteFeatureResponse = {
        success: true,
        newVoteCount: feature?.vote_count || 0,
        message: MESSAGES.VOTE_SUCCESS,
      };

      return NextResponse.json(response);
    }
  } catch (error) {
    console.error('Error in POST /api/feature-requests/vote:', error);
    return NextResponse.json(
      { error: MESSAGES.ERROR_GENERIC },
      { status: 500 }
    );
  }
}
