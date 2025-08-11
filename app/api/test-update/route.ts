import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  console.log('TEST UPDATE endpoint called');
  
  try {
    const body = await request.json();
    console.log('Request body:', JSON.stringify(body, null, 2));
    
    // Just echo back success
    return NextResponse.json({ 
      success: true,
      message: 'Test update received',
      data: body
    });
  } catch (error) {
    console.error('Test update error:', error);
    return NextResponse.json(
      { error: 'Test update failed' },
      { status: 500 }
    );
  }
}