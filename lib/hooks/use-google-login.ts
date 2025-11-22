/**
 * lib/hooks/use-google-login.ts
 *
 * Author: Anna Glass
 * Created: 11/21/2025
 *
 * Right Hand, 2025. All rights reserved.
 */

"use client"

import * as React from "react"
import { createClient } from "@/lib/supabase/browser"
import { signInWithGoogle } from "@/lib/google-auth"

interface UseGoogleLoginOptions {
  redirectTo: string
  onError?: (error: string) => void
}

export function useGoogleLogin({ redirectTo, onError }: UseGoogleLoginOptions) {
  const supabase = createClient()
  const [loading, setLoading] = React.useState(false)

  const login = React.useCallback(async () => {
    setLoading(true)
    const { error } = await signInWithGoogle(supabase, redirectTo)
    if (error) {
      onError?.(error)
      setLoading(false)
    }
  }, [supabase, redirectTo, onError])

  return { login, loading }
}
