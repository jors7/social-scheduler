import { NextResponse } from 'next/server';

export async function GET() {
  // Direct, simple OAuth URL with minimal parameters
  const appId = '1775045073398080';
  const redirectUri = encodeURIComponent('http://localhost:3001/api/auth/threads/callback');
  
  // Try with just basic scope first
  const authUrl = `https://www.facebook.com/v21.0/dialog/oauth?client_id=${appId}&redirect_uri=${redirectUri}&scope=instagram_basic&response_type=code`;
  
  console.log('Simple OAuth URL:', authUrl);
  
  return NextResponse.redirect(authUrl);
}