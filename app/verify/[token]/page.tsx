"use client"

import * as React from "react"
import { useRouter, useParams } from "next/navigation"
import { typography } from "@/lib/typography"
import { cn } from "@/lib/utils"
import { createClient } from "@/lib/supabase/browser"
import { Suspense } from "react"
import { WelcomeSlide } from "./components/WelcomeSlide"
import { ConnectSlide } from "./components/ConnectSlide"
import { ProgressBar } from "./components/ProgressBar"
import { animations } from "./styles"
import { createProfileFromOAuth, animateProgressBar } from "./utils"
import { strings } from "@/lib/strings"
import { connectGoogleAccount } from "@/lib/google-auth"

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
  const [currentSlide, setCurrentSlide] = React.useState(0)
  const [loading, setLoading] = React.useState(false)
  const [verificationToken, setVerificationToken] = React.useState<string | null>(null)

  // extract token and clear stale sessions
  React.useEffect(() => {
    const token = params.token as string
    if (!token) return

    setVerificationToken(token)

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
        router.push('/home?onboarding=complete')
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

      // cleanup and redirect
      await supabase
        .from('pending_verifications')
        .delete()
        .eq('verification_token', token)

      router.push('/home?onboarding=complete')
    }

    handleOAuthCallback()
  }, [supabase, router, params])

  const goToSlide = (index: number) => {
    setCurrentSlide(index)
    animateProgressBar()
  }

  const handleConnectGoogle = async () => {
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
      <div className="flex min-h-screen items-center justify-center p-8 bg-black">
        <div className="w-full max-w-md space-y-16">
          <div className="text-left">
            <h1 className={cn(typography.h2, "text-white")}>{strings.verify.slides[currentSlide].title}</h1>
          </div>

          <ProgressBar
            currentSlide={currentSlide}
            totalSlides={strings.verify.slides.length}
            onSlideClick={goToSlide}
          />

          <div className="h-[400px] min-h-[400px] max-h-[400px]">
            {currentSlide === 0 ? (
              <WelcomeSlide onNext={() => goToSlide(1)} />
            ) : (
              <ConnectSlide
                onPrevious={() => goToSlide(0)}
                onConnect={handleConnectGoogle}
                loading={loading}
              />
            )}
          </div>
        </div>
      </div>
    </>
  )
}
