"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { typography } from "@/lib/typography"
import { cn } from "@/lib/utils"
import { createClient } from "@/lib/supabase/browser"
import { Shield, Lock, Download } from "lucide-react"

export default function SignupPage() {
  const router = useRouter()
  const supabase = createClient()
  const [currentSlide, setCurrentSlide] = React.useState(0)
  const [loading, setLoading] = React.useState(false)

  // Contact info for slide 3
  const contactPhone = "858-815-0020"
  const contactName = "Right Hand"

  // Slide 1: Mission statement
  const WelcomeSlide = () => (
    <div className="space-y-12">
      <div className="space-y-6 text-left">
        <p className={cn(typography.body, "text-muted-foreground")}>
          Right Hand&apos;s mission is to get people off of their phones and out in the world more. Spending less time dealing with all of the draws of modern life, booking appointments, managing your calendar, paying bills, and ordering groceries.
        </p>
        <p className={cn(typography.body, "text-muted-foreground")}>
          We&apos;re bringing this interface to an app we all know and love - iMessage. Speak your mind to your right hand, and it gets done.
        </p>
        <p className={cn(typography.body, "text-muted-foreground")}>
          We&apos;re starting with Google Calendar and Gmail.
        </p>
      </div>

      <div className="flex justify-center">
        <Button
          onClick={() => setCurrentSlide(1)}
          size="lg"
          className="px-12 py-6 text-xl"
        >
          Get Started
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
            redirectTo: `${window.location.origin}/signup?calendar=true`,
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
      <div className="space-y-12">
        <div className="space-y-8 text-left">
          <p className={cn(typography.body, "text-muted-foreground")}>
            Right Hand works best with access to your email and calendar. You can adjust these permissions and settings at any time.
          </p>

          {/* Privacy features in V-stack */}
          <div className="space-y-6">
            {/* Enterprise Grade Security */}
            <div className="flex items-start space-x-4">
              <Shield className="w-8 h-8 text-foreground flex-shrink-0 mt-1" />
              <div className="space-y-2">
                <h3 className={cn(typography.h4)}>Enterprise Grade Security</h3>
                <p className={cn(typography.bodySmall, "text-muted-foreground")}>
                  Your data is protected with industry-leading security standards and encryption.
                </p>
              </div>
            </div>

            {/* Full Privacy */}
            <div className="flex items-start space-x-4">
              <Lock className="w-8 h-8 text-foreground flex-shrink-0 mt-1" />
              <div className="space-y-2">
                <h3 className={cn(typography.h4)}>Full Privacy</h3>
                <p className={cn(typography.bodySmall, "text-muted-foreground")}>
                  We don&apos;t see any of your data. Everything stays private and secure.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Google Sign In Button */}
        <div className="flex justify-center">
          <button
            onClick={handleConnectGoogle}
            disabled={loading}
            className="flex items-center gap-3 px-6 py-3 bg-white border-2 border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <g fill="none" fillRule="evenodd">
                <path d="M23.64 12.205c0-.639-.057-1.252-.164-1.841H12v3.481h6.544a5.59 5.59 0 0 1-2.423 3.669v3.013h3.926c2.295-2.112 3.593-5.22 3.593-8.322Z" fill="#4285F4"/>
                <path d="M12 24c3.24 0 5.956-1.075 7.942-2.91l-3.926-3.013c-1.075.72-2.449 1.145-4.016 1.145-3.089 0-5.704-2.086-6.635-4.889H1.276v3.11A11.996 11.996 0 0 0 12 24Z" fill="#34A853"/>
                <path d="M5.365 14.333A7.19 7.19 0 0 1 4.99 12c0-.81.138-1.598.375-2.333V6.557H1.276A11.996 11.996 0 0 0 0 12c0 1.936.462 3.77 1.276 5.443l4.089-3.11Z" fill="#FBBC05"/>
                <path d="M12 4.773c1.743 0 3.307.598 4.538 1.773l3.407-3.407C17.95 1.19 15.234 0 12 0 7.316 0 3.225 2.698 1.276 6.557l4.089 3.11C6.296 6.859 8.911 4.773 12 4.773Z" fill="#EA4335"/>
              </g>
            </svg>
            <span className="text-xl font-medium text-black">
              {loading ? "Connecting..." : "Continue with Google"}
            </span>
          </button>
        </div>

        {/* Skip button */}
        <div className="flex justify-center">
          <button
            onClick={() => setCurrentSlide(2)}
            className={cn(typography.bodySmall, "text-muted-foreground hover:text-foreground transition-colors")}
          >
            Skip for now
          </button>
        </div>
      </div>
    )
  }

  // Slide 3: Contact Card
  const ContactSlide = () => {
    const handleSaveContact = () => {
      // Create vCard
      const vCard = `BEGIN:VCARD
VERSION:3.0
FN:${contactName}
TEL;TYPE=CELL:${contactPhone}
END:VCARD`

      // Create blob and download
      const blob = new Blob([vCard], { type: 'text/vcard' })
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `${contactName}.vcf`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)

      // After saving contact, redirect to main app
      setTimeout(() => {
        router.push('/download')
      }, 1000)
    }

    return (
      <div className="space-y-12">
        {/* Contact Card - taller and skinnier */}
        <div className="bg-white border-2 border-gray-200 rounded-3xl p-6 shadow-lg max-w-xs mx-auto">
          <div className="flex flex-col items-center space-y-8">
            {/* Avatar with black outline */}
            <div className="relative w-32 h-32 rounded-full border-2 border-black flex items-center justify-center overflow-hidden bg-white">
              <Image
                src="/righthandlogo.png"
                alt="Right Hand"
                width={96}
                height={96}
                className="rounded-full"
              />
            </div>

            {/* Name */}
            <div className="text-center">
              <h3 className={cn(typography.h3)}>{contactName}</h3>
            </div>

            {/* Phone Number */}
            <div className="w-full space-y-3">
              <p className={cn(typography.bodySmall, "text-muted-foreground text-center")}>
                Phone Number
              </p>
              <div className="bg-gray-50 rounded-xl p-4 text-center">
                <a
                  href={`tel:${contactPhone}`}
                  className={cn(typography.body, "text-foreground font-normal")}
                >
                  {contactPhone}
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Save Contact Button */}
        <div className="space-y-4">
          <Button
            onClick={handleSaveContact}
            className="w-full py-8 text-xl"
            size="lg"
          >
            <Download className="w-6 h-6 mr-2" />
            Save Contact
          </Button>

          <button
            onClick={() => router.push('/download')}
            className={cn(typography.bodySmall, "text-muted-foreground hover:text-foreground transition-colors w-full text-center block")}
          >
            Skip for now
          </button>
        </div>
      </div>
    )
  }

  // Check for calendar connection return
  React.useEffect(() => {
    const checkCalendarConnection = async () => {
      const urlParams = new URLSearchParams(window.location.search)
      if (urlParams.get('calendar') === 'true') {
        const { data: { session } } = await supabase.auth.getSession()
        if (session?.provider_token) {
          // Save the calendar tokens to profile
          const { data: { user } } = await supabase.auth.getUser()
          if (user) {
            // Check if profile exists
            const { data: existingProfile } = await supabase
              .from('profiles')
              .select('id')
              .eq('id', user.id)
              .single()

            const profileData: {
              id: string
              email: string
              google_calendar_token: string
              google_refresh_token: string | null
              updated_at: string
              avatar_url?: string
              first_name?: string
              last_name?: string
              created_at?: string
            } = {
              id: user.id,
              email: user.email || '',
              google_calendar_token: session.provider_token,
              google_refresh_token: session.provider_refresh_token || null,
              updated_at: new Date().toISOString()
            }

            // Add avatar URL if available from Google
            if (user.user_metadata?.avatar_url) {
              profileData.avatar_url = user.user_metadata.avatar_url
            }

            // Add first and last name from Google user metadata
            if (user.user_metadata?.full_name) {
              const nameParts = user.user_metadata.full_name.split(' ')
              profileData.first_name = nameParts[0]
              if (nameParts.length > 1) {
                profileData.last_name = nameParts.slice(1).join(' ')
              }
            }

            if (!existingProfile) {
              // Create new profile
              profileData.created_at = new Date().toISOString()
              await supabase
                .from('profiles')
                .insert(profileData)
            } else {
              // Update existing profile
              const { id, created_at, ...updatePayload } = profileData
              await supabase
                .from('profiles')
                .update(updatePayload)
                .eq('id', user.id)
            }
          }

          // Move to contact card slide
          setCurrentSlide(2)
        }
      }
    }
    checkCalendarConnection()
  }, [supabase, router])

  const slides = [
    { title: "Welcome to Right Hand", component: <WelcomeSlide key="welcome" /> },
    { title: "Privacy & Security", component: <PrivacyAndSignupSlide key="privacy" /> },
    { title: "Your Right Hand", component: <ContactSlide key="contact" /> }
  ]

  return (
    <div className="flex min-h-screen items-center justify-center p-8 bg-white">
      <div className="w-full max-w-md space-y-16">
        {/* Title above progress bar */}
        <div className="text-center">
          <h1 className={cn(typography.h2)}>{slides[currentSlide].title}</h1>
        </div>

        {/* Progress Indicators - larger */}
        <div className="flex justify-center gap-3">
          {slides.map((_, index) => (
            <div
              key={index}
              className={cn(
                "h-3 rounded-full transition-all",
                index === currentSlide ? "w-12 bg-primary" : "w-3 bg-gray-300"
              )}
            />
          ))}
        </div>

        {/* Current Slide */}
        <div className="min-h-[500px]">
          {slides[currentSlide].component}
        </div>
      </div>
    </div>
  )
}
