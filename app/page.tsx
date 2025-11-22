/**
 * app/page.tsx
 *
 * Author: Anna Glass
 * Created: 11/21/2025
 *
 * Right Hand, 2025. All rights reserved.
 */

"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/browser"
import { ADMIN_EMAIL_DOMAIN } from "@/lib/constants"
import { LoadingScreen } from "@/components/loading-screen"

/**
 * Home
 * entry point with auth redirect logic.
 */
export default function Home() {
  const router = useRouter()

  useEffect(() => {
    async function redirect() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        router.replace('/signin')
      } else if (user.email?.endsWith(ADMIN_EMAIL_DOMAIN)) {
        router.replace('/admin')
      } else {
        router.replace('/home')
      }
    }
    redirect()
  }, [router])

  return <LoadingScreen />
}
