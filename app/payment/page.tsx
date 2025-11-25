/**
 * app/payment/page.tsx
 *
 * Author: Anna Glass
 * Created: 11/24/2025
 *
 * Right Hand, 2025. All rights reserved.
 */

"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import Image from "next/image"

const STRIPE_PAYMENT_URL = "https://buy.stripe.com/fZuaEWbcj7jZ4uSatX0kE00"

/**
 * PaymentPage
 * stripe payment page after google oauth signup.
 */
export default function PaymentPage() {
  const handlePayment = () => {
    window.location.href = STRIPE_PAYMENT_URL
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-black p-6">
      <div className="relative w-full max-w-sm aspect-[9/16] rounded-3xl overflow-hidden">
        <div className="absolute inset-0" style={{ backgroundColor: '#22222140' }} />
        <div className="absolute inset-0 px-6 py-8 flex flex-col items-center justify-center">
          <div className="flex-1 flex flex-col items-center justify-center space-y-8">
            <div className="relative w-24 h-24">
              <Image
                src="/righthandlogo.png"
                alt="Right Hand"
                fill
                className="object-contain"
                priority
              />
            </div>

            <h1 className="text-white text-center text-2xl font-normal px-4">
              Thanks for signing up! Finalize your membership here.
            </h1>
          </div>

          <div className="w-full pb-8">
            <Button
              onClick={handlePayment}
              size="lg"
              className="w-full bg-white text-black hover:bg-white hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 ease-[cubic-bezier(0.68,-0.55,0.265,1.55)] font-normal rounded-full py-6 text-base flex items-center justify-center gap-1.5 will-change-transform [backface-visibility:hidden]"
            >
              Continue with
              <Image
                src="/stripe.png"
                alt="Stripe"
                width={50}
                height={20}
                className="object-contain"
              />
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
