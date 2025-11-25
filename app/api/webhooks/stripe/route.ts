/**
 * app/api/webhooks/stripe/route.ts
 *
 * Author: Anna Glass
 * Created: 11/25/2025
 *
 * Right Hand, 2025. All rights reserved.
 */

import { NextResponse } from "next/server"
import Stripe from "stripe"
import { supabaseAdmin } from "@/lib/supabase/admin"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-10-29.clover",
})

/**
 * POST /api/webhooks/stripe
 * handles stripe webhook events to capture customer_id after payment.
 */
export async function POST(request: Request) {
  try {
    const body = await request.text()
    const signature = request.headers.get("stripe-signature")

    if (!signature) {
      return NextResponse.json({ error: "No signature" }, { status: 400 })
    }

    // verify webhook signature
    let event: Stripe.Event
    try {
      event = stripe.webhooks.constructEvent(
        body,
        signature,
        process.env.STRIPE_WEBHOOK_SECRET!
      )
    } catch (err) {
      console.error("Webhook signature verification failed:", err)
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 })
    }

    // handle checkout.session.completed event
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session

      const customerId = session.customer as string
      const customerEmail = session.customer_email || session.customer_details?.email

      if (!customerId || !customerEmail) {
        console.error("Missing customer_id or email in checkout session")
        return NextResponse.json({ error: "Missing data" }, { status: 400 })
      }

      // update profiles table with stripe_customer_id
      const { error } = await supabaseAdmin
        .from("profiles")
        .update({ stripe_customer_id: customerId })
        .eq("email", customerEmail)

      if (error) {
        console.error("Error updating stripe_customer_id:", error)
        return NextResponse.json({ error: "Database update failed" }, { status: 500 })
      }

      console.log(`Updated stripe_customer_id for ${customerEmail}`)
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error("Webhook error:", error)
    return NextResponse.json({ error: "Webhook handler failed" }, { status: 500 })
  }
}
