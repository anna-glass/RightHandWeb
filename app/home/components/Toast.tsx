"use client"

import { strings } from "@/lib/strings"

export function Toast({ show, isDismissing }: { show: boolean; isDismissing: boolean }) {
  if (!show) return null

  return (
    <>
      <div
        className={`fixed top-4 left-1/2 transform -translate-x-1/2 z-[60] transition-all duration-300 ${
          isDismissing ? '-translate-y-20 opacity-0' : 'translate-y-0 opacity-100'
        }`}
        style={{
          animation: isDismissing ? 'none' : 'slideDownSpring 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)'
        }}
      >
        <div className="bg-white text-black px-6 py-3 rounded-full shadow-lg border-2 border-gray-200">
          <p className="text-xs font-medium">{strings.home.toast.saveContact}</p>
        </div>
      </div>
      <style jsx>{`
        @keyframes slideDownSpring {
          0% { transform: translateY(-100px); opacity: 0; }
          50% { transform: translateY(5px); }
          100% { transform: translateY(0); opacity: 1; }
        }
      `}</style>
    </>
  )
}
