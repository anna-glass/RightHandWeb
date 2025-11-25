/**
 * app/home/preview/page.tsx
 *
 * Author: Anna Glass
 * Created: 11/25/2025
 *
 * Right Hand, 2025. All rights reserved.
 */

"use client"

import { Suspense, useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { LoadingScreen } from "@/components/loading-screen"
import { SaveContactToast } from "../components/SaveContactToast"
import { ProfileCard } from "../components/ProfileCard"
import { saveContact } from "../utils"
import type { Profile } from "../types"

/**
 * HomePreviewPage
 * preview version of home page that doesn't require authentication.
 */
export default function HomePreviewPage() {
  return (
    <Suspense fallback={<LoadingScreen />}>
      <Content />
    </Suspense>
  )
}

function Content() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [showToast, setShowToast] = useState(false)

  // mock profile for preview
  const profile: Profile = {
    id: 'preview',
    first_name: 'Preview',
    last_name: 'User',
    email: 'preview@example.com',
    avatar_url: null,
    phone_number: null,
  }

  // check for verification complete
  useEffect(() => {
    if (searchParams.get('verification') === 'complete') {
      setTimeout(() => setShowToast(true), 500)
    }
  }, [searchParams])

  async function handleSaveContact() {
    await saveContact()
    setShowToast(false)
    // remove verification query param from url
    router.replace('/home/preview')
  }

  async function handleLogout() {
    // no-op in preview mode
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
