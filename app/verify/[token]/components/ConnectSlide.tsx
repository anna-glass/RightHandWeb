/**
 * app/verify/[token]/components/ConnectSlide.tsx
 *
 * Author: Anna Glass
 * Created: 11/21/2025
 *
 * Right Hand, 2025. All rights reserved.
 */

import { Button } from "@/components/ui/button"
import { typography } from "@/lib/typography"
import { cn } from "@/lib/utils"
import { strings } from "@/lib/strings"
import { ArrowLeft } from "lucide-react"
import { GoogleButton } from "@/components/google-button"
import { navButtonClass } from "../styles"

interface ConnectSlideProps {
  onPrevious: () => void
  onConnect: () => void
  loading: boolean
}

/**
 * ConnectSlide
 * google oauth connection slide for onboarding.
 */
export function ConnectSlide({ onPrevious, onConnect, loading }: ConnectSlideProps) {
  return (
    <div className="h-full flex flex-col">
      <div className="flex-1">
        <div className="text-left space-y-12">
          <p className={cn(typography.body, "text-white")}>
            {strings.verify.connect.line1}
          </p>
          <p className={cn(typography.body, "text-white")}>
            {strings.verify.connect.line2}
          </p>
        </div>
      </div>

      <div className="flex justify-between items-center">
        <Button onClick={onPrevious} variant="ghost" size="lg" className={navButtonClass}>
          <ArrowLeft className="w-5 h-5" />
          {strings.verify.nav.previous}
        </Button>
        <GoogleButton onClick={onConnect} disabled={loading} size="sm" />
      </div>
    </div>
  )
}
