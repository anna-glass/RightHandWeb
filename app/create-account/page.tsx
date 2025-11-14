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

  // Profile fields
  const [firstName, setFirstName] = React.useState("")
  const [lastName, setLastName] = React.useState("")
  const [phoneNumber, setPhoneNumber] = React.useState("")
  const [profileImage, setProfileImage] = React.useState<File | null>(null)

  const supabase = createClient()

  React.useEffect(() => {
    // Allow direct sign-ups - no invite required
    setVerifying(false)
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
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
      console.log('Create account - Attempting sign up for email:', email)

      // Sign up the user
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: email,
        password: password,
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

      // Create profile for the new user
      console.log('Create account - Creating profile for user')
      const { error: createProfileError } = await supabase
        .from('profiles')
        .insert({
          id: user.id,
          email: email,
          first_name: firstName,
          last_name: lastName,
          phone_number: phoneNumber,
          onboarding_completed: false
        })

      if (createProfileError) {
        console.error('Create account - Profile creation error:', createProfileError)
        console.log('Create account - Profile might already exist from a trigger, will update instead')
        // Profile might already exist from a trigger, so we'll update instead
      } else {
        console.log('Create account - Profile created successfully')
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

      // Redirect to onboarding
      router.push('/onboarding')
      router.refresh()
    } catch (err: any) {
      console.error('Create account - Error:', err)
      setError(err.message || "Failed to complete account setup")
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
      <div className="w-full max-w-2xl bg-sidebar/95 backdrop-blur-sm rounded-lg p-8 space-y-8 shadow-lg">
        <div className="text-center">
          <img src="/righthandlogo.png" alt="Right Hand" className="h-16 w-auto mx-auto mb-4" />
          <h1 className={cn(typography.h2, "mb-2")}>
            Create Your Account
          </h1>
          <p className={cn(typography.body, "text-muted-foreground")}>
            Set your password and complete your profile
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            <div>
              <label htmlFor="email" className={cn(typography.label, "block mb-2")}>
                Email
              </label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="password" className={cn(typography.label, "block mb-2")}>
                  Password
                </label>
                <Input
                  id="password"
                  type="password"
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
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  disabled={loading}
                  minLength={8}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="firstName" className={cn(typography.label, "block mb-2")}>
                  First Name
                </label>
                <Input
                  id="firstName"
                  type="text"
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
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  required
                  disabled={loading}
                />
              </div>
            </div>

            <div>
              <label htmlFor="phoneNumber" className={cn(typography.label, "block mb-2")}>
                Phone Number
              </label>
              <Input
                id="phoneNumber"
                type="tel"
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
            </div>
          </div>

          {error && (
            <div className="text-destructive text-sm p-3 bg-destructive/10 rounded-md">
              {error}
            </div>
          )}

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Creating Account..." : "Create Account"}
          </Button>
        </form>

        <div className="text-center">
          <p className={cn(typography.body, "text-muted-foreground mb-2")}>
            Already have an account?
          </p>
          <Button
            variant="outline"
            className="w-full"
            onClick={() => router.push("/login")}
            disabled={loading}
          >
            Sign in
          </Button>
        </div>
      </div>
    </div>
  )
}
