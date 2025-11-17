"use client"

import * as React from "react"
import Image from "next/image"
import { typography } from "@/lib/typography"
import { cn } from "@/lib/utils"
import { QRCodeSVG } from "qrcode.react"
import { createClient } from "@/lib/supabase/browser"

export default function DownloadPage() {
  const supabase = createClient()
  const [loading, setLoading] = React.useState(true)

  React.useEffect(() => {
    const completeOnboarding = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()

        if (user) {
          // Check if onboarding is completed
          const { data: profile } = await supabase
            .from('profiles')
            .select('onboarding_completed')
            .eq('id', user.id)
            .single()

          // If not completed, mark it as completed
          if (!profile?.onboarding_completed) {
            await supabase
              .from('profiles')
              .update({
                onboarding_completed: true,
                updated_at: new Date().toISOString()
              })
              .eq('id', user.id)
          }

          // Sign out the user
          await supabase.auth.signOut()
        }
      } catch (err) {
        console.error('Error completing onboarding:', err)
      } finally {
        setLoading(false)
      }
    }

    completeOnboarding()
  }, [supabase])

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center p-8 bg-white" />
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-8 bg-white">
      <div className="w-full max-w-2xl space-y-12">
        <div className="text-center space-y-8">
          <div className="flex justify-center">
            <Image src="/righthandlogo.png" alt="Right Hand" width={192} height={192} />
          </div>
          <h1 className={cn(typography.h2)}>
            You&apos;re all set!
          </h1>

          <p className={cn(typography.body, "text-muted-foreground")}>
            Scan the QR code below with your iPhone to download the Right Hand app from the App Store.
          </p>

          {/* QR Code */}
          <div className="flex justify-center py-8">
            <div className="bg-white p-6 rounded-lg border border-gray-200">
              <QRCodeSVG
                value="https://apps.apple.com/app/right-hand-agency/id6755159427"
                size={256}
                level="H"
                includeMargin={true}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
