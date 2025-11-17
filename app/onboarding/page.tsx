"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { Input } from "@/components/ui/input"
import { typography } from "@/lib/typography"
import { cn } from "@/lib/utils"
import { createClient } from "@/lib/supabase/browser"
import { ArrowLeft, ArrowRight } from "lucide-react"

export default function OnboardingPage() {
  const router = useRouter()
  const supabase = createClient()
  const [currentStep, setCurrentStep] = React.useState(0)
  const [loading, setLoading] = React.useState(false)
  const [checkingOnboarding, setCheckingOnboarding] = React.useState(true)
  const [redirecting, setRedirecting] = React.useState(false)

  // Signup state
  const [signupCode, setSignupCode] = React.useState("")
  const [signUpEmail, setSignUpEmail] = React.useState("")
  const [signUpPassword, setSignUpPassword] = React.useState("")
  const [confirmPassword, setConfirmPassword] = React.useState("")
  const [isVerified, setIsVerified] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  // Form state
  const [firstName, setFirstName] = React.useState("")
  const [lastName, setLastName] = React.useState("")
  const [phoneNumber, setPhoneNumber] = React.useState("")
  const [homeAddress, setHomeAddress] = React.useState("")
  const [typicalTodos, setTypicalTodos] = React.useState("")
  const [calendarConnected, setCalendarConnected] = React.useState(false)

  const handleCodeVerification = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const response = await fetch('/api/verify-signup-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: signupCode })
      })

      const { valid } = await response.json()

      if (valid) {
        setCurrentStep(1) // Move to email/password step
      } else {
        setError("Invalid signup code. Please try again.")
      }
    } finally {
      setLoading(false)
    }
  }

  const handleSignUp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    setLoading(true)
    setError(null)

    if (signUpPassword !== confirmPassword) {
      setError("Passwords do not match")
      setLoading(false)
      return
    }

    if (signUpPassword.length < 8) {
      setError("Password must be at least 8 characters long")
      setLoading(false)
      return
    }

    try {
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: signUpEmail,
        password: signUpPassword,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback?signup=true`,
        }
      })

      if (signUpError) {
        if (signUpError.message?.includes('already registered') || signUpError.message?.includes('already exists')) {
          setError('This email is already registered. Please use a different email.')
          setLoading(false)
          return
        }
        throw signUpError
      }

      if (!signUpData.user) {
        throw new Error('Failed to create account')
      }

      // Check if user already exists (Supabase returns empty identities array for existing users)
      if (signUpData.user.identities && signUpData.user.identities.length === 0) {
        setError('This email is already registered. Please use a different email.')
        setLoading(false)
        return
      }

      setCurrentStep(2) // Move to email confirmation step
      setLoading(false)
    } catch (err) {
      console.error('Create account - Error:', err)
      if (err instanceof Error) {
        if (err.message.includes('already registered') || err.message.includes('already exists')) {
          setError('This email is already registered. Please use a different email.')
        } else if (err.message.includes('invalid email')) {
          setError('Please enter a valid email address.')
        } else {
          setError(err.message)
        }
      } else {
        setError("Failed to complete account setup")
      }
      setLoading(false)
    }
  }

  const formatPhoneNumber = (value: string) => {
    // Remove all non-digits
    const phoneNumber = value.replace(/\D/g, '')

    // Format as (XXX) XXX-XXXX
    if (phoneNumber.length === 0) return ''
    if (phoneNumber.length <= 3) return `(${phoneNumber}`
    if (phoneNumber.length <= 6) return `(${phoneNumber.slice(0, 3)}) ${phoneNumber.slice(3)}`
    return `(${phoneNumber.slice(0, 3)}) ${phoneNumber.slice(3, 6)}-${phoneNumber.slice(6, 10)}`
  }

  const handlePhoneNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhoneNumber(e.target.value)
    setPhoneNumber(formatted)
  }

  const handleConnectCalendar = async () => {
    setLoading(true)
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          scopes: 'https://www.googleapis.com/auth/calendar.readonly',
          redirectTo: `${window.location.origin}/onboarding?calendar=true`,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      })

      if (error) throw error
    } catch (err) {
      console.error('Calendar connection error:', err)
      alert('Failed to connect Google Calendar. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  // Listen for auth state changes (email verification)
  React.useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('Auth state change:', event, session?.user?.email)

      if (event === 'SIGNED_IN' && session?.user && currentStep === 2) {
        setIsVerified(true)
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [supabase.auth, currentStep])

  // Check for calendar connection return
  React.useEffect(() => {
    const checkCalendarConnection = async () => {
      const urlParams = new URLSearchParams(window.location.search)
      if (urlParams.get('calendar') === 'true') {
        const { data: { session } } = await supabase.auth.getSession()
        if (session?.provider_token) {
          // Save the calendar tokens to profile before signing out
          const { data: { user } } = await supabase.auth.getUser()
          if (user) {
            await supabase
              .from('profiles')
              .update({
                google_calendar_token: session.provider_token,
                google_refresh_token: session.provider_refresh_token,
                updated_at: new Date().toISOString()
              })
              .eq('id', user.id)
          }

          setCalendarConnected(true)
          setRedirecting(true)
          // Remove the query param from URL
          window.history.replaceState({}, '', '/onboarding')

          // Sign out the user after saving calendar tokens
          await supabase.auth.signOut()

          // Redirect to download page
          router.push('/download')
        }
      }
    }
    checkCalendarConnection()
  }, [supabase, router])

  // Check if user is already authenticated and onboarding completed
  React.useEffect(() => {
    const checkStatus = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()

        if (user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('onboarding_completed, first_name, last_name, phone_number')
            .eq('id', user.id)
            .maybeSingle()

          // Prefill existing profile data if available
          if (profile?.first_name) setFirstName(profile.first_name)
          if (profile?.last_name) setLastName(profile.last_name)
          if (profile?.phone_number) setPhoneNumber(profile.phone_number)

          if (profile?.onboarding_completed) {
            router.push('/download')
            return
          }

          // If authenticated but not completed, skip to step 3
          setCurrentStep(3)
        }

        setCheckingOnboarding(false)
      } catch (err) {
        console.error('Error checking status:', err)
        setCheckingOnboarding(false)
      }
    }
    checkStatus()
  }, [router, supabase])

  const steps = [
    {
      title: "Welcome to Right Hand!",
      content: (
        <div className="space-y-6">
          <p className={cn(typography.body, "text-muted-foreground")}>
            Enter your sign up code below.
          </p>
          <Input
            id="signupCode"
            type="text"
            placeholder="Enter your code"
            value={signupCode}
            onChange={(e) => setSignupCode(e.target.value)}
            required
            disabled={loading}
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck={false}
          />
          {error && (
            <div className="text-destructive text-base p-4 bg-destructive/10 rounded-md">
              {error}
            </div>
          )}
        </div>
      )
    },
    {
      title: "Thanks! Sign up here.",
      content: (
        <div className="space-y-8">
          <Input
            type="email"
            placeholder="Email"
            value={signUpEmail}
            onChange={(e) => setSignUpEmail(e.target.value)}
            required
            disabled={loading}
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck={false}
          />
          <Input
            type="password"
            placeholder="Password"
            value={signUpPassword}
            onChange={(e) => setSignUpPassword(e.target.value)}
            required
            disabled={loading}
            minLength={8}
          />
          <Input
            type="password"
            placeholder="Confirm Password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            disabled={loading}
            minLength={8}
          />
          {error && (
            <div className="text-destructive text-base p-4 bg-destructive/10 rounded-md">
              {error}
            </div>
          )}
        </div>
      )
    },
    {
      title: isVerified ? "Thank you for verifying!" : "Check your email for a verification link.",
      content: (
        <div className="space-y-8">
          {!isVerified ? (
            <p className={cn(typography.body, "text-muted-foreground")}>
              Didn&apos;t receive an email? Check your spam folder or contact anna@righthand.agency.
            </p>
          ) : (
            <p className={cn(typography.body, "text-muted-foreground")}>
              Hit the arrow to continue with onboarding.
            </p>
          )}
        </div>
      )
    },
    {
      title: "Hey!",
      content: (
        <div>
          <p className={cn(typography.body, "text-muted-foreground")}>
            I&apos;m Anna, the first (and only) personal assistant behind Right Hand - so whenever you send a message,
            I&apos;ll be on the other side making sure it gets done.
          </p>
        </div>
      )
    },
    {
      title: "First things first, what's your name?",
      content: (
        <div className="space-y-8">
          <Input
            type="text"
            placeholder="First Name"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            required
          />
          <Input
            type="text"
            placeholder="Last Name"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            required
          />
        </div>
      )
    },
    {
      title: "Next, what's a good phone number and home address?",
      content: (
        <div className="space-y-8">
          <Input
            type="tel"
            placeholder="Phone Number"
            value={phoneNumber}
            onChange={handlePhoneNumberChange}
            required
            maxLength={14}
          />
          <Input
            type="text"
            placeholder="Home Address"
            value={homeAddress}
            onChange={(e) => setHomeAddress(e.target.value)}
            required
          />
        </div>
      )
    },
    {
      title: "What to-dos do you tend to put off?",
      content: (
        <div>
          <Input
            type="text"
            placeholder="Your to-do's..."
            value={typicalTodos}
            onChange={(e) => setTypicalTodos(e.target.value)}
          />
        </div>
      )
    },
    {
      title: "Finally, if you have a Google Calendar, connect it here.",
      content: (
        <div className="space-y-4">
          <p className={cn(typography.body, "text-muted-foreground")}>
            Make sure to use the same email you signed up with.
          </p>
          <button
            onClick={handleConnectCalendar}
            disabled={loading}
            className="flex items-center gap-3 px-6 py-2 bg-white border-2 border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg width="35" height="35" viewBox="12 12 22 22" xmlns="http://www.w3.org/2000/svg">
              <g fill="none" fillRule="evenodd">
                <path d="M31.64 23.205c0-.639-.057-1.252-.164-1.841H23v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615Z" fill="#4285F4"/>
                <path d="M23 32c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711h-3.007v2.332A8.997 8.997 0 0 0 23 32Z" fill="#34A853"/>
                <path d="M17.964 24.71a5.41 5.41 0 0 1-.282-1.71c0-.593.102-1.17.282-1.71v-2.332h-3.007A8.996 8.996 0 0 0 14 23c0 1.452.348 2.827.957 4.042l3.007-2.332Z" fill="#FBBC05"/>
                <path d="M23 17.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C27.463 14.891 25.426 14 23 14a8.997 8.997 0 0 0-8.043 4.958l3.007 2.332c.708-2.127 2.692-3.71 5.036-3.71Z" fill="#EA4335"/>
              </g>
            </svg>
            <span className="text-2xl font-normal text-black">
              {loading ? "Connecting..." : "Connect"}
            </span>
          </button>
        </div>
      )
    }
  ]

  const handleNext = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()

    if (currentStep === 0) {
      // Code verification step
      await handleCodeVerification(e!)
    } else if (currentStep === 1) {
      // Email/password signup step
      await handleSignUp(e!)
    } else if (currentStep === 2 && !isVerified) {
      // Email confirmation step - can't proceed until verified
      return
    } else if (currentStep === steps.length - 1) {
      // Final step - save and redirect
      await handleComplete()
    } else {
      setCurrentStep(currentStep + 1)
    }
  }

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
    }
  }

  const handleComplete = async () => {
    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        throw new Error('Not authenticated')
      }

      // Save onboarding responses to database
      const onboardingPayload = {
        id: user.id,
        typical_week: typicalTodos,
        calendar_connected: calendarConnected,
        home_address: homeAddress,
        work_address: "",
        frequent_businesses: ""
      }

      const { error: onboardingError } = await supabase
        .from('onboarding_responses')
        .insert(onboardingPayload)

      if (onboardingError) throw onboardingError

      // Update profile with user info and mark onboarding as completed
      // Note: Calendar tokens are saved immediately after OAuth redirect, not here
      const profileUpdate = {
        first_name: firstName,
        last_name: lastName,
        phone_number: phoneNumber,
        onboarding_completed: true,
        updated_at: new Date().toISOString()
      }

      const { error: profileError } = await supabase
        .from('profiles')
        .update(profileUpdate)
        .eq('id', user.id)

      if (profileError) throw profileError

      // Sign out the user
      await supabase.auth.signOut()

      // Set redirecting state and redirect to download page
      setRedirecting(true)
      router.push('/download')
    } catch (err) {
      console.error('Failed to save onboarding:', err)
      alert('Failed to save onboarding responses. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const canProceed = () => {
    switch (currentStep) {
      case 0:
        // Code verification - require code
        return signupCode.trim() !== ""
      case 1:
        // Email/password - require all fields and matching passwords
        return signUpEmail.trim() !== "" &&
               signUpPassword.length >= 8 &&
               confirmPassword.length >= 8 &&
               signUpPassword === confirmPassword
      case 2:
        // Email confirmation - require verified
        return isVerified
      case 3:
        // Welcome step - no requirements
        return true
      case 4:
        // Name step - require first and last name
        return firstName.trim() !== "" && lastName.trim() !== ""
      case 5:
        // Phone and address step - require both
        return phoneNumber.length === 14 && homeAddress.trim() !== ""
      case 6:
        // To-do's step - optional
        return true
      case 7:
        // Calendar step - optional (can skip)
        return true
      default:
        return true
    }
  }

  if (checkingOnboarding || redirecting) {
    return (
      <div className="flex min-h-screen items-center justify-center p-8 bg-white" />
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-8 bg-white">
      <div className="w-full max-w-3xl space-y-12">
        <div className="flex justify-between items-center gap-4">
          {currentStep <= 3 ? (
            <div className="h-14 w-14" />
          ) : (
            <button
              onClick={handleBack}
              className="h-14 w-14 rounded-full flex items-center justify-center transition-opacity border bg-black border-black hover:opacity-80"
            >
              <ArrowLeft className="h-6 w-6 text-white" />
            </button>
          )}
          <div className="flex justify-center gap-2">
            {steps.map((_, index) => (
              <div
                key={index}
                className={cn(
                  "h-2 rounded-full transition-all",
                  index === currentStep ? "w-8 bg-primary" : "w-2 bg-gray-300"
                )}
              />
            ))}
          </div>
          {currentStep === steps.length - 1 ? (
            <button
              onClick={handleNext}
              disabled={!canProceed() || loading}
              className={cn(
                "px-6 py-3 rounded-full transition-opacity",
                !canProceed() || loading ? "bg-gray-300 text-gray-500 cursor-not-allowed" : "bg-black text-white hover:opacity-80"
              )}
            >
              {loading ? "..." : "Complete"}
            </button>
          ) : (
            <button
              onClick={handleNext}
              disabled={!canProceed() || loading}
              className={cn(
                "h-14 w-14 rounded-full flex items-center justify-center transition-opacity border",
                !canProceed() || loading ? "bg-white border-gray-300 cursor-not-allowed" : "bg-black border-black hover:opacity-80"
              )}
            >
              <ArrowRight className={cn("h-6 w-6", !canProceed() || loading ? "text-gray-400" : "text-white")} />
            </button>
          )}
        </div>

        <div className="min-h-[600px]">
          {currentStep === 0 ? (
            <div className="flex items-center gap-4 mb-8">
              <Image src="/righthandlogo.png" alt="Right Hand" width={64} height={64} />
              <h2 className={cn(typography.h3, "text-left")}>
                {steps[currentStep].title}
              </h2>
            </div>
          ) : (
            <h2 className={cn(typography.h3, "mb-8 text-left")}>
              {steps[currentStep].title}
            </h2>
          )}
          <div className="text-left">
            {steps[currentStep].content}
          </div>
        </div>
      </div>
    </div>
  )
}
