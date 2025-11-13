"use client"

import * as React from "react"
import { typography } from "@/lib/typography"
import { cn } from "@/lib/utils"

export default function WelcomePage() {
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
      <div className="relative z-10 w-full max-w-lg bg-sidebar/95 backdrop-blur-sm rounded-lg p-8 space-y-8 shadow-lg text-center">
        <div>
          <img src="/righthandlogo.png" alt="Right Hand" className="h-20 w-auto mx-auto mb-6" />
          <h1 className={cn(typography.h2, "mb-4")}>
            Welcome to Right Hand!
          </h1>
          <p className={cn(typography.body, "text-muted-foreground mb-2")}>
            Your account has been created successfully.
          </p>
          <p className={cn(typography.body, "text-muted-foreground")}>
            Download the mobile app to get started.
          </p>
        </div>

        <div className="space-y-6">
          {/* QR Code */}
          <div className="bg-white p-6 rounded-lg inline-block">
            <div className="w-48 h-48 flex items-center justify-center">
              {/* Placeholder for QR code - you can replace this with an actual QR code generator */}
              <img
                src="https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=https://apps.apple.com/app/righthand"
                alt="Download QR Code"
                className="w-full h-full"
              />
            </div>
          </div>

          {/* Download Button */}
          <div>
            <a
              href="https://apps.apple.com/app/righthand"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block bg-black hover:bg-gray-900 text-white px-8 py-4 rounded-xl font-semibold text-lg transition-colors"
            >
              Download on the App Store
            </a>
          </div>

          <p className={cn(typography.caption, "text-muted-foreground")}>
            Scan the QR code with your iPhone or click the button above to download
          </p>
        </div>
      </div>
    </div>
  )
}
