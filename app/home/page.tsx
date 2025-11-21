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

  const handleSaveContact = () => {
    // Create vCard
    const vCard = `BEGIN:VCARD
VERSION:3.0
FN:${contactName}
TEL;TYPE=CELL:${contactPhone}
END:VCARD`

    // Create blob and download
    const blob = new Blob([vCard], { type: 'text/vcard' })
    const url = window.URL.createObjectURL(blob)
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
          <div className="bg-white text-black px-8 py-4 rounded-full shadow-lg border-2 border-gray-200">
            <p className="text-sm font-medium">Save Right Hand&apos;s contact to get started!</p>
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
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-8 z-50">
          <div className="relative bg-white rounded-[40px] p-8 max-w-md w-full h-[700px] overflow-auto bg-cover bg-center bg-no-repeat" style={{ backgroundImage: 'url(/contactbackground.png)' }}>
            {/* Contact Card */}
            <div className="flex flex-col items-center h-full justify-between">
              {/* Avatar at top */}
              <div className="relative w-48 h-48 rounded-full flex items-center justify-center overflow-hidden bg-white shadow-lg mt-4">
                <Image
                  src="/righthandlogo.png"
                  alt="Right Hand"
                  width={144}
                  height={144}
                  className="rounded-full"
                />
              </div>

              {/* Everything else at bottom */}
              <div className="flex flex-col items-center w-full pb-4">
                {/* Name */}
                <h1 className="text-6xl font-bold text-white mb-8" style={{ fontFamily: 'Nunito, sans-serif' }}>{contactName}</h1>

                {/* Icon Buttons */}
                <div className="flex gap-3 mb-4">
                  <a
                    href={`sms:${contactPhone}`}
                    className="w-12 h-12 rounded-full bg-green-900/30 flex items-center justify-center hover:bg-green-900/40 transition-colors"
                  >
                    <MessageCircle className="w-6 h-6 text-white" />
                  </a>
                  <a
                    href={`tel:${contactPhone}`}
                    className="w-12 h-12 rounded-full bg-green-900/30 flex items-center justify-center hover:bg-green-900/40 transition-colors"
                  >
                    <Phone className="w-6 h-6 text-white" />
                  </a>
                  <a
                    href={`facetime:${contactPhone}`}
                    className="w-12 h-12 rounded-full bg-green-900/30 flex items-center justify-center hover:bg-green-900/40 transition-colors"
                  >
                    <Video className="w-6 h-6 text-white" />
                  </a>
                  <a
                    href={`mailto:contact@getrighthand.com`}
                    className="w-12 h-12 rounded-full bg-green-900/30 flex items-center justify-center hover:bg-green-900/40 transition-colors"
                  >
                    <Mail className="w-6 h-6 text-white" />
                  </a>
                </div>

                {/* Contact Card Bubbles */}
                <div className="w-full space-y-3 px-6 pt-4">
                {/* Contact Photo & Poster */}
                <div className="bg-green-900/30 rounded-3xl p-4 flex items-center justify-between hover:bg-green-900/40 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center overflow-hidden">
                      <Image
                        src="/righthandlogo.png"
                        alt="Right Hand"
                        width={48}
                        height={48}
                        className="rounded-full"
                      />
                    </div>
                    <span className="text-white font-bold">Contact Photo & Poster</span>
                  </div>
                  <ChevronRight className="w-5 h-5 text-white/70" />
                </div>

                {/* Phone & Notes */}
                <div className="bg-green-900/30 rounded-3xl p-4">
                  <div className="space-y-3 text-left">
                    <div>
                      <p className="text-white font-bold text-sm">mobile</p>
                      <p className="text-white">{contactPhone}</p>
                    </div>
                    <div className="border-t border-white/20 pt-3 pb-6">
                      <p className="text-white font-bold text-sm">Notes</p>
                    </div>
                  </div>
                </div>

                {/* Save Contact & Share Contact */}
                <div className="bg-green-900/30 rounded-3xl p-4">
                  <div className="space-y-3 text-left">
                    <button
                      onClick={handleSaveContact}
                      className="w-full text-left hover:opacity-80 transition-opacity"
                    >
                      <p className="text-white font-bold">Save Contact</p>
                    </button>
                    <div className="border-t border-white/20 pt-3">
                      <button
                        onClick={handleSaveContact}
                        className="w-full text-left hover:opacity-80 transition-opacity"
                      >
                        <p className="text-white font-bold">Share Contact</p>
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

      <div className="relative min-h-screen p-8 bg-cover bg-center bg-no-repeat" style={{ backgroundImage: 'url(/homebackground.png)' }}>
        {/* Dark overlay - hide when contact card is open */}
        {!showContactCard && <div className="absolute inset-0 bg-black/50 z-0"></div>}

        <div className="relative max-w-md mx-auto z-10 flex items-center justify-center min-h-screen">
        {/* Profile Card */}
        <div className="bg-[#222221] rounded-[40px] p-8 space-y-6 h-[700px] overflow-auto w-full">
          {/* Mac Window Controls */}
          <div className="flex items-center gap-2.5 mt-0 ml-0 mb-4">
            <button className="w-4 h-4 rounded-full bg-red-500 hover:bg-red-600 transition-colors" title="Close" />
            <button className="w-4 h-4 rounded-full bg-yellow-500 hover:bg-yellow-600 transition-colors" title="Minimize" />
            <button className="w-4 h-4 rounded-full bg-green-500 hover:bg-green-600 transition-colors" title="Maximize" />
          </div>

          {/* Avatar and Name - Centered */}
          <div className="flex flex-col items-center space-y-4">
            {profile?.avatar_url ? (
              <Image
                src={profile.avatar_url}
                alt={profile.first_name ? `${profile.first_name} ${profile.last_name}` : 'User'}
                width={128}
                height={128}
                className="w-32 h-32 rounded-full"
              />
            ) : (
              <div className="w-32 h-32 rounded-full bg-gray-200 flex items-center justify-center">
                {profile?.first_name && profile?.last_name ? (
                  <span className="text-4xl font-medium text-gray-600">
                    {profile.first_name[0]}{profile.last_name[0]}
                  </span>
                ) : (
                  <span className="text-4xl font-medium text-gray-600">?</span>
                )}
              </div>
            )}

            <h2 className="text-4xl font-bold text-white" style={{ fontFamily: 'Nunito, sans-serif' }}>
              {profile?.first_name && profile?.last_name
                ? `${profile.first_name} ${profile.last_name}`
                : 'User'}
            </h2>
          </div>

          {/* Contact Details - Bubbles */}
          <div className="space-y-3 pt-4">
            {/* Email Bubble */}
            {profile?.email && (
              <div className="bg-[#292927] rounded-3xl p-4">
                <div className="space-y-1">
                  <p className="text-white font-bold text-sm">email</p>
                  <p className="text-white">{profile.email}</p>
                </div>
              </div>
            )}

            {/* Phone Bubble */}
            {profile?.phone_number && (
              <div className="bg-[#292927] rounded-3xl p-4">
                <div className="space-y-1">
                  <p className="text-white font-bold text-sm">mobile</p>
                  <p className="text-white">{profile.phone_number}</p>
                </div>
              </div>
            )}

            {/* Actions Bubble - Logout & Update Permissions & Support */}
            <div className="bg-[#292927] rounded-3xl p-4">
              <div className="space-y-3 text-left">
                <button
                  onClick={handleLogout}
                  className="w-full text-left hover:opacity-80 transition-opacity"
                >
                  <p className="text-white font-bold">Logout</p>
                </button>
                <div className="border-t border-white/10 pt-3">
                  <a
                    href="https://myaccount.google.com/connections?filters=3,4&hl=en"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full block text-left hover:opacity-80 transition-opacity"
                  >
                    <p className="text-white font-bold">Update Permissions</p>
                  </a>
                </div>
                <div className="border-t border-white/10 pt-3">
                  <a
                    href="mailto:anna@getrighthand.com"
                    className="w-full block text-left hover:opacity-80 transition-opacity"
                  >
                    <p className="text-white font-bold">Support</p>
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
