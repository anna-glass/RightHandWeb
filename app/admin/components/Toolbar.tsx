/**
 * app/admin/components/Toolbar.tsx
 *
 * Author: Anna Glass
 * Created: 11/21/2025
 *
 * Right Hand, 2025. All rights reserved.
 */

import Image from "next/image"
import { images } from "@/lib/images"
import { styles } from "../styles"

interface ToolbarProps {
  currentTime: string
  onLogout: () => void
}

/**
 * Toolbar
 * macos-style toolbar with logo, logout, and time display.
 */
export function Toolbar({ currentTime, onLogout }: ToolbarProps) {
  return (
    <div className={styles.toolbar}>
      <div className="flex items-center gap-8">
        <div className="w-24 h-6 flex-shrink-0">
          <Image
            src={images.logo.light}
            alt="Right Hand"
            width={96}
            height={96}
            className="rounded-full"
          />
        </div>
        <button onClick={onLogout} className={styles.toolbarButton}>
          Logout
        </button>
      </div>
      <div className={styles.toolbarTime}>{currentTime}</div>
    </div>
  )
}
