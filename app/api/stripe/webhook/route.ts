import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@/lib/supabase/server'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-10-29.clover',
})

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!

type SubscriptionWithPeriodEnd = Stripe.Subscription & {
  current_period_end?: number | string | null
}

const oneMonthFromNowIso = (): string => {
  const future = new Date()
  future.setMonth(future.getMonth() + 1)
  return future.toISOString()
}

const toIsoOrFallback = (
  value: number | string | Date | null | undefined
): string => {
  if (value instanceof Date) {
    return value.toISOString()
  }

  if (typeof value === 'number') {
    return new Date(value * 1000).toISOString()
  }

  if (typeof value === 'string') {
    const parsed = new Date(value)
    if (!Number.isNaN(parsed.getTime())) {
      return parsed.toISOString()
    }
  }

  return oneMonthFromNowIso()
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.text()
    const signature = req.headers.get('stripe-signature')!

    let event: Stripe.Event

    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
    } catch (err: any) {
      console.error('Webhook signature verification failed:', err.message)
      return NextResponse.json(
        { error: 'Webhook signature verification failed' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Handle the event
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        const userId = session.metadata?.supabase_user_id

        if (!userId) {
          console.error('No supabase_user_id in session metadata')
          break
        }

        if (!session.subscription) {
          console.error('No subscription in checkout session')
          break
        }

        // Retrieve full subscription object to get current_period_end
        const subscriptionResponse = await stripe.subscriptions.retrieve(
          session.subscription as string
        )

        const subscription =
          subscriptionResponse as SubscriptionWithPeriodEnd

        const currentPeriodEnd = toIsoOrFallback(
          subscription.current_period_end
        )

        // Update the user's subscription status with all fields
        await supabase
          .from('profiles')
          .update({
            subscription_status: subscription.status,
            stripe_subscription_id: subscription.id,
            subscription_current_period_end: currentPeriodEnd,
          })
          .eq('id', userId)

        break
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as SubscriptionWithPeriodEnd
        const customerId = subscription.customer as string

        // Find user by customer ID
        const { data: profile } = await supabase
          .from('profiles')
          .select('id')
          .eq('stripe_customer_id', customerId)
          .single()

        if (!profile) {
          console.error('No profile found for customer:', customerId)
          break
        }

        // Update subscription status
        const currentPeriodEnd = toIsoOrFallback(
          subscription.current_period_end
        )

        await supabase
          .from('profiles')
          .update({
            subscription_status: subscription.status,
            stripe_subscription_id: subscription.id,
            subscription_current_period_end: currentPeriodEnd,
          })
          .eq('id', profile.id)

        break
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription
        const customerId = subscription.customer as string

        // Find user by customer ID
        const { data: profile } = await supabase
          .from('profiles')
          .select('id')
          .eq('stripe_customer_id', customerId)
          .single()

        if (!profile) {
          console.error('No profile found for customer:', customerId)
          break
        }

        // Update subscription status to inactive
        await supabase
          .from('profiles')
          .update({
            subscription_status: 'inactive',
            subscription_current_period_end: null,
          })
          .eq('id', profile.id)

        break
      }

      default:
        console.log(`Unhandled event type: ${event.type}`)
    }

    return NextResponse.json({ received: true })
  } catch (error: any) {
    console.error('Webhook error:', error)
    return NextResponse.json(
      { error: error.message || 'Webhook handler failed' },
      { status: 500 }
    )
  }
}
