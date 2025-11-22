/**
 * app/home/components/ProfileCard.tsx
 *
 * Author: Anna Glass
 * Created: 11/21/2025
 *
 * Right Hand, 2025. All rights reserved.
 */

"use client"

import Image from "next/image"
import { SUPPORT_EMAIL, GOOGLE_PERMISSIONS_URL } from "@/lib/constants"
import { strings } from "@/lib/strings"
import { styles } from "../styles"
import type { Profile } from "../types"

/**
 * ProfileCard
 * displays user profile info with logout and settings actions.
 */
export function ProfileCard({ profile, onLogout }: { profile: Profile | null; onLogout: () => void }) {
  return (
    <div className={`${styles.card} space-y-5 h-[600px] overflow-auto w-full`}>
      <div className="flex items-center gap-2 mb-3">
        <button className="w-3 h-3 rounded-full bg-red-500 hover:bg-red-600 transition-colors" title={strings.home.windowControls.close} />
        <button className="w-3 h-3 rounded-full bg-yellow-500 hover:bg-yellow-600 transition-colors" title={strings.home.windowControls.minimize} />
        <button className="w-3 h-3 rounded-full bg-green-500 hover:bg-green-600 transition-colors" title={strings.home.windowControls.maximize} />
      </div>

      <div className="flex flex-col items-center space-y-3">
        {profile?.avatar_url ? (
          <Image
            src={profile.avatar_url}
            alt={profile.first_name ? `${profile.first_name} ${profile.last_name}` : strings.home.profile.defaultUser}
            width={112}
            height={112}
            className="w-28 h-28 rounded-full"
          />
        ) : (
          <div className="w-28 h-28 rounded-full bg-gray-200 flex items-center justify-center">
            <span className="text-3xl font-medium text-gray-600">
              {profile?.first_name && profile?.last_name
                ? `${profile.first_name[0]}${profile.last_name[0]}`
                : strings.home.profile.defaultAvatar}
            </span>
          </div>
        )}

        <h2 className="text-3xl font-bold text-white" style={styles.heading}>
          {profile?.first_name && profile?.last_name
            ? `${profile.first_name} ${profile.last_name}`
            : strings.home.profile.defaultUser}
        </h2>
      </div>

      <div className="space-y-2.5 pt-3">
        {profile?.email && (
          <div className={`${styles.bubble} space-y-0.5`}>
            <p className={styles.label}>{strings.home.profile.email}</p>
            <p className={styles.value}>{profile.email}</p>
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
          <a
            href={`mailto:${SUPPORT_EMAIL}`}
            className={`block w-full text-left ${styles.actionHover} ${styles.actionText} ${styles.divider}`}
          >
            {strings.home.profile.support}
          </a>
        </div>
      </div>
    </div>
  )
}
