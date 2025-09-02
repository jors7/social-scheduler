import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  // First, logout from Threads/Meta to clear the session
  const logoutUrl = 'https://www.threads.com/logout';
  
  // Then redirect to our auth endpoint
  const baseUrl = process.env.NODE_ENV === 'production' 
    ? 'https://www.socialcal.app'
    : 'http://localhost:3001';
    
  const authUrl = `${baseUrl}/api/auth/threads-basic`;
  
  // Create a logout and reconnect flow
  return NextResponse.json({
    instructions: 'To properly reconnect, follow these steps:',
    steps: [
      '1. Open this URL to logout from Threads: https://www.threads.com/logout',
      '2. Then connect again via Settings',
    ],
    logoutUrl,
    authUrl,
    note: 'This ensures you can connect with the correct account'
  });
}