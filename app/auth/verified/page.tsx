"use client"

import * as React from "react"
import Image from "next/image"
import { cn } from "@/lib/utils"
import { typography } from "@/lib/typography"
import { AUTH_CARD_HEIGHT } from "@/lib/constants"

export default function VerifiedPage() {
  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-md bg-sidebar/95 backdrop-blur-sm rounded-lg p-8 shadow-lg" style={{ height: AUTH_CARD_HEIGHT }}>
        <div className="flex flex-col items-center justify-center h-full space-y-6 text-center">
          <Image src="/righthandlogo.png" alt="Right Hand" width={64} height={64} />

          <div className="space-y-4">
            <h1 className={cn(typography.h2)}>
              Thank you for verifying!
            </h1>

            <p className={cn(typography.body, "text-muted-foreground")}>
              You can safely close this window and return to login.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
