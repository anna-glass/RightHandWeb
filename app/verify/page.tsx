"use client"

import * as React from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { typography } from "@/lib/typography"
import { cn } from "@/lib/utils"
import { createClient } from "@/lib/supabase/browser"
import { Download, ArrowRight, ArrowLeft } from "lucide-react"
import { Suspense } from "react"

function VerifyContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()
  const [currentSlide, setCurrentSlide] = React.useState(0)
  const [loading, setLoading] = React.useState(false)
  const [verificationToken, setVerificationToken] = React.useState<string | null>(null)

  // Contact info for slide 3
  const contactPhone = "858-815-0020"
  const contactName = "Right Hand"

  // Get verification token from URL
  React.useEffect(() => {
    const token = searchParams.get('token')
    if (token) {
      setVerificationToken(token)
    }
    // Allow viewing without token for preview purposes
  }, [searchParams])

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
            redirectTo: `${window.location.origin}/verify?token=${verificationToken}&calendar=true`,
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

  // Check for calendar connection return
  React.useEffect(() => {
    const checkCalendarConnection = async () => {
      const urlParams = new URLSearchParams(window.location.search)
      const token = urlParams.get('token')

      if (urlParams.get('calendar') === 'true' && token) {
        const { data: { session } } = await supabase.auth.getSession()
        if (session?.provider_token) {
          const { data: { user } } = await supabase.auth.getUser()
          if (user) {
            // Find the profile by verification token
            const { data: profile } = await supabase
              .from('profiles')
              .select('id')
              .eq('verification_token', token)
              .single()

            if (profile) {
              // Update the existing profile
              const updateData: {
                id: string
                email: string
                google_calendar_token: string
                google_refresh_token: string | null
                verified: boolean
                verification_token: null
                updated_at: string
                avatar_url?: string
                first_name?: string
                last_name?: string
              } = {
                id: user.id,
                email: user.email || '',
                google_calendar_token: session.provider_token,
                google_refresh_token: session.provider_refresh_token || null,
                verified: true,
                verification_token: null, // Clear the token
                updated_at: new Date().toISOString()
              }

              // Add avatar URL if available from Google
              if (user.user_metadata?.avatar_url) {
                updateData.avatar_url = user.user_metadata.avatar_url
              }

              // Add first and last name from Google user metadata
              if (user.user_metadata?.full_name) {
                const nameParts = user.user_metadata.full_name.split(' ')
                updateData.first_name = nameParts[0]
                if (nameParts.length > 1) {
                  updateData.last_name = nameParts.slice(1).join(' ')
                }
              }

              const { id, ...updatePayload } = updateData
              await supabase
                .from('profiles')
                .update(updatePayload)
                .eq('verification_token', token)
            }

            // Redirect to home with success flag
            router.push('/home?onboarding=complete')
          }
        }
      }
    }
    checkCalendarConnection()
  }, [supabase, router])

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
