/**
 * components/loading-screen.tsx
 *
 * Author: Anna Glass
 * Created: 11/21/2025
 *
 * Right Hand, 2025. All rights reserved.
 */

import { SyncLoader } from "react-spinners"

/**
 * LoadingScreen
 * full-screen loading spinner.
 */
export function LoadingScreen() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-black">
      <SyncLoader color="#ffffff" size={10} />
    </div>
  )
}
