"use client"

import * as React from "react"
import { Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Image from "next/image"
import { createClient } from "@/lib/supabase/browser"
import { Mail, Phone, MessageCircle, Video, ChevronRight } from "lucide-react"
import { SyncLoader } from "react-spinners"

function HomePageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()
  const [loading, setLoading] = React.useState(true)
  const [imageLoaded, setImageLoaded] = React.useState(false)
  const [profile, setProfile] = React.useState<{
    id: string
    email?: string | null
    phone_number?: string | null
    first_name?: string | null
    last_name?: string | null
    avatar_url?: string | null
  } | null>(null)
  const [showContactCard, setShowContactCard] = React.useState(false)
  const [showToast, setShowToast] = React.useState(false)
  const [isToastDismissing, setIsToastDismissing] = React.useState(false)

  // Contact info
  const contactPhone = "858-815-0020"
  const contactName = "Right Hand"

  // Preload background image
  React.useEffect(() => {
    const img = new window.Image()
    img.src = '/homebackground.png'
    img.onload = () => setImageLoaded(true)
    img.onerror = () => setImageLoaded(true) // Still show content if image fails
  }, [])

  React.useEffect(() => {
    const loadUserData = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
          router.push('/signin')
          return
        }

        // Load profile
        const { data: profileData } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single()

        setProfile(profileData)

        // Check if coming from onboarding
        if (searchParams.get('onboarding') === 'complete') {
          setShowContactCard(true)
          setTimeout(() => {
            setShowToast(true)
            setTimeout(() => {
              setIsToastDismissing(true)
              setTimeout(() => {
                setShowToast(false)
                setIsToastDismissing(false)
              }, 300)
            }, 5000)
          }, 2000)
        }
      } catch (error) {
        console.error('Error loading user data:', error)
      } finally {
        setLoading(false)
      }
    }

    loadUserData()
  }, [supabase, router, searchParams])

  const handleSaveContact = async () => {
    // Fetch and encode the logo as base64
    let photoBase64 = ''
    try {
      const response = await fetch('/righthandlogo.png')
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

    // Create vCard with proper name formatting and photo
    // N: format is LastName;FirstName;MiddleName;Prefix;Suffix
    // Using empty LastName keeps "Right Hand" together as first name
    const vCard = `BEGIN:VCARD
VERSION:3.0
FN:${contactName}
N:;${contactName};;;
ORG:${contactName}
TEL;TYPE=CELL:${contactPhone}${photoBase64 ? `
PHOTO;ENCODING=b;TYPE=PNG:${photoBase64}` : ''}
END:VCARD`

    // Create blob and download
    const vcardBlob = new Blob([vCard], { type: 'text/vcard' })
    const url = window.URL.createObjectURL(vcardBlob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${contactName}.vcf`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(url)

    // Close modal
    setShowContactCard(false)
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/')
  }


  if (loading || !imageLoaded) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black">
        <SyncLoader color="#ffffff" size={10} />
      </div>
    )
  }

  return (
    <>
      {/* Toast Notification */}
      {showToast && (
        <div
          className={`fixed top-4 left-1/2 transform -translate-x-1/2 z-[60] transition-all duration-300 ${
            isToastDismissing
              ? '-translate-y-20 opacity-0'
              : 'translate-y-0 opacity-100'
          }`}
          style={{
            animation: isToastDismissing ? 'none' : 'slideDownSpring 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)'
          }}
        >
          <div className="bg-white text-black px-6 py-3 rounded-full shadow-lg border-2 border-gray-200">
            <p className="text-xs font-medium">Save Right Hand&apos;s contact to get started!</p>
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes slideDownSpring {
          0% {
            transform: translateY(-100px);
            opacity: 0;
          }
          50% {
            transform: translateY(5px);
          }
          100% {
            transform: translateY(0);
            opacity: 1;
          }
        }
      `}</style>

      {/* Contact Card Modal */}
      {showContactCard && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-6 z-50">
          <div className="relative bg-[#222221] rounded-[32px] p-6 max-w-sm w-full h-[600px] overflow-auto">
            {/* Contact Card */}
            <div className="flex flex-col items-center h-full justify-center">
              {/* Content */}
              <div className="flex flex-col items-center w-full pb-3">
                {/* Name */}
                <h1 className="text-5xl font-bold text-white mb-6" style={{ fontFamily: 'Nunito, sans-serif' }}>{contactName}</h1>

                {/* Icon Buttons */}
                <div className="flex gap-2.5 mb-3">
                  <a
                    href={`sms:${contactPhone}`}
                    className="w-10 h-10 rounded-full bg-[#292927] flex items-center justify-center hover:bg-[#333331] transition-colors"
                  >
                    <MessageCircle className="w-5 h-5 text-white" />
                  </a>
                  <a
                    href={`tel:${contactPhone}`}
                    className="w-10 h-10 rounded-full bg-[#292927] flex items-center justify-center hover:bg-[#333331] transition-colors"
                  >
                    <Phone className="w-5 h-5 text-white" />
                  </a>
                  <a
                    href={`facetime:${contactPhone}`}
                    className="w-10 h-10 rounded-full bg-[#292927] flex items-center justify-center hover:bg-[#333331] transition-colors"
                  >
                    <Video className="w-5 h-5 text-white" />
                  </a>
                  <a
                    href={`mailto:contact@getrighthand.com`}
                    className="w-10 h-10 rounded-full bg-[#292927] flex items-center justify-center hover:bg-[#333331] transition-colors"
                  >
                    <Mail className="w-5 h-5 text-white" />
                  </a>
                </div>

                {/* Contact Card Bubbles */}
                <div className="w-full space-y-2.5 px-5 pt-3">
                {/* Contact Photo & Poster */}
                <div className="bg-[#292927] rounded-2xl p-3 flex items-center justify-between hover:bg-[#333331] transition-colors">
                  <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center overflow-hidden">
                      <Image
                        src="/righthandlogo.png"
                        alt="Right Hand"
                        width={40}
                        height={40}
                        className="rounded-full"
                      />
                    </div>
                    <span className="text-white font-bold text-sm">Contact Photo & Poster</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-white/70" />
                </div>

                {/* Phone & Notes */}
                <div className="bg-[#292927] rounded-2xl p-3">
                  <div className="space-y-2.5 text-left">
                    <div>
                      <p className="text-white font-bold text-xs">mobile</p>
                      <p className="text-white text-sm">{contactPhone}</p>
                    </div>
                    <div className="border-t border-white/10 pt-2.5 pb-5">
                      <p className="text-white font-bold text-xs">Notes</p>
                    </div>
                  </div>
                </div>

                {/* Save Contact & Share Contact */}
                <div className="bg-[#292927] rounded-2xl p-3">
                  <div className="space-y-2.5 text-left">
                    <button
                      onClick={handleSaveContact}
                      className="w-full text-left hover:opacity-80 transition-opacity"
                    >
                      <p className="text-white font-bold text-sm">Save Contact</p>
                    </button>
                    <div className="border-t border-white/10 pt-2.5">
                      <button
                        onClick={handleSaveContact}
                        className="w-full text-left hover:opacity-80 transition-opacity"
                      >
                        <p className="text-white font-bold text-sm">Share Contact</p>
                      </button>
                    </div>
                  </div>
                </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="relative min-h-screen p-6 bg-cover bg-center bg-no-repeat" style={{ backgroundImage: 'url(/homebackground.png)' }}>
        {/* Dark overlay - hide when contact card is open */}
        {!showContactCard && <div className="absolute inset-0 bg-black/50 z-0"></div>}

        <div className="relative max-w-sm mx-auto z-10 flex items-center justify-center min-h-screen">
        {/* Profile Card */}
        <div className="bg-[#222221] rounded-[32px] p-6 space-y-5 h-[600px] overflow-auto w-full">
          {/* Mac Window Controls */}
          <div className="flex items-center gap-2 mt-0 ml-0 mb-3">
            <button className="w-3 h-3 rounded-full bg-red-500 hover:bg-red-600 transition-colors" title="Close" />
            <button className="w-3 h-3 rounded-full bg-yellow-500 hover:bg-yellow-600 transition-colors" title="Minimize" />
            <button className="w-3 h-3 rounded-full bg-green-500 hover:bg-green-600 transition-colors" title="Maximize" />
          </div>

          {/* Avatar and Name - Centered */}
          <div className="flex flex-col items-center space-y-3">
            {profile?.avatar_url ? (
              <Image
                src={profile.avatar_url}
                alt={profile.first_name ? `${profile.first_name} ${profile.last_name}` : 'User'}
                width={112}
                height={112}
                className="w-28 h-28 rounded-full"
              />
            ) : (
              <div className="w-28 h-28 rounded-full bg-gray-200 flex items-center justify-center">
                {profile?.first_name && profile?.last_name ? (
                  <span className="text-3xl font-medium text-gray-600">
                    {profile.first_name[0]}{profile.last_name[0]}
                  </span>
                ) : (
                  <span className="text-3xl font-medium text-gray-600">?</span>
                )}
              </div>
            )}

            <h2 className="text-3xl font-bold text-white" style={{ fontFamily: 'Nunito, sans-serif' }}>
              {profile?.first_name && profile?.last_name
                ? `${profile.first_name} ${profile.last_name}`
                : 'User'}
            </h2>
          </div>

          {/* Contact Details - Bubbles */}
          <div className="space-y-2.5 pt-3">
            {/* Email Bubble */}
            {profile?.email && (
              <div className="bg-[#292927] rounded-2xl p-3">
                <div className="space-y-0.5">
                  <p className="text-white font-bold text-xs">email</p>
                  <p className="text-white text-sm">{profile.email}</p>
                </div>
              </div>
            )}

            {/* Phone Bubble */}
            {profile?.phone_number && (
              <div className="bg-[#292927] rounded-2xl p-3">
                <div className="space-y-0.5">
                  <p className="text-white font-bold text-xs">mobile</p>
                  <p className="text-white text-sm">{profile.phone_number}</p>
                </div>
              </div>
            )}

            {/* Actions Bubble - Logout & Update Permissions & Support */}
            <div className="bg-[#292927] rounded-2xl p-3">
              <div className="space-y-2.5 text-left">
                <button
                  onClick={handleLogout}
                  className="w-full text-left hover:opacity-80 transition-opacity"
                >
                  <p className="text-white font-bold text-sm">Logout</p>
                </button>
                <div className="border-t border-white/10 pt-2.5">
                  <a
                    href="https://myaccount.google.com/connections?filters=3,4&hl=en"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full block text-left hover:opacity-80 transition-opacity"
                  >
                    <p className="text-white font-bold text-sm">Update Permissions</p>
                  </a>
                </div>
                <div className="border-t border-white/10 pt-2.5">
                  <a
                    href="mailto:anna@getrighthand.com"
                    className="w-full block text-left hover:opacity-80 transition-opacity"
                  >
                    <p className="text-white font-bold text-sm">Support</p>
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    </>
  )
}

export default function HomePage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center bg-black">
        <SyncLoader color="#ffffff" size={10} />
      </div>
    }>
      <HomePageContent />
    </Suspense>
  )
}
