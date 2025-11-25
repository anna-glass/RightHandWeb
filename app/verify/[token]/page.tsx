/**
 * app/verify/[token]/page.tsx
 *
 * Author: Anna Glass
 * Created: 11/21/2025
 *
 * Right Hand, 2025. All rights reserved.
 */

"use client"

import * as React from "react"
import { useRouter, useParams } from "next/navigation"
import { createClient } from "@/lib/supabase/browser"
import { Suspense } from "react"
import { LandingSlide } from "./components/LandingSlide"
import { WelcomeSlide } from "./components/WelcomeSlide"
import { PaymentSlide } from "./components/PaymentSlide"
import { animations } from "./styles"
import { createProfileFromOAuth } from "./utils"
import { strings } from "@/lib/strings"
import { connectGoogleAccount } from "@/lib/google-auth"
import Image from "next/image"

/**
 * VerifyPage
 * onboarding flow for new users after sms verification.
 * handles google oauth and profile creation.
 */
export default function VerifyPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center bg-black">
        <p className="text-muted-foreground">{strings.verify.loading}</p>
      </div>
    }>
      <Content />
    </Suspense>
  )
}

function Content() {
  const router = useRouter()
  const params = useParams()
  const supabase = createClient()
  const [currentSlide, setCurrentSlide] = React.useState(-1) // -1 for landing, 0-1 for pages
  const [loading, setLoading] = React.useState(false)
  const [verificationToken, setVerificationToken] = React.useState<string | null>(null)

  const goToSlide = React.useCallback((index: number) => {
    setCurrentSlide(index)
  }, [])

  // extract token and clear stale sessions
  React.useEffect(() => {
    const token = params.token as string
    setVerificationToken(token || 'preview')

    if (!token) return

    const clearStaleSession = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (session && !session.provider_refresh_token) {
        await supabase.auth.signOut()
      }
    }
    clearStaleSession()
  }, [params, supabase])

  // handle oauth callback and create profile
  React.useEffect(() => {
    const handleOAuthCallback = async () => {
      const token = params.token as string
      if (!token) return

      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.provider_token || !session?.user || !session?.provider_refresh_token) {
        return
      }

      // small delay for auth.users to populate
      await new Promise(resolve => setTimeout(resolve, 500))

      // check for existing profile
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', session.user.id)
        .maybeSingle()

      if (existingProfile) {
        goToSlide(1)
        return
      }

      // lookup pending verification
      const { data: pending, error: lookupError } = await supabase
        .from('pending_verifications')
        .select('phone_number')
        .eq('verification_token', token)
        .maybeSingle()

      if (lookupError || !pending) {
        alert(strings.verify.errors.invalidLink)
        return
      }

      // create profile
      const result = await createProfileFromOAuth(supabase, session, pending.phone_number)
      if (!result.success) {
        alert(result.error)
        return
      }

      // cleanup and go to payment slide
      await supabase
        .from('pending_verifications')
        .delete()
        .eq('verification_token', token)

      goToSlide(1)
    }

    handleOAuthCallback()
  }, [supabase, router, params, goToSlide])

  const handleConnectGoogle = async () => {
    if (verificationToken === 'preview') {
      alert('Preview mode - Google OAuth disabled')
      return
    }
    setLoading(true)
    const { error } = await connectGoogleAccount(
      supabase,
      `${window.location.origin}/verify/${verificationToken}`
    )
    if (error) {
      alert(error)
      setLoading(false)
    }
  }

  return (
    <>
      <style jsx>{animations}</style>
      <div className="flex min-h-screen items-center justify-center bg-black p-6">
        <div className="relative w-full max-w-sm aspect-[9/16] rounded-3xl overflow-hidden">
          {currentSlide === -1 && (
            <>
              <video
                autoPlay
                loop
                muted
                playsInline
                poster="/background.png"
                className="absolute inset-0 w-full h-full object-cover"
              >
                <source src="/intro.mp4" type="video/mp4" />
              </video>
              <Image
                src="/background.png"
                alt="Background"
                fill
                className="object-cover -z-10"
                priority
              />
              <div className="absolute inset-0 bg-black/30" />
              <div className="absolute inset-0 px-6 py-8">
                <LandingSlide onContinue={() => goToSlide(0)} />
              </div>
            </>
          )}

          {currentSlide === 0 && (
            <>
              <div className="absolute inset-0" style={{ backgroundColor: '#22222140' }} />
              <div className="absolute inset-0 px-6 py-8">
                <WelcomeSlide onContinue={() => goToSlide(1)} onPrevious={() => goToSlide(-1)} />
              </div>
            </>
          )}

          {currentSlide === 1 && (
            <>
              <div className="absolute inset-0" style={{ backgroundColor: '#22222140' }} />
              <div className="absolute inset-0 px-6 py-8">
                <PaymentSlide onSignUp={handleConnectGoogle} loading={loading} onPrevious={() => goToSlide(0)} />
              </div>
            </>
          )}
        </div>
      </div>
    </>
  )
}
