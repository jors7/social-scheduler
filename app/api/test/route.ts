import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  return NextResponse.json({ message: 'GET works' });
}

export async function PATCH(request: NextRequest) {
  return NextResponse.json({ message: 'PATCH works' });
}