"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { typography } from "@/lib/typography"
import { cn } from "@/lib/utils"
import { createClient } from "@/lib/supabase/browser"
import { QRCodeSVG } from "qrcode.react"

export default function DownloadPage() {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = React.useState(true)

  React.useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data: { user }, error } = await supabase.auth.getUser()

        if (error || !user) {
          router.push('/login')
          return
        }
      } catch (err) {
        console.error('Error checking auth:', err)
        router.push('/login')
      } finally {
        setLoading(false)
      }
    }

    checkAuth()
  }, [router, supabase.auth])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="w-full max-w-2xl bg-sidebar/95 backdrop-blur-sm rounded-lg p-8 text-center">
          <p className={cn(typography.body, "text-muted-foreground")}>
            Loading...
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center p-4 overflow-hidden">
      {/* Image Background */}
      <div
        className="absolute inset-0 w-full h-full bg-cover bg-center"
        style={{ backgroundImage: 'url(/background.png)' }}
      />

      {/* Dark Overlay */}
      <div className="absolute inset-0 bg-black/60" />

      {/* Content */}
      <div className="relative z-10 w-full max-w-2xl bg-sidebar/95 backdrop-blur-sm rounded-lg p-8 space-y-8 shadow-lg">
        <div className="text-center space-y-6">
          <Image src="/righthandlogo.png" alt="Right Hand" width={64} height={64} className="mx-auto" />

          <h1 className={cn(typography.h2)}>
            Download the Right Hand App
          </h1>

          <p className={cn(typography.body, "text-muted-foreground")}>
            Scan the QR code below with your iPhone to download the Right Hand app from the App Store.
          </p>

          {/* QR Code */}
          <div className="flex justify-center py-8">
            <div className="bg-white p-6 rounded-lg shadow-lg">
              <QRCodeSVG
                value="https://apps.apple.com/app/right-hand-agency/id6755159427"
                size={256}
                level="H"
                includeMargin={true}
              />
            </div>
          </div>

          <p className={cn(typography.bodySmall, "text-muted-foreground")}>
            Available on iOS. Visit the App Store to download manually.
          </p>
        </div>

        <div className="flex justify-center">
          <Button
            variant="outline"
            onClick={handleSignOut}
          >
            Sign Out
          </Button>
        </div>
      </div>
    </div>
  )
}
