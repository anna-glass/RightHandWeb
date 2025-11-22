import { CONTACT_PHONE, CONTACT_NAME } from "@/lib/constants"
import { images } from "@/lib/images"

export async function saveContact() {
  let photoBase64 = ''
  try {
    const response = await fetch(images.logo.dark)
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
FN:${CONTACT_NAME}
N:;${CONTACT_NAME};;;
ORG:${CONTACT_NAME}
TEL;TYPE=CELL:${CONTACT_PHONE}${photoBase64 ? `
PHOTO;ENCODING=b;TYPE=PNG:${photoBase64}` : ''}
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
