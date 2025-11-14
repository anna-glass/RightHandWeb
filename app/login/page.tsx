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
