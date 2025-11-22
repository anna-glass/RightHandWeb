"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/browser"
import { ADMIN_EMAIL_DOMAIN } from "@/lib/constants"
import { LoadingScreen } from "@/components/loading-screen"

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
