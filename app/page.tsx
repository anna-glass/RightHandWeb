"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/browser"
import { SyncLoader } from "react-spinners"

export default function Home() {
  const router = useRouter()

  useEffect(() => {
    async function redirect() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        router.replace('/signin')
      } else if (user.email?.endsWith('@getrighthand.com')) {
        router.replace('/admin')
      } else {
        router.replace('/home')
      }
    }
    redirect()
  }, [router])

  return (
    <div className="flex min-h-screen items-center justify-center bg-black">
      <SyncLoader color="#ffffff" size={10} />
    </div>
  )
}
