/**
 * components/google-button.tsx
 *
 * Author: Anna Glass
 * Created: 11/21/2025
 *
 * Right Hand, 2025. All rights reserved.
 */

"use client"

import * as React from "react"

interface GoogleButtonProps {
  onClick: () => void
  disabled?: boolean
  size?: "sm" | "lg"
}

/**
 * GoogleButton
 * styled google oauth button with loading state.
 */
export function GoogleButton({ onClick, disabled, size = "lg" }: GoogleButtonProps) {
  const isSmall = size === "sm"

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`flex items-center bg-white rounded-lg hover:bg-gray-50 hover:scale-[1.02] transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
        isSmall ? "gap-2 px-4 py-2" : "gap-3 px-6 py-3"
      }`}
    >
      <svg
        width={isSmall ? 18 : 24}
        height={isSmall ? 18 : 24}
        viewBox="0 0 24 24"
        xmlns="http://www.w3.org/2000/svg"
      >
        <g fill="none" fillRule="evenodd">
          <path d="M23.64 12.205c0-.639-.057-1.252-.164-1.841H12v3.481h6.544a5.59 5.59 0 0 1-2.423 3.669v3.013h3.926c2.295-2.112 3.593-5.22 3.593-8.322Z" fill="#4285F4"/>
          <path d="M12 24c3.24 0 5.956-1.075 7.942-2.91l-3.926-3.013c-1.075.72-2.449 1.145-4.016 1.145-3.089 0-5.704-2.086-6.635-4.889H1.276v3.11A11.996 11.996 0 0 0 12 24Z" fill="#34A853"/>
          <path d="M5.365 14.333A7.19 7.19 0 0 1 4.99 12c0-.81.138-1.598.375-2.333V6.557H1.276A11.996 11.996 0 0 0 0 12c0 1.936.462 3.77 1.276 5.443l4.089-3.11Z" fill="#FBBC05"/>
          <path d="M12 4.773c1.743 0 3.307.598 4.538 1.773l3.407-3.407C17.95 1.19 15.234 0 12 0 7.316 0 3.225 2.698 1.276 6.557l4.089 3.11C6.296 6.859 8.911 4.773 12 4.773Z" fill="#EA4335"/>
        </g>
      </svg>
      <span className={`font-medium text-black ${isSmall ? "text-sm" : "text-xl"}`}>
        Continue with Google
      </span>
    </button>
  )
}
