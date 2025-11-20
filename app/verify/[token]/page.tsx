"use client"

import * as React from "react"
import { useRouter, useParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { typography } from "@/lib/typography"
import { cn } from "@/lib/utils"
import { createClient } from "@/lib/supabase/browser"
import { ArrowRight, ArrowLeft } from "lucide-react"
import { Suspense } from "react"

function VerifyContent() {
  const router = useRouter()
  const params = useParams()
  const supabase = createClient()
  const [currentSlide, setCurrentSlide] = React.useState(0)
  const [loading, setLoading] = React.useState(false)
  const [verificationToken, setVerificationToken] = React.useState<string | null>(null)

  // Get verification token from URL path parameter
  React.useEffect(() => {
    const token = params.token as string
    if (token) {
      setVerificationToken(token)
    }
    // Allow viewing without token for preview purposes
  }, [params])

  // Helper function to change slide with animation
  const goToSlide = (index: number) => {
    setCurrentSlide(index)
    // Trigger bounce animation
    const overlay = document.getElementById('progress-overlay')
    if (overlay) {
      overlay.classList.remove('animate-bounce-quick')
      void overlay.offsetWidth // Trigger reflow
      overlay.classList.add('animate-bounce-quick')
      setTimeout(() => overlay.classList.remove('animate-bounce-quick'), 500)
    }
  }

  // Slide 1: Mission statement
  const WelcomeSlide = () => (
    <div className="h-full flex flex-col">
      <div className="flex-1 space-y-12 text-left">
        <p className={cn(typography.body, "text-white")}>
        For decades, executives have had assistants handling their life admin.
        </p>
        <p className={cn(typography.body, "text-white")}>
        The rest of us have been winging it... Until now.
        </p>
      </div>

      <div className="flex justify-between">
        <div className="w-24"></div> {/* Spacer for alignment */}
        <Button
          onClick={() => goToSlide(1)}
          variant="ghost"
          size="lg"
          className="gap-2 hover:bg-transparent hover:underline text-white hover:text-white"
        >
          Next
          <ArrowRight className="w-5 h-5" />
        </Button>
      </div>
    </div>
  )

  // Slide 2: Privacy & Google Sign In
  const PrivacyAndSignupSlide = () => {
    const handleConnectGoogle = async () => {
      setLoading(true)
      try {
        const { error } = await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: {
            scopes: 'https://www.googleapis.com/auth/calendar.events https://www.googleapis.com/auth/calendar.events.owned https://www.googleapis.com/auth/gmail.modify',
            redirectTo: `${window.location.origin}/verify/${verificationToken}`,
            queryParams: {
              access_type: 'offline',
              prompt: 'consent',
            },
          },
        })

        if (error) throw error
      } catch (err) {
        console.error('Google sign-in error:', err)
        alert('Failed to connect with Google. Please try again.')
        setLoading(false)
      }
    }

    return (
      <div className="h-full flex flex-col">
        <div className="flex-1">
          <div className="text-left space-y-12">
            <p className={cn(typography.body, "text-white")}>
              Right Hand works best with access to your email and calendar.
              </p>
              <p className={cn(typography.body, "text-white")}>
              You can adjust these permissions and settings at any time.
            </p>
          </div>
        </div>

        {/* Navigation buttons */}
        <div className="flex justify-between items-center">
          <Button
            onClick={() => goToSlide(0)}
            variant="ghost"
            size="lg"
            className="gap-2 hover:bg-transparent hover:underline text-white hover:text-white"
          >
            <ArrowLeft className="w-5 h-5" />
            Previous
          </Button>

          {/* Google Sign In Button - compact */}
          <button
            id="google-button"
            onClick={handleConnectGoogle}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-white rounded-lg hover:scale-102 transition-transform disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <g fill="none" fillRule="evenodd">
                <path d="M23.64 12.205c0-.639-.057-1.252-.164-1.841H12v3.481h6.544a5.59 5.59 0 0 1-2.423 3.669v3.013h3.926c2.295-2.112 3.593-5.22 3.593-8.322Z" fill="#4285F4"/>
                <path d="M12 24c3.24 0 5.956-1.075 7.942-2.91l-3.926-3.013c-1.075.72-2.449 1.145-4.016 1.145-3.089 0-5.704-2.086-6.635-4.889H1.276v3.11A11.996 11.996 0 0 0 12 24Z" fill="#34A853"/>
                <path d="M5.365 14.333A7.19 7.19 0 0 1 4.99 12c0-.81.138-1.598.375-2.333V6.557H1.276A11.996 11.996 0 0 0 0 12c0 1.936.462 3.77 1.276 5.443l4.089-3.11Z" fill="#FBBC05"/>
                <path d="M12 4.773c1.743 0 3.307.598 4.538 1.773l3.407-3.407C17.95 1.19 15.234 0 12 0 7.316 0 3.225 2.698 1.276 6.557l4.089 3.11C6.296 6.859 8.911 4.773 12 4.773Z" fill="#EA4335"/>
              </g>
            </svg>
            <span className="text-sm font-medium text-black">
              Continue with Google
            </span>
          </button>
        </div>
      </div>
    )
  }

  // Check for Google OAuth return and create profile
  React.useEffect(() => {
    const checkGoogleConnection = async () => {
      const token = params.token as string
      if (!token) return

      const { data: { session } } = await supabase.auth.getSession()

      // If user has a session with Google provider token, they just returned from OAuth
      if (session?.provider_token && session?.user) {
        const user = session.user

        // Check if profile already exists for this user
        const { data: existingProfile } = await supabase
          .from('profiles')
          .select('id')
          .eq('id', user.id)
          .maybeSingle()

        if (existingProfile) {
          console.log('Profile already exists, redirecting to home')
          router.push('/home?onboarding=complete')
          return
        }

        // Look up the pending verification by token
        const { data: pendingVerification, error: lookupError } = await supabase
          .from('pending_verifications')
          .select('phone_number')
          .eq('verification_token', token)
          .maybeSingle()

        if (lookupError || !pendingVerification) {
          console.error('Pending verification not found:', lookupError)
          alert('Verification link is invalid or expired. Please try again.')
          return
        }

        try {
          // Create the profile with Google user ID + phone from pending verification
          // Parse name from user metadata
          let firstName: string | undefined = undefined
          let lastName: string | undefined = undefined
          if (user.user_metadata?.full_name) {
            const nameParts = user.user_metadata.full_name.split(' ')
            firstName = nameParts[0]
            if (nameParts.length > 1) {
              lastName = nameParts.slice(1).join(' ')
            }
          }

          const { error: insertError } = await supabase
            .from('profiles')
            .insert({
              id: user.id,
              email: user.email || '',
              phone_number: pendingVerification.phone_number,
              verified: true,
              google_calendar_token: session.provider_token,
              google_refresh_token: session.provider_refresh_token || null,
              avatar_url: user.user_metadata?.avatar_url || null,
              first_name: firstName || null,
              last_name: lastName || null,
            })

          if (insertError) {
            console.error('Failed to create profile:', insertError)
            alert('Failed to complete setup. Please try again.')
            return
          }

          console.log('Profile created successfully')

          // Delete the pending verification
          await supabase
            .from('pending_verifications')
            .delete()
            .eq('verification_token', token)

          // Redirect to home with success flag
          router.push('/home?onboarding=complete')
        } catch (error) {
          console.error('Error during profile creation:', error)
          alert('Failed to complete setup. Please try again.')
        }
      }
    }
    checkGoogleConnection()
  }, [supabase, router, params])

  const slides = [
    { title: "Welcome to Right Hand", component: <WelcomeSlide key="welcome" /> },
    { title: "Get Connected", component: <PrivacyAndSignupSlide key="privacy" /> }
  ]

  return (
    <>
      <style jsx>{`
        @keyframes bounce-scale {
          0% { transform: scale(1); }
          40% { transform: scale(1.08); }
          60% { transform: scale(0.98); }
          80% { transform: scale(1.02); }
          100% { transform: scale(1); }
        }
        .animate-bounce-quick {
          animation: bounce-scale 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
        }
        @keyframes scale-spring {
          0% { transform: scale(1); }
          40% { transform: scale(0.95); }
          60% { transform: scale(1.02); }
          80% { transform: scale(0.98); }
          100% { transform: scale(1); }
        }
        .animate-scale-spring {
          animation: scale-spring 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
        }
      `}</style>
      <div className="flex min-h-screen items-center justify-center p-8 bg-black">
        <div className="w-full max-w-md space-y-16">
          {/* Title - left aligned */}
          <div className="text-left">
            <h1 className={cn(typography.h2, "text-white")}>{slides[currentSlide].title}</h1>
          </div>

        {/* Progress Bar - full width capsule */}
        <div className="relative h-6 rounded-full p-1 cursor-pointer" style={{ backgroundColor: '#404040' }}>
          {/* Background sections (clickable) */}
          <div className="absolute inset-1 flex gap-1">
            {slides.map((_, index) => (
              <div
                key={index}
                onClick={() => goToSlide(index)}
                className="flex-1 hover:rounded-full transition-all"
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#606060'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
              />
            ))}
          </div>

          {/* Active overlay */}
          <div
            id="progress-overlay"
            className="absolute top-1 h-4 bg-white rounded-full transition-all duration-300"
            style={{
              width: `calc((100% - 0.5rem) / ${slides.length})`,
              left: `calc(0.25rem + ${currentSlide} * ((100% - 0.5rem) / ${slides.length} + 0.25rem))`
            }}
          />
        </div>

        {/* Current Slide */}
        <div className="h-[400px] min-h-[400px] max-h-[400px]">
          {slides[currentSlide].component}
        </div>
      </div>
    </div>
    </>
  )
}

export default function VerifyPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center bg-white">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    }>
      <VerifyContent />
    </Suspense>
  )
}
