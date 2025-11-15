"use client"

import * as React from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { typography } from "@/lib/typography"
import { cn } from "@/lib/utils"
import { createClient } from "@/lib/supabase/browser"

export default function AuthPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()

  // Determine initial view from URL param
  const initialView = searchParams.get('tab') === 'signup' ? 'signup' : 'signin'
  const [currentView, setCurrentView] = React.useState<'signin' | 'signup'>(initialView)

  // Sign in state
  const [signInEmail, setSignInEmail] = React.useState("")
  const [signInPassword, setSignInPassword] = React.useState("")
  const [signInLoading, setSignInLoading] = React.useState(false)
  const [signInError, setSignInError] = React.useState<string | null>(null)

  // Sign up state
  const [codeVerified, setCodeVerified] = React.useState(false)
  const [signupCode, setSignupCode] = React.useState("")
  const [showWaitlist, setShowWaitlist] = React.useState(false)
  const [waitlistEmail, setWaitlistEmail] = React.useState("")
  const [waitlistSubmitted, setWaitlistSubmitted] = React.useState(false)
  const [signUpEmail, setSignUpEmail] = React.useState("")
  const [signUpPassword, setSignUpPassword] = React.useState("")
  const [confirmPassword, setConfirmPassword] = React.useState("")
  const [firstName, setFirstName] = React.useState("")
  const [lastName, setLastName] = React.useState("")
  const [phoneNumber, setPhoneNumber] = React.useState("")
  const [profileImage, setProfileImage] = React.useState<File | null>(null)
  const [signUpLoading, setSignUpLoading] = React.useState(false)
  const [signUpError, setSignUpError] = React.useState<string | null>(null)

  // Check for error messages from URL params
  React.useEffect(() => {
    const errorParam = searchParams.get('error')

    if (errorParam === 'unauthorized') {
      setSignInError('You do not have an account. Please sign up first.')
      setCurrentView('signup')
      window.history.replaceState({}, '', '/login')
    } else if (errorParam === 'auth_failed') {
      setSignInError('Authentication failed. Please try again.')
      window.history.replaceState({}, '', '/login')
    } else if (errorParam === 'profile_creation_failed') {
      setSignInError('Failed to create profile. Please try again.')
      window.history.replaceState({}, '', '/login')
    }
  }, [searchParams])

  const handleGoogleSignin = async () => {
    setSignInLoading(true)
    setSignInError(null)

    try {
      const { error: signInError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback?signup=false`,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      })

      if (signInError) throw signInError
    } catch (err: any) {
      console.error('Google signin error:', err)
      setSignInError(err.message)
      setSignInLoading(false)
    }
  }

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault()
    setSignInLoading(true)
    setSignInError(null)

    try {
      console.log('Attempting login with email:', signInEmail)
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: signInEmail,
        password: signInPassword,
      })
      if (authError) throw authError

      console.log('Login successful for user:', authData.user?.email)
      console.log('User ID:', authData.user?.id)

      // Check if user has a profile
      if (authData.user) {
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('id')
          .eq('id', authData.user.id)
          .single()

        if (profileError || !profile) {
          console.log('No profile found for user, deleting auth user')
          await supabase.auth.signOut()
          setSignInError('You do not have an account. Please sign up first.')
          setSignInLoading(false)
          setCurrentView('signup')
          return
        }
      }

      router.push("/")
      router.refresh()
    } catch (err: any) {
      console.error('Login error:', err)
      setSignInError(err.message)
    } finally {
      setSignInLoading(false)
    }
  }

  const handleCodeVerification = async (e: React.FormEvent) => {
    e.preventDefault()
    setSignUpError(null)

    const response = await fetch('/api/verify-signup-code', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: signupCode })
    })

    const { valid } = await response.json()

    if (valid) {
      setCodeVerified(true)
    } else {
      setSignUpError("Invalid signup code. Please try again.")
    }
  }

  const handleWaitlistSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSignUpLoading(true)
    setSignUpError(null)

    try {
      const { error } = await supabase
        .from('waitlist')
        .insert({ email: waitlistEmail })

      if (error) throw error

      setWaitlistSubmitted(true)
    } catch (err: any) {
      console.error('Waitlist submission error:', err)
      setSignUpError(err.message || 'Failed to join waitlist. Please try again.')
    } finally {
      setSignUpLoading(false)
    }
  }

  const handleGoogleSignup = async () => {
    setSignUpLoading(true)
    setSignUpError(null)

    try {
      const { error: signInError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback?signup=true`,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      })

      if (signInError) throw signInError
    } catch (err: any) {
      console.error('Google signup error:', err)
      setSignUpError(err.message)
      setSignUpLoading(false)
    }
  }

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    setSignUpLoading(true)
    setSignUpError(null)

    if (signUpPassword !== confirmPassword) {
      setSignUpError("Passwords do not match")
      setSignUpLoading(false)
      return
    }

    if (signUpPassword.length < 8) {
      setSignUpError("Password must be at least 8 characters long")
      setSignUpLoading(false)
      return
    }

    try {
      console.log('Create account - Attempting sign up for email:', signUpEmail)

      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: signUpEmail,
        password: signUpPassword,
      })

      if (signUpError) {
        console.error('Create account - Sign up error:', signUpError)
        throw signUpError
      }

      if (!signUpData.user) {
        throw new Error('Failed to create account')
      }

      const user = signUpData.user
      console.log('Create account - User created successfully:', user.email)
      console.log('Create account - User ID:', user.id)

      console.log('Create account - Creating profile for user')
      const { error: createProfileError } = await supabase
        .from('profiles')
        .insert({
          id: user.id,
          email: signUpEmail,
          first_name: firstName,
          last_name: lastName,
          phone_number: phoneNumber,
          onboarding_completed: false
        })

      if (createProfileError) {
        console.error('Create account - Profile creation error:', createProfileError)
        console.log('Create account - Profile might already exist from a trigger, will update instead')
      } else {
        console.log('Create account - Profile created successfully')
      }

      let avatarUrl: string | undefined = undefined

      if (profileImage) {
        const fileExt = profileImage.name.split('.').pop()
        const fileName = `${user.id}-${Date.now()}.${fileExt}`
        const filePath = `${fileName}`

        const { error: uploadError } = await supabase.storage
          .from('profile_images')
          .upload(filePath, profileImage, {
            contentType: profileImage.type,
            upsert: false
          })

        if (uploadError) {
          throw new Error(uploadError.message)
        }

        const { data: { publicUrl } } = supabase.storage
          .from('profile_images')
          .getPublicUrl(filePath)

        avatarUrl = publicUrl
      }

      const { data: updateData, error: profileUpdateError } = await supabase
        .from('profiles')
        .update({
          first_name: firstName,
          last_name: lastName,
          phone_number: phoneNumber,
          avatar_url: avatarUrl || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id)
        .select()

      console.log('Update result:', updateData)
      console.log('Update error:', profileUpdateError)

      if (profileUpdateError) {
        throw new Error(profileUpdateError.message)
      }

      console.log('Create account - Profile update successful, redirecting to onboarding')

      router.push('/onboarding')
      router.refresh()
    } catch (err: any) {
      console.error('Create account - Error:', err)
      setSignUpError(err.message || "Failed to complete account setup")
    } finally {
      setSignUpLoading(false)
    }
  }

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const validTypes = ['image/png', 'image/jpeg', 'image/jpg']
      if (!validTypes.includes(file.type)) {
        setSignUpError('Please upload a PNG or JPEG image.')
        return
      }

      const maxSize = 5 * 1024 * 1024
      if (file.size > maxSize) {
        setSignUpError('File too large. Maximum size is 5MB.')
        return
      }

      setProfileImage(file)
      setSignUpError(null)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-md bg-sidebar/95 backdrop-blur-sm rounded-lg p-8 space-y-8 shadow-lg">
        <div className="text-center">
          <img src="/righthandlogo.png" alt="Right Hand" className="h-16 w-auto mx-auto mb-4" />
        </div>

        {currentView === 'signin' ? (
          <div className="space-y-6 min-h-[400px] max-h-[400px] flex flex-col">
            <div className="text-center space-y-2">
              <h1 className={cn(typography.h2)}>
                Hello from Right Hand!
              </h1>
              <p className={cn(typography.body, "text-muted-foreground")}>
                Enter your email & password to sign in to your account
              </p>
            </div>

            <form onSubmit={handleSignIn} className="space-y-6">
              <div className="space-y-4">
                <Input
                  id="signin-email"
                  type="email"
                  placeholder="Email"
                  value={signInEmail}
                  onChange={(e) => setSignInEmail(e.target.value)}
                  required
                  disabled={signInLoading}
                />

                <Input
                  id="signin-password"
                  type="password"
                  placeholder="Password"
                  value={signInPassword}
                  onChange={(e) => setSignInPassword(e.target.value)}
                  required
                  disabled={signInLoading}
                />
              </div>

              {signInError && (
                <div className="text-destructive text-sm p-3 bg-destructive/10 rounded-md">{signInError}</div>
              )}

              <div className="space-y-2">
                <Button type="submit" className="w-full" disabled={signInLoading}>
                  {signInLoading ? "Loading..." : "Sign in"}
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={handleGoogleSignin}
                  disabled={signInLoading}
                >
                <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                  <path
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    fill="#4285F4"
                  />
                  <path
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    fill="#34A853"
                  />
                  <path
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    fill="#FBBC05"
                  />
                  <path
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    fill="#EA4335"
                  />
                </svg>
                Continue with Google
                </Button>
              </div>
            </form>

            <div className="text-center">
              <p className={cn(typography.body, "text-muted-foreground mb-2")}>
                Don't have an account?
              </p>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => setCurrentView('signup')}
              >
                Sign up
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-6 min-h-[400px] max-h-[400px] flex flex-col">
            {!codeVerified ? (
              <div className="space-y-6 flex-1 flex flex-col justify-between">
                <div className="space-y-6">
                  <div className="text-center space-y-2">
                    <h1 className={cn(typography.h2)}>
                      Hello from Right Hand!
                    </h1>
                    <p className={cn(typography.body, "text-muted-foreground")}>
                      {!showWaitlist
                        ? "If you have a code to sign up, enter it here."
                        : "We're in beta testing, but would love for you to join the waitlist. Thanks for your interest!"
                      }
                    </p>
                  </div>

                  {!showWaitlist ? (
                    <form onSubmit={handleCodeVerification} className="space-y-6">
                      <Input
                        id="signupCode"
                        type="text"
                        placeholder="Enter your code"
                        value={signupCode}
                        onChange={(e) => setSignupCode(e.target.value)}
                        required
                        disabled={signUpLoading}
                      />

                      {signUpError && (
                        <div className="text-destructive text-sm p-3 bg-destructive/10 rounded-md">
                          {signUpError}
                        </div>
                      )}

                      <Button type="submit" className="w-full" disabled={signUpLoading}>
                        {signUpLoading ? "Verifying..." : "Continue"}
                      </Button>

                      <div className="text-center">
                        <button
                          type="button"
                          onClick={() => setShowWaitlist(true)}
                          disabled={signUpLoading}
                          className={cn(typography.body, "text-muted-foreground hover:text-foreground transition-colors")}
                        >
                          (if you don't, click here)
                        </button>
                      </div>
                    </form>
                  ) : !waitlistSubmitted ? (
                    <form onSubmit={handleWaitlistSubmit} className="space-y-6">
                      <Input
                        id="waitlistEmail"
                        type="email"
                        placeholder="Enter your email"
                        value={waitlistEmail}
                        onChange={(e) => setWaitlistEmail(e.target.value)}
                        required
                        disabled={signUpLoading}
                      />

                      {signUpError && (
                        <div className="text-destructive text-sm p-3 bg-destructive/10 rounded-md">
                          {signUpError}
                        </div>
                      )}

                      <Button type="submit" className="w-full" disabled={signUpLoading}>
                        {signUpLoading ? "Joining..." : "Join Waitlist"}
                      </Button>

                      <div className="text-center">
                        <button
                          type="button"
                          onClick={() => setShowWaitlist(false)}
                          disabled={signUpLoading}
                          className={cn(typography.body, "text-muted-foreground hover:text-foreground transition-colors")}
                        >
                          Back to Signup Code
                        </button>
                      </div>
                    </form>
                  ) : (
                    <div className="space-y-6">
                      <div className="text-center p-4 bg-green-500/10 rounded-lg border border-green-500/20">
                        <p className={cn(typography.body, "text-green-600")}>
                          ✓ You've been added to the waitlist! We'll be in touch soon.
                        </p>
                      </div>
                      <div className="text-center">
                        <button
                          type="button"
                          onClick={() => {
                            setShowWaitlist(false)
                            setWaitlistSubmitted(false)
                            setWaitlistEmail("")
                          }}
                          className={cn(typography.body, "text-muted-foreground hover:text-foreground transition-colors")}
                        >
                          Back to Signup Code
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                <div className="text-center">
                  <p className={cn(typography.body, "text-muted-foreground mb-2")}>
                    Already have an account?
                  </p>
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => setCurrentView('signin')}
                  >
                    Sign in
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-6 flex-1 flex flex-col justify-between">
                <form onSubmit={handleSignUp} className="space-y-6">
                  <div className="space-y-4">
                    <Input
                      id="signup-email"
                      type="email"
                      placeholder="Email"
                      value={signUpEmail}
                      onChange={(e) => setSignUpEmail(e.target.value)}
                      required
                      disabled={signUpLoading}
                    />

                    <Input
                      id="signup-password"
                      type="password"
                      placeholder="Password"
                      value={signUpPassword}
                      onChange={(e) => setSignUpPassword(e.target.value)}
                      required
                      disabled={signUpLoading}
                      minLength={8}
                    />

                    <Input
                      id="confirm-password"
                      type="password"
                      placeholder="Confirm Password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                      disabled={signUpLoading}
                      minLength={8}
                    />

                    <Input
                      id="firstName"
                      type="text"
                      placeholder="First Name"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      required
                      disabled={signUpLoading}
                    />

                    <Input
                      id="lastName"
                      type="text"
                      placeholder="Last Name"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      required
                      disabled={signUpLoading}
                    />

                    <Input
                      id="phoneNumber"
                      type="tel"
                      placeholder="Phone Number"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      required
                      disabled={signUpLoading}
                    />

                    <Input
                      id="profileImage"
                      type="file"
                      accept="image/png,image/jpeg,image/jpg"
                      onChange={handleImageChange}
                      disabled={signUpLoading}
                      className="cursor-pointer"
                    />
                  </div>

                  {signUpError && (
                    <div className="text-destructive text-sm p-3 bg-destructive/10 rounded-md">
                      {signUpError}
                    </div>
                  )}

                  <Button type="submit" className="w-full" disabled={signUpLoading}>
                    {signUpLoading ? "Creating Account..." : "Create Account"}
                  </Button>

                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className={cn(typography.caption, "bg-sidebar px-2 text-muted-foreground")}>
                        Or continue with
                      </span>
                    </div>
                  </div>

                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    onClick={handleGoogleSignup}
                    disabled={signUpLoading}
                  >
                    <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                      <path
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                        fill="#4285F4"
                      />
                      <path
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                        fill="#34A853"
                      />
                      <path
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                        fill="#FBBC05"
                      />
                      <path
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                        fill="#EA4335"
                      />
                    </svg>
                    Continue with Google
                  </Button>
                </form>

                <div className="text-center">
                  <p className={cn(typography.body, "text-muted-foreground mb-2")}>
                    Already have an account?
                  </p>
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => setCurrentView('signin')}
                    disabled={signUpLoading}
                  >
                    Sign in
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
