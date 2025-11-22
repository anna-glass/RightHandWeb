"use client"

import { Suspense, useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { createClient } from "@/lib/supabase/browser"
import { images } from "@/lib/images"
import { LoadingScreen } from "@/components/loading-screen"
import { SaveContactToast } from "./components/SaveContactToast"
import { ContactCard } from "./components/ContactCard"
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
  const [imageLoaded, setImageLoaded] = useState(false)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [showContactCard, setShowContactCard] = useState(false)
  const [showToast, setShowToast] = useState(false)
  const [isToastDismissing, setIsToastDismissing] = useState(false)

  // preload background image
  useEffect(() => {
    const img = new window.Image()
    img.src = images.backgrounds.home
    img.onload = () => setImageLoaded(true)
    img.onerror = () => setImageLoaded(true)
  }, [])

  // load user profile and trigger onboarding toast sequence
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

        // show save contact card after onboarding
        if (searchParams.get('onboarding') === 'complete') {
          setShowContactCard(true)
          setTimeout(() => {
            setShowToast(true)
            setTimeout(() => {
              setIsToastDismissing(true)
              setTimeout(() => {
                setShowToast(false)
                setIsToastDismissing(false)
              }, 300)
            }, 5000)
          }, 2000)
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
    setShowContactCard(false)
  }

  async function handleLogout() {
    await createClient().auth.signOut()
    router.push('/')
  }

  if (loading || !imageLoaded) {
    return <LoadingScreen />
  }

  return (
    <>
      <SaveContactToast show={showToast} isDismissing={isToastDismissing} />
      {showContactCard && <ContactCard onSaveContact={handleSaveContact} />}
      <div className="relative min-h-screen p-6 bg-cover bg-center bg-no-repeat" style={{ backgroundImage: `url(${images.backgrounds.home})` }}>
        {!showContactCard && <div className="absolute inset-0 bg-black/50 z-0"></div>}
        <div className="relative max-w-sm mx-auto z-10 flex items-start justify-center pt-12 min-h-screen">
          <ProfileCard profile={profile} onLogout={handleLogout} />
        </div>
      </div>
    </>
  )
}
