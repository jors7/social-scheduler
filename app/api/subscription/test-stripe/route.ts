import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'

export async function GET(request: NextRequest) {
  console.log('=== Testing Stripe Connection ===')
  
  try {
    // Check if Stripe key exists
    if (!process.env.STRIPE_SECRET_KEY) {
      console.error('STRIPE_SECRET_KEY is not set')
      return NextResponse.json({ 
        error: 'Stripe not configured',
        hasKey: false 
      }, { status: 500 })
    }
    
    console.log('Stripe key exists, length:', process.env.STRIPE_SECRET_KEY.length)
    console.log('Key prefix:', process.env.STRIPE_SECRET_KEY.substring(0, 7))
    
    // Try to initialize Stripe
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2024-11-20.acacia' as any,
    })
    
    console.log('Stripe initialized successfully')
    
    // Try a simple API call
    const balance = await stripe.balance.retrieve()
    console.log('Balance retrieved:', balance.object)
    
    return NextResponse.json({ 
      success: true,
      message: 'Stripe connected successfully',
      balance: {
        available: balance.available[0]?.amount || 0,
        pending: balance.pending[0]?.amount || 0,
        currency: balance.available[0]?.currency || 'usd'
      }
    })
    
  } catch (error: any) {
    console.error('=== STRIPE TEST ERROR ===')
    console.error('Error type:', error?.constructor?.name)
    console.error('Error message:', error?.message)
    console.error('Error code:', error?.code)
    console.error('Error type:', error?.type)
    
    return NextResponse.json({ 
      error: 'Stripe test failed',
      details: error?.message || 'Unknown error',
      code: error?.code,
      type: error?.type
    }, { status: 500 })
  }
}