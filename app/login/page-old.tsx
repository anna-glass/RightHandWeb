"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { typography } from "@/lib/typography"
import { cn } from "@/lib/utils"
import { createClient } from "@/lib/supabase/browser"

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = React.useState("")
  const [password, setPassword] = React.useState("")
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const supabase = createClient()

  // Check for error messages from URL params
  React.useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    const errorParam = urlParams.get('error')

    if (errorParam === 'unauthorized') {
      setError('You do not have an account. Please sign up first.')
      // Remove error param from URL
      window.history.replaceState({}, '', '/login')
    } else if (errorParam === 'auth_failed') {
      setError('Authentication failed. Please try again.')
      window.history.replaceState({}, '', '/login')
    } else if (errorParam === 'profile_creation_failed') {
      setError('Failed to create profile. Please try again.')
      window.history.replaceState({}, '', '/login')
    }
  }, [])

  const handleGoogleSignin = async () => {
    setLoading(true)
    setError(null)

    try {
      const { error: signInError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback?signup=false`,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      })

      if (signInError) throw signInError
    } catch (err: any) {
      console.error('Google signin error:', err)
      setError(err.message)
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      console.log('Attempting login with email:', email)
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      if (authError) throw authError

      console.log('Login successful for user:', authData.user?.email)
      console.log('User ID:', authData.user?.id)

      // Check if user has a profile
      if (authData.user) {
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('id')
          .eq('id', authData.user.id)
          .single()

        if (profileError || !profile) {
          console.log('No profile found for user, deleting auth user')
          // User doesn't have a profile, sign them out and show error
          await supabase.auth.signOut()
          setError('You do not have an account. Please sign up first.')
          setLoading(false)
          return
        }
      }

      router.push("/")
      router.refresh()
    } catch (err: any) {
      console.error('Login error:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-md bg-sidebar/95 backdrop-blur-sm rounded-lg p-8 space-y-8 shadow-lg">
        <div className="text-center">
          <img src="/righthandlogo.png" alt="Right Hand" className="h-16 w-auto mx-auto mb-4" />
          <h1 className={cn(typography.h2, "mb-2")}>
            Welcome back
          </h1>
          <p className={cn(typography.body, "text-muted-foreground")}>
            Sign in to your account
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            <div>
              <label htmlFor="email" className={cn(typography.label, "block mb-2")}>
                Email
              </label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
              />
            </div>

            <div>
              <label htmlFor="password" className={cn(typography.label, "block mb-2")}>
                Password
              </label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading}
              />
            </div>
          </div>

          {error && (
            <div className="text-destructive text-sm">{error}</div>
          )}

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Loading..." : "Sign in"}
          </Button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className={cn(typography.caption, "bg-sidebar px-2 text-muted-foreground")}>
                Or continue with
              </span>
            </div>
          </div>

          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={handleGoogleSignin}
            disabled={loading}
          >
            <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
              <path
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                fill="#4285F4"
              />
              <path
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                fill="#34A853"
              />
              <path
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                fill="#FBBC05"
              />
              <path
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                fill="#EA4335"
              />
            </svg>
            Continue with Google
          </Button>
        </form>

        <div className="text-center">
          <p className={cn(typography.body, "text-muted-foreground mb-2")}>
            Don't have an account?
          </p>
          <Button
            variant="outline"
            className="w-full"
            onClick={() => router.push("/create-account")}
          >
            Sign up
          </Button>
        </div>
      </div>
    </div>
  )
}
