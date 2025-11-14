"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { typography } from "@/lib/typography"
import { cn } from "@/lib/utils"
import { createClient } from "@/lib/supabase/browser"

export default function ProfilePage() {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = React.useState(true)
  const [profile, setProfile] = React.useState<any>(null)
  const [onboardingData, setOnboardingData] = React.useState<any>(null)

  React.useEffect(() => {
    const loadProfile = async () => {
      try {
        const { data: { user }, error: userError } = await supabase.auth.getUser()

        console.log('Profile page - Current user:', user?.email)
        console.log('Profile page - User ID:', user?.id)

        if (userError) {
          console.error('Profile page - User error:', userError)
        }

        if (!user) {
          console.log('Profile page - No user found, redirecting to login')
          router.push('/login')
          return
        }

        // Load profile
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single()

        console.log('Profile page - Profile data:', profileData)
        if (profileError) {
          console.error('Profile page - Profile error:', profileError)
        }

        // Load onboarding responses
        const { data: onboardingResponses, error: onboardingError } = await supabase
          .from('onboarding_responses')
          .select('*')
          .eq('user_id', user.id)
          .single()

        console.log('Profile page - Onboarding data:', onboardingResponses)
        if (onboardingError) {
          console.error('Profile page - Onboarding error:', onboardingError)
        }

        setProfile({ ...profileData, email: user.email })
        setOnboardingData(onboardingResponses)
      } catch (err) {
        console.error('Error loading profile:', err)
      } finally {
        setLoading(false)
      }
    }

    loadProfile()
  }, [])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="w-full max-w-2xl bg-sidebar/95 backdrop-blur-sm rounded-lg p-8 text-center">
          <p className={cn(typography.body, "text-muted-foreground")}>
            Loading...
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center p-4 overflow-hidden">
      {/* Image Background */}
      <div
        className="absolute inset-0 w-full h-full bg-cover bg-center"
        style={{ backgroundImage: 'url(/background.png)' }}
      />

      {/* Dark Overlay */}
      <div className="absolute inset-0 bg-black/60" />

      {/* Content */}
      <div className="relative z-10 w-full max-w-2xl bg-sidebar/95 backdrop-blur-sm rounded-lg p-8 space-y-8 shadow-lg">
        <div className="text-center">
          <img src="/righthandlogo.png" alt="Right Hand" className="h-16 w-auto mx-auto mb-4" />
          <h1 className={cn(typography.h2, "mb-2")}>
            Your Profile
          </h1>
        </div>

        {/* Profile Section */}
        <div className="space-y-6">
          {profile?.avatar_url && (
            <div className="flex justify-center">
              <img
                src={profile.avatar_url}
                alt="Profile"
                className="w-32 h-32 rounded-full object-cover border-4 border-white shadow-lg"
              />
            </div>
          )}

          <div className="space-y-4">
            <div className="bg-white/10 p-4 rounded-lg">
              <label className={cn(typography.label, "text-muted-foreground")}>Name</label>
              <p className={cn(typography.body, "text-white mt-1")}>
                {profile?.first_name} {profile?.last_name}
              </p>
            </div>

            <div className="bg-white/10 p-4 rounded-lg">
              <label className={cn(typography.label, "text-muted-foreground")}>Email</label>
              <p className={cn(typography.body, "text-white mt-1")}>
                {profile?.email}
              </p>
            </div>

            <div className="bg-white/10 p-4 rounded-lg">
              <label className={cn(typography.label, "text-muted-foreground")}>Phone Number</label>
              <p className={cn(typography.body, "text-white mt-1")}>
                {profile?.phone_number}
              </p>
            </div>
          </div>

          {/* Onboarding Information */}
          {onboardingData && (
            <div className="space-y-4 pt-4 border-t border-white/20">
              <h3 className={cn(typography.h4, "text-white")}>Your Preferences</h3>

              {onboardingData.typical_week && (
                <div className="bg-white/10 p-4 rounded-lg">
                  <label className={cn(typography.label, "text-muted-foreground")}>Typical Week</label>
                  <p className={cn(typography.body, "text-white mt-1 whitespace-pre-wrap")}>
                    {onboardingData.typical_week}
                  </p>
                </div>
              )}

              {onboardingData.home_address && (
                <div className="bg-white/10 p-4 rounded-lg">
                  <label className={cn(typography.label, "text-muted-foreground")}>Home Address</label>
                  <p className={cn(typography.body, "text-white mt-1")}>
                    {onboardingData.home_address}
                  </p>
                </div>
              )}

              {onboardingData.work_address && (
                <div className="bg-white/10 p-4 rounded-lg">
                  <label className={cn(typography.label, "text-muted-foreground")}>Work Address</label>
                  <p className={cn(typography.body, "text-white mt-1")}>
                    {onboardingData.work_address}
                  </p>
                </div>
              )}

              {onboardingData.frequent_businesses && (
                <div className="bg-white/10 p-4 rounded-lg">
                  <label className={cn(typography.label, "text-muted-foreground")}>Frequent Businesses</label>
                  <p className={cn(typography.body, "text-white mt-1 whitespace-pre-wrap")}>
                    {onboardingData.frequent_businesses}
                  </p>
                </div>
              )}

              <div className="bg-white/10 p-4 rounded-lg">
                <label className={cn(typography.label, "text-muted-foreground")}>Calendar Connected</label>
                <p className={cn(typography.body, "text-white mt-1")}>
                  {onboardingData.calendar_connected ? "Yes" : "No"}
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="flex gap-4">
          <Button
            variant="outline"
            className="flex-1"
            onClick={handleSignOut}
          >
            Sign Out
          </Button>
        </div>
      </div>
    </div>
  )
}
