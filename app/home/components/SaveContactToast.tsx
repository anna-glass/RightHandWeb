/**
 * app/home/components/SaveContactToast.tsx
 *
 * Author: Anna Glass
 * Created: 11/21/2025
 *
 * Right Hand, 2025. All rights reserved.
 */

"use client"

/**
 * SaveContactToast
 * clickable toast notification prompting users to save the contact.
 */
export function SaveContactToast({ show, onClick }: { show: boolean; onClick: () => void }) {
  if (!show) return null

  return (
    <>
      <div
        className="fixed bottom-24 left-1/2 z-[60] cursor-pointer"
        style={{
          animation: 'slideUpSpring 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) forwards',
          transform: 'translate(-50%, 0)'
        }}
        onClick={onClick}
      >
        <div className="bg-white text-black px-6 py-3 rounded-full shadow-lg border-2 border-gray-200 hover:bg-gray-50 transition-colors">
          <p className="text-xs font-medium">Click to download Right Hand&apos;s contact</p>
        </div>
      </div>
      <style jsx>{`
        @keyframes slideUpSpring {
          0% { transform: translate(-50%, 100px); opacity: 0; }
          50% { transform: translate(-50%, -5px); }
          100% { transform: translate(-50%, 0); opacity: 1; }
        }
      `}</style>
    </>
  )
}
