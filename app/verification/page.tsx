import Image from "next/image"
import { typography } from "@/lib/typography"
import { cn } from "@/lib/utils"

export default function VerificationPage() {
  return (
    <div className="flex min-h-screen items-center justify-center p-8 bg-white">
      <div className="w-full max-w-3xl">
        <Image src="/righthandlogo.png" alt="Right Hand" width={192} height={192} className="mb-8" />
        <div className="space-y-2">
          <h1 className={cn(typography.h2, "text-left")}>
            Thank you for verifying!
          </h1>
          <p className={cn(typography.bodyLarge, "text-gray-400 font-light text-left")}>
            You can safely close this window and return to your other tab.
          </p>
        </div>
      </div>
    </div>
  )
}
