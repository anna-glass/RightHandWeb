/**
 * app/verify/[token]/components/WelcomeSlide.tsx
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
import { ArrowRight } from "lucide-react"
import { navButtonClass } from "../styles"

interface WelcomeSlideProps {
  onNext: () => void
}

/**
 * WelcomeSlide
 * first onboarding slide with welcome message.
 */
export function WelcomeSlide({ onNext }: WelcomeSlideProps) {
  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 space-y-12 text-left">
        <p className={cn(typography.body, "text-white")}>
          {strings.verify.welcome.line1}
        </p>
        <p className={cn(typography.body, "text-white")}>
          {strings.verify.welcome.line2}
        </p>
      </div>

      <div className="flex justify-between">
        <div className="w-24" />
        <Button onClick={onNext} variant="ghost" size="lg" className={navButtonClass}>
          {strings.verify.nav.next}
          <ArrowRight className="w-5 h-5" />
        </Button>
      </div>
    </div>
  )
}
