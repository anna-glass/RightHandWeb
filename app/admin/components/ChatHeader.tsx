/**
 * app/admin/components/ChatHeader.tsx
 *
 * Author: Anna Glass
 * Created: 11/21/2025
 *
 * Right Hand, 2025. All rights reserved.
 */

import Image from "next/image"
import { typography } from "@/lib/typography"
import { cn } from "@/lib/utils"
import { styles } from "../styles"
import { getUserDisplayName, getUserInitials } from "../utils"
import type { UserProfile } from "../types"

interface ChatHeaderProps {
  user: UserProfile
}

/**
 * ChatHeader
 * floating header with user avatar and name capsule.
 */
export function ChatHeader({ user }: ChatHeaderProps) {
  const displayName = getUserDisplayName(user.first_name, user.last_name, user.phone_number)
  const initials = getUserInitials(user.first_name, user.last_name)

  return (
    <div className={styles.chatHeader}>
      <div className="flex flex-col items-center">
        {user.avatar_url ? (
          <Image
            src={user.avatar_url}
            alt={displayName}
            width={64}
            height={64}
            className={styles.chatHeaderAvatar}
          />
        ) : (
          <div className={styles.chatHeaderAvatarPlaceholder}>
            {initials && (
              <span className="text-lg font-medium text-gray-600">{initials}</span>
            )}
          </div>
        )}
        <div className={styles.chatHeaderName}>
          <p className={cn(typography.bodySmall, "font-medium text-gray-900")}>
            {displayName}
          </p>
        </div>
      </div>
    </div>
  )
}
