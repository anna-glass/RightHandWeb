/**
 * app/home/components/ContactCard.tsx
 *
 * Author: Anna Glass
 * Created: 11/21/2025
 *
 * Right Hand, 2025. All rights reserved.
 */

"use client"

import Image from "next/image"
import { Mail, Phone, MessageCircle, Video, ChevronRight } from "lucide-react"
import { CONTACT_PHONE, CONTACT_NAME, CONTACT_EMAIL } from "@/lib/constants"
import { strings } from "@/lib/strings"
import { images } from "@/lib/images"
import { styles } from "../styles"

/**
 * ContactCard
 * ios-style contact card for saving right hand to contacts.
 */
export function ContactCard({ onSaveContact }: { onSaveContact: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-start justify-center pt-12 p-6 z-50">
      <div className={`${styles.card} max-w-sm w-full h-[600px] overflow-auto flex flex-col items-center justify-center`}>
        <h1 className="text-5xl font-bold text-white mb-6" style={styles.heading}>{CONTACT_NAME}</h1>

        <div className="flex gap-2.5 mb-3">
          <a href={`sms:${CONTACT_PHONE}`} className={styles.iconButton}><MessageCircle className="w-5 h-5 text-white" /></a>
          <a href={`tel:${CONTACT_PHONE}`} className={styles.iconButton}><Phone className="w-5 h-5 text-white" /></a>
          <a href={`facetime:${CONTACT_PHONE}`} className={styles.iconButton}><Video className="w-5 h-5 text-white" /></a>
          <a href={`mailto:${CONTACT_EMAIL}`} className={styles.iconButton}><Mail className="w-5 h-5 text-white" /></a>
        </div>

        <div className="w-full space-y-2.5 px-5 pt-3">
          <div className={`${styles.bubble} flex items-center justify-between hover:bg-[#333331] transition-colors`}>
            <div className="flex items-center gap-2.5">
              <Image src={images.logo.dark} alt={CONTACT_NAME} width={40} height={40} className="rounded-full bg-white" />
              <span className={styles.actionText}>{strings.home.contactCard.contactPhotoPoster}</span>
            </div>
            <ChevronRight className="w-4 h-4 text-white/70" />
          </div>

          <div className={`${styles.bubble} space-y-2.5 text-left`}>
            <p className={styles.label}>{strings.home.contactCard.mobile}</p>
            <p className={styles.value}>{CONTACT_PHONE}</p>
            <p className={`${styles.label} ${styles.divider}`}>{strings.home.contactCard.notes}</p>
          </div>

          <div className={`${styles.bubble} space-y-2.5 text-left`}>
            <button onClick={onSaveContact} className={`w-full text-left ${styles.actionHover} ${styles.actionText}`}>
              {strings.home.contactCard.saveContact}
            </button>
            <button onClick={onSaveContact} className={`w-full text-left ${styles.actionHover} ${styles.actionText} ${styles.divider}`}>
              {strings.home.contactCard.shareContact}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
