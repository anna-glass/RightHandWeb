/**
 * app/verify/[token]/components/ProgressBar.tsx
 *
 * Author: Anna Glass
 * Created: 11/21/2025
 *
 * Right Hand, 2025. All rights reserved.
 */

interface ProgressBarProps {
  currentSlide: number
  totalSlides: number
}

/**
 * ProgressBar
 * animated slide progress indicator.
 */
export function ProgressBar({ currentSlide, totalSlides }: ProgressBarProps) {
  return (
    <div className="flex items-center gap-2 max-w-32">
      {Array.from({ length: totalSlides }).map((_, index) => (
        <div
          key={index}
          className={`rounded-full transition-all duration-300 ease-in-out ${
            index === currentSlide
              ? 'h-1 w-8 bg-white'
              : 'h-1.5 w-1.5 bg-white/40'
          }`}
        />
      ))}
    </div>
  )
}
