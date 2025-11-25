/**
 * app/home/utils.ts
 *
 * Author: Anna Glass
 * Created: 11/21/2025
 *
 * Right Hand, 2025. All rights reserved.
 */

import { CONTACT_PHONE, CONTACT_NAME } from "@/lib/constants"
import { images } from "@/lib/images"

export async function saveContact() {
  let photoBase64 = ''
  try {
    const response = await fetch(images.contact)
    const blob = await response.blob()
    const reader = new FileReader()
    photoBase64 = await new Promise((resolve) => {
      reader.onloadend = () => {
        const base64 = (reader.result as string).split(',')[1]
        resolve(base64)
      }
      reader.readAsDataURL(blob)
    })
  } catch (error) {
    console.error('Error loading contact photo:', error)
  }

  const vCard = `BEGIN:VCARD
VERSION:3.0
PRODID:-//Apple Inc.//macOS 26.1//EN
N:;${CONTACT_NAME};;;
FN:${CONTACT_NAME}
TEL;type=pref:+1 ${CONTACT_PHONE}
${photoBase64 ? `PHOTO;ENCODING=b;TYPE=JPEG:${photoBase64}` : ''}
NOTE:your personal assistant.
END:VCARD`

  const vcardBlob = new Blob([vCard], { type: 'text/vcard' })
  const url = window.URL.createObjectURL(vcardBlob)
  const link = document.createElement('a')
  link.href = url
  link.download = `${CONTACT_NAME}.vcf`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  window.URL.revokeObjectURL(url)
}
