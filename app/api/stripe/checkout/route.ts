import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@/lib/supabase/server'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
})

export async function POST(req: NextRequest) {
  try {
    console.log('Checkout API called')
    const supabase = await createClient()

    // Get the authenticated user
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    console.log('User:', user?.id)
    console.log('User error:', userError)

    if (userError || !user) {
      console.error('Authentication failed:', userError)
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      )
    }

    // Get the user's profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('email, stripe_customer_id')
      .eq('id', user.id)
      .single()

    console.log('Profile:', profile)
    console.log('Profile error:', profileError)

    if (profileError || !profile) {
      console.error('Profile fetch failed:', profileError)
      return NextResponse.json(
        { error: 'Profile not found' },
        { status: 404 }
      )
    }

    // Create or retrieve Stripe customer
    let customerId = profile.stripe_customer_id

    if (!customerId) {
      console.log('Creating new Stripe customer')
      const customer = await stripe.customers.create({
        email: user.email || profile.email,
        metadata: {
          supabase_user_id: user.id,
        },
      })
      customerId = customer.id
      console.log('Created customer:', customerId)

      // Update profile with customer ID
      await supabase
        .from('profiles')
        .update({ stripe_customer_id: customerId })
        .eq('id', user.id)
    } else {
      console.log('Using existing customer:', customerId)
    }

    // Create Stripe checkout session
    console.log('Creating checkout session...')
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      line_items: [
        {
          price: process.env.STRIPE_PRICE_ID!,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/welcome?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/create-account`,
      metadata: {
        supabase_user_id: user.id,
      },
    })

    console.log('Checkout session created:', session.id)
    console.log('Session URL:', session.url)

    return NextResponse.json({
      sessionId: session.id,
      url: session.url
    })
  } catch (error: any) {
    console.error('Error creating checkout session:', error)
    console.error('Error details:', error.message, error.stack)
    return NextResponse.json(
      {
        error: error.message || 'Failed to create checkout session',
        details: error.toString()
      },
      { status: 500 }
    )
  }
}
