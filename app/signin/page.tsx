"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { createClient } from "@/lib/supabase/browser"
import { images } from "@/lib/images"
import { LoadingScreen } from "@/components/loading-screen"
import { GoogleButton } from "@/components/google-button"
import { useGoogleLogin } from "@/lib/hooks/use-google-login"
import { ADMIN_EMAIL_DOMAIN } from "@/lib/constants"

/**
 * LoginPage
 * google oauth signin with automatic redirect for authenticated users.
 */
export default function LoginPage() {
  const router = useRouter()
  const supabase = createClient()
  const [error, setError] = React.useState<string | null>(null)
  const [checkingAuth, setCheckingAuth] = React.useState(true)

  const { login, loading } = useGoogleLogin({
    redirectTo: typeof window !== 'undefined' ? `${window.location.origin}/signin?login=true` : '',
    onError: setError,
  })

  // redirect already authenticated users
  React.useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        router.push(user.email?.endsWith(ADMIN_EMAIL_DOMAIN) ? '/admin' : '/home')
        return
      }
      setCheckingAuth(false)
    }
    checkAuth()
  }, [supabase, router])

  // handle oauth callback redirect
  React.useEffect(() => {
    const handleCallback = async () => {
      const urlParams = new URLSearchParams(window.location.search)
      if (urlParams.get('login') === 'true') {
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          router.push(user.email?.endsWith(ADMIN_EMAIL_DOMAIN) ? '/admin' : '/home')
        }
      }
    }
    handleCallback()
  }, [supabase, router])

  if (checkingAuth) {
    return <LoadingScreen />
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-8 bg-black">
      <div className="w-full max-w-md space-y-8">
        <div className="flex flex-col items-center">
          <Image
            src={images.logo.light}
            alt="Right Hand"
            width={360}
            height={360}
            className="rounded-full"
          />
        </div>

        <div className="space-y-6">
          {error && (
            <div className="text-red-400 text-base p-4 bg-red-950/30 rounded-md border border-red-800">
              {error}
            </div>
          )}

          <div className="flex justify-center">
            <GoogleButton onClick={login} disabled={loading} />
          </div>
        </div>
      </div>
    </div>
  )
}
