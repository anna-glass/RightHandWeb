/**
 * app/verify/[token]/components/Tour2Slide.tsx
 *
 * Author: Anna Glass
 * Created: 11/24/2025
 *
 * Right Hand, 2025. All rights reserved.
 */

import Image from "next/image"

interface Tour2SlideProps {
  onContinue: () => void
  onPrevious: () => void
}

/**
 * Tour2Slide
 * second tour slide.
 */
export function Tour2Slide({ onContinue, onPrevious }: Tour2SlideProps) {
  return (
    <div className="h-full flex flex-col relative z-10">
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={onPrevious}
          className="text-white text-sm hover:underline hover:opacity-80"
        >
          &lt; last
        </button>
        <button
          onClick={onContinue}
          className="text-white text-sm hover:underline hover:opacity-80"
        >
          next &gt;
        </button>
      </div>

      <div className="flex-1" />

      <div className="flex flex-col items-center mb-6">
        <h3 className="text-white text-center text-lg font-normal px-4">
          Your (real) assistant handles tasks that matter most.
        </h3>
      </div>

      <div className="relative w-full h-[70%] -mb-8">
        <div className="absolute inset-0 px-8 overflow-hidden rounded-2xl">
          <Image
            src="/verifyscreen2.png"
            alt="Payment"
            fill
            className="object-contain object-top"
            priority
            unoptimized
          />
        </div>
      </div>
    </div>
  )
}
