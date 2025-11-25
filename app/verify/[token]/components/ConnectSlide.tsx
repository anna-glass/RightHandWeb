/**
 * app/verify/[token]/components/ConnectSlide.tsx
 *
 * Author: Anna Glass
 * Created: 11/21/2025
 *
 * Right Hand, 2025. All rights reserved.
 */

import Image from "next/image"

/**
 * ConnectSlide
 * google oauth connection slide for onboarding.
 */
export function ConnectSlide() {
  return (
    <div className="relative w-full aspect-[9/16] max-h-[420px] rounded-3xl overflow-hidden">
      <Image
        src="/flowers.png"
        alt="Background"
        fill
        className="object-cover"
      />
      <div className="absolute inset-0 bg-black/30" />
      <div className="absolute inset-0 flex items-center justify-center p-6">
        <div className="relative w-full h-full">
          <Image
            src="/flowermessages.png"
            alt="Connect"
            fill
            className="object-contain"
          />
        </div>
      </div>
    </div>
  )
}
