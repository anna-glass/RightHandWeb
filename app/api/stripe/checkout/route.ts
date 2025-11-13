import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@/lib/supabase/server'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-12-18.acacia',
})

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()

    // Get the authenticated user
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
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

    if (profileError || !profile) {
      return NextResponse.json(
        { error: 'Profile not found' },
        { status: 404 }
      )
    }

    // Create or retrieve Stripe customer
    let customerId = profile.stripe_customer_id

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: profile.email,
        metadata: {
          supabase_user_id: user.id,
        },
      })
      customerId = customer.id

      // Update profile with customer ID
      await supabase
        .from('profiles')
        .update({ stripe_customer_id: customerId })
        .eq('id', user.id)
    }

    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: process.env.STRIPE_PRICE_ID!,
          quantity: 1,
        },
      ],
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/welcome?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/create-account`,
      metadata: {
        user_id: user.id,
      },
    })

    return NextResponse.json({ url: session.url })
  } catch (error: any) {
    console.error('Error creating checkout session:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to create checkout session' },
      { status: 500 }
    )
  }
}
