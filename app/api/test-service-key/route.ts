import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    console.log('Testing service role key...');
    
    // Check environment variables
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    console.log('Supabase URL:', supabaseUrl ? 'Present' : 'Missing');
    console.log('Service Role Key:', serviceRoleKey ? 'Present' : 'Missing');
    
    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json({ 
        error: 'Missing environment variables',
        supabaseUrl: !!supabaseUrl,
        serviceRoleKey: !!serviceRoleKey
      }, { status: 500 });
    }

    // Create Supabase client with service role key
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Try to query the scheduled_posts table
    const { data, error } = await supabase
      .from('scheduled_posts')
      .select('id, status, created_at')
      .limit(5);

    if (error) {
      console.error('Database query error:', error);
      return NextResponse.json({ 
        error: 'Database query failed',
        details: error.message,
        code: error.code
      }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true,
      message: 'Service role key is working',
      postsFound: data?.length || 0,
      sampleData: data
    });

  } catch (error) {
    console.error('Test endpoint error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}