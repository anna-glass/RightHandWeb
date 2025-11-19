"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { typography } from "@/lib/typography"
import { cn } from "@/lib/utils"
import { createClient } from "@/lib/supabase/browser"

export default function LoginPage() {
  const router = useRouter()
  const supabase = createClient()
  const [error, setError] = React.useState<string | null>(null)
  const [loading, setLoading] = React.useState(false)
  const [checkingAuth, setCheckingAuth] = React.useState(true)

  // Check if user is already logged in
  React.useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user && user.email?.endsWith('@getrighthand.com')) {
        router.push('/admin')
        return
      }
      setCheckingAuth(false)
    }
    checkAuth()
  }, [supabase, router])

  // Handle OAuth callback
  React.useEffect(() => {
    const handleCallback = async () => {
      const urlParams = new URLSearchParams(window.location.search)
      if (urlParams.get('login') === 'true') {
        const { data: { user } } = await supabase.auth.getUser()

        if (user) {
          // Check if email is from @getrighthand.com domain
          if (!user.email?.endsWith('@getrighthand.com')) {
            setError('Access denied. Only @getrighthand.com emails are allowed.')
            await supabase.auth.signOut()
            return
          }

          // Redirect to admin
          router.push('/admin')
        }
      }
    }
    handleCallback()
  }, [supabase, router])

  const handleGoogleLogin = async () => {
    setError(null)
    setLoading(true)

    try {
      const { error: signInError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/login?login=true`,
          queryParams: {
            hd: 'getrighthand.com', // This restricts to @getrighthand.com domain
            prompt: 'select_account',
          },
        },
      })

      if (signInError) {
        throw signInError
      }
    } catch (err) {
      console.error('Login error:', err)
      if (err instanceof Error) {
        setError(err.message)
      } else {
        setError('Failed to log in. Please try again.')
      }
      setLoading(false)
    }
  }

  if (checkingAuth) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <p className={cn(typography.body, "text-muted-foreground")}>Loading...</p>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-8 bg-white">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center space-y-2">
          <h1 className={cn(typography.h2)}>Right Hand Admin</h1>
          <p className={cn(typography.body, "text-muted-foreground")}>
            Sign in with your @getrighthand.com email
          </p>
        </div>

        <div className="space-y-6">
          {error && (
            <div className="text-destructive text-base p-4 bg-destructive/10 rounded-md">
              {error}
            </div>
          )}

          <div className="flex justify-center">
            <button
              onClick={handleGoogleLogin}
              disabled={loading}
              className="flex items-center gap-3 px-6 py-3 bg-white border-2 border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <g fill="none" fillRule="evenodd">
                  <path d="M23.64 12.205c0-.639-.057-1.252-.164-1.841H12v3.481h6.544a5.59 5.59 0 0 1-2.423 3.669v3.013h3.926c2.295-2.112 3.593-5.22 3.593-8.322Z" fill="#4285F4"/>
                  <path d="M12 24c3.24 0 5.956-1.075 7.942-2.91l-3.926-3.013c-1.075.72-2.449 1.145-4.016 1.145-3.089 0-5.704-2.086-6.635-4.889H1.276v3.11A11.996 11.996 0 0 0 12 24Z" fill="#34A853"/>
                  <path d="M5.365 14.333A7.19 7.19 0 0 1 4.99 12c0-.81.138-1.598.375-2.333V6.557H1.276A11.996 11.996 0 0 0 0 12c0 1.936.462 3.77 1.276 5.443l4.089-3.11Z" fill="#FBBC05"/>
                  <path d="M12 4.773c1.743 0 3.307.598 4.538 1.773l3.407-3.407C17.95 1.19 15.234 0 12 0 7.316 0 3.225 2.698 1.276 6.557l4.089 3.11C6.296 6.859 8.911 4.773 12 4.773Z" fill="#EA4335"/>
                </g>
              </svg>
              <span className="text-xl font-medium text-black">
                {loading ? "Connecting..." : "Sign in with Google"}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
