"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/browser"
import { SyncLoader } from "react-spinners"

export default function Home() {
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const redirectUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        // Not authenticated - redirect to signin
        router.replace('/signin')
        return
      }

      // Check if admin user
      if (user.email?.endsWith('@getrighthand.com')) {
        router.replace('/admin')
        return
      }

      // Regular authenticated user - redirect to home
      router.replace('/home')
    }

    redirectUser()
  }, [router, supabase])

  return (
    <div className="flex min-h-screen items-center justify-center bg-black">
      <SyncLoader color="#ffffff" size={10} />
    </div>
  )
}
