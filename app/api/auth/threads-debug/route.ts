import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  // Debug environment variables
  const config = {
    has_threads_app_id: !!process.env.THREADS_APP_ID,
    threads_app_id_value: process.env.THREADS_APP_ID || '1074593118154653',
    has_threads_app_secret: !!process.env.THREADS_APP_SECRET,
    has_meta_app_id: !!process.env.META_APP_ID,
    meta_app_id_value: process.env.META_APP_ID,
    has_meta_app_secret: !!process.env.META_APP_SECRET,
    node_env: process.env.NODE_ENV,
    vercel_env: process.env.VERCEL_ENV,
  };
  
  return NextResponse.json({ config });
}