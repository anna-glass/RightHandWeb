/**
 * app/admin/components/UserListItem.tsx
 *
 * Author: Anna Glass
 * Created: 11/21/2025
 *
 * Right Hand, 2025. All rights reserved.
 */

import Image from "next/image"
import { cn } from "@/lib/utils"
import { styles } from "../styles"
import { formatSmartDate, getUserDisplayName, getUserInitials } from "../utils"
import type { UserProfile } from "../types"

interface UserListItemProps {
  user: UserProfile
  isSelected: boolean
  onSelect: () => void
}

/**
 * UserListItem
 * single user row in the users list with avatar and info.
 */
export function UserListItem({ user, isSelected, onSelect }: UserListItemProps) {
  const displayName = getUserDisplayName(user.first_name, user.last_name, user.phone_number)
  const initials = getUserInitials(user.first_name, user.last_name)
  const hasFullName = user.first_name && user.last_name

  return (
    <button
      onClick={onSelect}
      className={cn(styles.userItem, isSelected && styles.userItemSelected)}
    >
      <div className="flex-shrink-0">
        {user.avatar_url ? (
          <Image
            src={user.avatar_url}
            alt={displayName}
            width={56}
            height={56}
            className={styles.userAvatar}
          />
        ) : (
          <div className={styles.userAvatarPlaceholder}>
            {initials && (
              <span className="text-base font-medium text-gray-600">{initials}</span>
            )}
          </div>
        )}
      </div>

      <div className={styles.userInfo}>
        <p className={styles.userName}>{displayName}</p>
        {hasFullName && (
          <p className={styles.userSubtext}>{user.phone_number || user.email}</p>
        )}
      </div>

      <div className="flex-shrink-0 text-right">
        <p className={styles.userSubtext}>{formatSmartDate(user.created_at)}</p>
      </div>
    </button>
  )
}
