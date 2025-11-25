/**
 * app/home/components/ProfileCard.tsx
 *
 * Author: Anna Glass
 * Created: 11/21/2025
 *
 * Right Hand, 2025. All rights reserved.
 */

"use client"

import { useState } from "react"
import Image from "next/image"
import { SUPPORT_EMAIL, GOOGLE_PERMISSIONS_URL } from "@/lib/constants"
import { strings } from "@/lib/strings"
import { styles } from "../styles"
import type { Profile } from "../types"

/**
 * ProfileCard
 * displays user profile info with logout and settings actions.
 */
export function ProfileCard({
  profile,
  onLogout,
}: {
  profile: Profile | null
  onLogout: () => void
}) {
  const [loadingPortal, setLoadingPortal] = useState(false)

  async function handleManageSubscription() {
    try {
      setLoadingPortal(true)
      const response = await fetch("/api/stripe/portal", {
        method: "POST",
      })
      const data = await response.json()

      if (data.url) {
        window.location.href = data.url
      } else {
        console.error("No portal URL returned")
      }
    } catch (error) {
      console.error("Error opening portal:", error)
    } finally {
      setLoadingPortal(false)
    }
  }

  return (
    <div className="h-full flex flex-col relative z-10">
      <div className="flex-1 overflow-y-auto">
        <div className="flex flex-col items-center space-y-4 mb-6">
          {profile?.avatar_url ? (
            <Image
              src={profile.avatar_url}
              alt={profile.first_name ? `${profile.first_name} ${profile.last_name}` : strings.home.profile.defaultUser}
              width={96}
              height={96}
              className="w-24 h-24 rounded-full"
            />
          ) : (
            <div className="w-24 h-24 rounded-full bg-gray-200 flex items-center justify-center">
              <span className="text-2xl font-medium text-gray-600">
                {profile?.first_name && profile?.last_name
                  ? `${profile.first_name[0]}${profile.last_name[0]}`
                  : strings.home.profile.defaultAvatar}
              </span>
            </div>
          )}

          <h2 className="text-2xl font-bold text-white" style={styles.heading}>
            {profile?.first_name && profile?.last_name
              ? `${profile.first_name} ${profile.last_name}`
              : strings.home.profile.defaultUser}
          </h2>
        </div>

        <div className="space-y-2.5">
          {profile?.email && (
            <div className={`${styles.bubble} space-y-0.5`}>
              <p className={styles.label}>{strings.home.profile.email}</p>
              <p className={styles.value}>{profile.email}</p>
              <div className={`${styles.divider} space-y-0.5`}>
                <p className={styles.label}>{strings.home.profile.plan}</p>
                <p className={styles.value}>{strings.home.profile.planValue}</p>
              </div>
            </div>
          )}

          {profile?.phone_number && (
            <div className={`${styles.bubble} space-y-0.5`}>
              <p className={styles.label}>{strings.home.profile.mobile}</p>
              <p className={styles.value}>{profile.phone_number}</p>
            </div>
          )}

          <div className={`${styles.bubble} space-y-2.5 text-left`}>
            <button onClick={onLogout} className={`w-full text-left ${styles.actionHover} ${styles.actionText}`}>
              {strings.home.profile.logout}
            </button>
            <a
              href={GOOGLE_PERMISSIONS_URL}
              target="_blank"
              rel="noopener noreferrer"
              className={`block w-full text-left ${styles.actionHover} ${styles.actionText} ${styles.divider}`}
            >
              {strings.home.profile.updatePermissions}
            </a>
            <button
              onClick={handleManageSubscription}
              disabled={loadingPortal}
              className={`w-full text-left ${styles.actionHover} ${styles.actionText} ${styles.divider} disabled:opacity-50`}
            >
              {loadingPortal ? "Loading..." : strings.home.profile.manageSubscription}
            </button>
            <a
              href={`mailto:${SUPPORT_EMAIL}`}
              className={`block w-full text-left ${styles.actionHover} ${styles.actionText} ${styles.divider}`}
            >
              {strings.home.profile.support}
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
