"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { typography } from "@/lib/typography"
import { cn } from "@/lib/utils"
import { createClient } from "@/lib/supabase/browser"

export default function CreateAccountPage() {
  const router = useRouter()
  const [email, setEmail] = React.useState("")
  const [password, setPassword] = React.useState("")
  const [confirmPassword, setConfirmPassword] = React.useState("")
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [verifying, setVerifying] = React.useState(true)
  const [step, setStep] = React.useState<"password" | "profile">("password")

  // Profile fields
  const [firstName, setFirstName] = React.useState("")
  const [lastName, setLastName] = React.useState("")
  const [phoneNumber, setPhoneNumber] = React.useState("")
  const [profileImage, setProfileImage] = React.useState<File | null>(null)
  const [imagePreview, setImagePreview] = React.useState<string | null>(null)

  const supabase = createClient()

  React.useEffect(() => {
    // When Supabase redirects after invite, it puts access_token in URL hash
    // The Supabase client automatically detects this and creates a session
    // We just need to wait for it to finish

    let mounted = true

    const initSession = async () => {
      // Check if there's an access token in the hash (from invite flow)
      const hasAccessToken = window.location.hash.includes('access_token')

      if (hasAccessToken) {
        // Extract tokens from URL hash
        const hashParams = new URLSearchParams(window.location.hash.substring(1))
        const accessToken = hashParams.get('access_token')
        const refreshToken = hashParams.get('refresh_token')

        if (accessToken && refreshToken) {
          try {
            // Manually set the session with the tokens from the URL
            const { data, error } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken
            })

            if (error) throw error

            if (data.user?.email) {
              setEmail(data.user.email)
              setError(null)
              setVerifying(false)
              // Clean up the URL hash
              window.history.replaceState(null, '', window.location.pathname)
              return
            }
          } catch (err: any) {
            setError('Could not verify invitation. Please try again or request a new invitation.')
            setVerifying(false)
            return
          }
        }

        // Timeout fallback
        setTimeout(() => {
          if (!mounted) return
          if (!email) {
            setError('Could not verify invitation. Please try again or request a new invitation.')
            setVerifying(false)
          }
        }, 5000)
      } else {
        // No access token in URL - check for existing session
        const { data: { session } } = await supabase.auth.getSession()

        if (session?.user?.email) {
          setEmail(session.user.email)
          setVerifying(false)
        } else {
          setError('Invalid invitation link. Please request a new invitation.')
          setVerifying(false)
        }
      }
    }

    initSession()

    return () => {
      mounted = false
    }
  }, [supabase.auth])

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    // Validate passwords match
    if (password !== confirmPassword) {
      setError("Passwords do not match")
      setLoading(false)
      return
    }

    // Validate password length
    if (password.length < 8) {
      setError("Password must be at least 8 characters long")
      setLoading(false)
      return
    }

    try {
      // Update the user's password
      const { error: updateError } = await supabase.auth.updateUser({
        password: password
      })

      if (updateError) throw updateError

      // Move to profile step
      setStep("profile")
      setError(null)
    } catch (err: any) {
      setError(err.message || "Failed to set password")
    } finally {
      setLoading(false)
    }
  }

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      // Validate file type
      const validTypes = ['image/png', 'image/jpeg', 'image/jpg']
      if (!validTypes.includes(file.type)) {
        setError('Please upload a PNG or JPEG image.')
        return
      }

      // Validate file size (5MB max)
      const maxSize = 5 * 1024 * 1024
      if (file.size > maxSize) {
        setError('File too large. Maximum size is 5MB.')
        return
      }

      setProfileImage(file)
      setError(null)

      // Create preview
      const reader = new FileReader()
      reader.onloadend = () => {
        setImagePreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      // Get the current user first
      const { data: { user }, error: userError } = await supabase.auth.getUser()

      if (userError || !user) {
        throw new Error('Not authenticated. Please try logging in again.')
      }

      console.log('Current user ID:', user.id)

      // Check if profile exists and user owns it
      const { data: existingProfile, error: fetchError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      console.log('Existing profile:', existingProfile)
      console.log('Fetch error:', fetchError)

      if (fetchError) {
        throw new Error(`Failed to fetch profile: ${fetchError.message}`)
      }

      let avatarUrl: string | undefined = undefined

      // Upload profile image if selected
      if (profileImage) {
        const fileExt = profileImage.name.split('.').pop()
        const fileName = `${user.id}-${Date.now()}.${fileExt}`
        const filePath = `${fileName}`

        // Upload to Supabase Storage using browser client
        const { error: uploadError } = await supabase.storage
          .from('profile_images')
          .upload(filePath, profileImage, {
            contentType: profileImage.type,
            upsert: false
          })

        if (uploadError) {
          throw new Error(uploadError.message)
        }

        // Get the public URL
        const { data: { publicUrl } } = supabase.storage
          .from('profile_images')
          .getPublicUrl(filePath)

        avatarUrl = publicUrl
      }

      console.log('Attempting to update profile with:', {
        first_name: firstName,
        last_name: lastName,
        phone_number: phoneNumber,
        avatar_url: avatarUrl || null,
      })

      // Update the profile using browser client
      const { data: updateData, error: updateError } = await supabase
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
      console.log('Update error:', updateError)

      if (updateError) {
        throw new Error(updateError.message)
      }

      // Get the user's role from their profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

      // Redirect based on role
      if (profile?.role === 'righthand') {
        router.push("/members")
      } else {
        // For member users, sign out and redirect to welcome page
        await supabase.auth.signOut()
        router.push("/welcome")
      }
    } catch (err: any) {
      setError(err.message || "Failed to complete profile")
    } finally {
      setLoading(false)
    }
  }

  if (verifying) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="w-full max-w-md bg-sidebar/95 backdrop-blur-sm rounded-lg p-8 text-center">
          <p className={cn(typography.body, "text-muted-foreground")}>
            Verifying invitation...
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-md bg-sidebar/95 backdrop-blur-sm rounded-lg p-8 space-y-8 shadow-lg">
        <div className="text-center">
          <img src="/righthandlogo.png" alt="Right Hand" className="h-16 w-auto mx-auto mb-4" />
          <h1 className={cn(typography.h2, "mb-2")}>
            {step === "password" ? "Create Your Account" : "Complete Your Profile"}
          </h1>
          <p className={cn(typography.body, "text-muted-foreground")}>
            {step === "password"
              ? "Set your password to complete account setup"
              : "Tell us a bit about yourself"}
          </p>
        </div>

        {step === "password" ? (
          <form onSubmit={handlePasswordSubmit} className="space-y-6">
            <div className="space-y-4">
              <div>
                <label htmlFor="email" className={cn(typography.label, "block mb-2")}>
                  Email
                </label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  disabled
                  className="bg-muted"
                />
                <p className={cn(typography.caption, "text-muted-foreground mt-1")}>
                  Your email address is confirmed
                </p>
              </div>

              <div>
                <label htmlFor="password" className={cn(typography.label, "block mb-2")}>
                  Password
                </label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={loading}
                  minLength={8}
                />
                <p className={cn(typography.caption, "text-muted-foreground mt-1")}>
                  Minimum 8 characters
                </p>
              </div>

              <div>
                <label htmlFor="confirmPassword" className={cn(typography.label, "block mb-2")}>
                  Confirm Password
                </label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  disabled={loading}
                  minLength={8}
                />
              </div>
            </div>

            {error && (
              <div className="text-destructive text-sm p-3 bg-destructive/10 rounded-md">
                {error}
              </div>
            )}

            <Button type="submit" className="w-full" disabled={loading || !email}>
              {loading ? "Setting Password..." : "Continue"}
            </Button>
          </form>
        ) : (
          <form onSubmit={handleProfileSubmit} className="space-y-6">
            <div className="space-y-4">
              <div>
                <label htmlFor="firstName" className={cn(typography.label, "block mb-2")}>
                  First Name
                </label>
                <Input
                  id="firstName"
                  type="text"
                  placeholder="John"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  required
                  disabled={loading}
                />
              </div>

              <div>
                <label htmlFor="lastName" className={cn(typography.label, "block mb-2")}>
                  Last Name
                </label>
                <Input
                  id="lastName"
                  type="text"
                  placeholder="Doe"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  required
                  disabled={loading}
                />
              </div>

              <div>
                <label htmlFor="phoneNumber" className={cn(typography.label, "block mb-2")}>
                  Phone Number
                </label>
                <Input
                  id="phoneNumber"
                  type="tel"
                  placeholder="(555) 123-4567"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  required
                  disabled={loading}
                />
              </div>

              <div>
                <label htmlFor="profileImage" className={cn(typography.label, "block mb-2")}>
                  Profile Pic (Optional)
                </label>
                <Input
                  id="profileImage"
                  type="file"
                  accept="image/png,image/jpeg,image/jpg"
                  onChange={handleImageChange}
                  disabled={loading}
                  className="cursor-pointer"
                />
                <p className={cn(typography.caption, "text-muted-foreground mt-1")}>
                  PNG or JPEG, max 5MB
                </p>
                {imagePreview && (
                  <div className="mt-3">
                    <img
                      src={imagePreview}
                      alt="Profile preview"
                      className="w-24 h-24 object-cover rounded-full border-2 border-border"
                    />
                  </div>
                )}
              </div>
            </div>

            {error && (
              <div className="text-destructive text-sm p-3 bg-destructive/10 rounded-md">
                {error}
              </div>
            )}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Completing Setup..." : "Complete Setup"}
            </Button>
          </form>
        )}
      </div>
    </div>
  )
}
