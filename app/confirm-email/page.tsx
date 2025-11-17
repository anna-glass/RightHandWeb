"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { cn } from "@/lib/utils"
import { typography } from "@/lib/typography"
import { createClient } from "@/lib/supabase/browser"
import { Button } from "@/components/ui/button"
import { AUTH_CARD_HEIGHT } from "@/lib/constants"

export default function ConfirmEmailPage() {
  const router = useRouter()
  const supabase = createClient()
  const [isVerified, setIsVerified] = React.useState(false)

  React.useEffect(() => {
    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('Auth state change:', event, session?.user?.email)

      // Check if user is verified
      if (event === 'SIGNED_IN' && session?.user) {
        setIsVerified(true)
      }
    })

    // Check if already verified on mount
    const checkVerification = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.user) {
        setIsVerified(true)
      }
    }
    checkVerification()

    return () => {
      subscription.unsubscribe()
    }
  }, [supabase.auth])

  const handleContinue = () => {
    router.push('/onboarding')
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-md bg-sidebar/95 backdrop-blur-sm rounded-lg p-8 shadow-lg" style={{ height: AUTH_CARD_HEIGHT }}>
        <div className="flex flex-col justify-between h-full">
          <div className="text-center">
            <Image src="/righthandlogo.png" alt="Right Hand" width={64} height={64} className="mx-auto mb-4" />
          </div>

          {!isVerified ? (
            <div className="space-y-6 text-center flex-1 flex flex-col justify-center">
              <h1 className={cn(typography.h2)}>
                Confirm your email
              </h1>

              <div className="p-4 bg-blue-500/10 rounded-lg border border-blue-500/20">
                <p className={cn(typography.body, "text-blue-600")}>
                  Check your email for a verification link. Click it to finish signing up.
                </p>
              </div>

              <p className={cn(typography.body, "text-muted-foreground text-sm")}>
                Didn&apos;t receive an email? Check your spam folder or contact support.
              </p>
            </div>
          ) : (
            <div className="space-y-6 text-center flex-1 flex flex-col justify-center">
              <h1 className={cn(typography.h2)}>
                You&apos;re verified!
              </h1>

              <div className="p-4 bg-green-500/10 rounded-lg border border-green-500/20">
                <p className={cn(typography.body, "text-green-600")}>
                  ✓ Your email has been verified successfully!
                </p>
              </div>

              <Button onClick={handleContinue} className="w-full">
                Continue to onboarding
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
