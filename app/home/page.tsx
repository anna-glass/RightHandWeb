/**
 * app/home/page.tsx
 *
 * Author: Anna Glass
 * Created: 11/21/2025
 *
 * Right Hand, 2025. All rights reserved.
 */

"use client"

import { Suspense, useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { createClient } from "@/lib/supabase/browser"
import { LoadingScreen } from "@/components/loading-screen"
import { SaveContactToast } from "./components/SaveContactToast"
import { ProfileCard } from "./components/ProfileCard"
import { saveContact } from "./utils"
import type { Profile } from "./types"

/**
 * HomePage
 * main dashboard for authenticated users with profile display and contact save flow.
 */
export default function HomePage() {
  return (
    <Suspense fallback={<LoadingScreen />}>
      <Content />
    </Suspense>
  )
}

function Content() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [showToast, setShowToast] = useState(false)

  // load user profile and check for verification complete
  useEffect(() => {
    async function loadUserData() {
      try {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
          router.push('/signin')
          return
        }

        const { data: profileData } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single()

        setProfile(profileData)

        // show toast if verification complete
        if (searchParams.get('verification') === 'complete') {
          setTimeout(() => setShowToast(true), 500)
        }
      } catch (error) {
        console.error('Error loading user data:', error)
      } finally {
        setLoading(false)
      }
    }
    loadUserData()
  }, [router, searchParams])

  async function handleSaveContact() {
    await saveContact()
    setShowToast(false)
    // remove verification query param from url
    router.replace('/home')
  }

  async function handleLogout() {
    await createClient().auth.signOut()
    router.push('/')
  }

  if (loading) {
    return <LoadingScreen />
  }

  return (
    <>
      <SaveContactToast show={showToast} onClick={handleSaveContact} />
      <div className="flex min-h-screen items-center justify-center bg-black p-6">
        <div className="relative w-full max-w-sm aspect-[9/16] rounded-3xl overflow-hidden">
          <div className="absolute inset-0" style={{ backgroundColor: '#22222140' }} />
          <div className="absolute inset-0 px-6 py-8">
            <ProfileCard profile={profile} onLogout={handleLogout} />
          </div>
        </div>
      </div>
    </>
  )
}
