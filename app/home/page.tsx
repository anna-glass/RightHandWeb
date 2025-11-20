"use client"

import * as React from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Image from "next/image"
import { createClient } from "@/lib/supabase/browser"
import { typography } from "@/lib/typography"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { CheckCircle2, XCircle, Calendar, Mail, Phone, Download, X, MessageCircle, Video, ChevronRight } from "lucide-react"

export default function HomePage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()
  const [loading, setLoading] = React.useState(true)
  const [user, setUser] = React.useState<any>(null)
  const [profile, setProfile] = React.useState<any>(null)
  const [showContactCard, setShowContactCard] = React.useState(false)
  const [showToast, setShowToast] = React.useState(false)
  const [isToastDismissing, setIsToastDismissing] = React.useState(false)

  // Contact info
  const contactPhone = "858-815-0020"
  const contactName = "Right Hand"

  React.useEffect(() => {
    const loadUserData = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
          router.push('/login')
          return
        }

        setUser(user)

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

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <p className={cn(typography.body, "text-muted-foreground")}>Loading...</p>
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
            <p className="text-sm font-medium">Save Right Hand's contact to get started!</p>
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
          <div className="relative bg-white rounded-3xl p-8 max-w-lg w-full h-[800px] overflow-auto bg-cover bg-center bg-no-repeat" style={{ backgroundImage: 'url(/contactbackground.png)' }}>
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
                <div className="bg-green-900/30 rounded-2xl p-4 flex items-center justify-between hover:bg-green-900/40 transition-colors">
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
                <div className="bg-green-900/30 rounded-2xl p-4">
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
                <div className="bg-green-900/30 rounded-2xl p-4">
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

      <div className="min-h-screen p-8 bg-cover bg-center bg-no-repeat" style={{ backgroundImage: 'url(/homebackground.png)' }}>
      <div className="max-w-xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-center justify-end">
          <Button variant="outline" onClick={handleLogout}>
            Logout
          </Button>
        </div>

        {/* Profile Card */}
        <div className="bg-white border-2 border-gray-200 rounded-3xl p-8 space-y-6 h-[800px] overflow-auto">
          {/* Avatar and Name */}
          <div className="flex items-center space-x-6">
            {profile?.avatar_url ? (
              <img
                src={profile.avatar_url}
                alt={profile.first_name ? `${profile.first_name} ${profile.last_name}` : 'User'}
                className="w-24 h-24 rounded-full border-2 border-gray-200"
              />
            ) : (
              <div className="w-24 h-24 rounded-full bg-gray-200 flex items-center justify-center">
                {profile?.first_name && profile?.last_name ? (
                  <span className="text-3xl font-medium text-gray-600">
                    {profile.first_name[0]}{profile.last_name[0]}
                  </span>
                ) : (
                  <span className="text-3xl font-medium text-gray-600">?</span>
                )}
              </div>
            )}

            <div>
              <h2 className={cn(typography.h2)}>
                {profile?.first_name && profile?.last_name
                  ? `${profile.first_name} ${profile.last_name}`
                  : 'User'}
              </h2>
              {profile?.verified && (
                <div className="flex items-center gap-2 text-green-600 mt-2">
                  <CheckCircle2 className="w-5 h-5" />
                  <span className={cn(typography.bodySmall)}>Verified</span>
                </div>
              )}
            </div>
          </div>

          {/* Contact Details */}
          <div className="space-y-4 pt-4 border-t border-gray-200">
            {/* Email */}
            {profile?.email && (
              <div className="flex items-center space-x-3">
                <Mail className="w-5 h-5 text-gray-500" />
                <span className={cn(typography.body, "text-gray-700")}>
                  {profile.email}
                </span>
              </div>
            )}

            {/* Phone */}
            {profile?.phone_number && (
              <div className="flex items-center space-x-3">
                <Phone className="w-5 h-5 text-gray-500" />
                <span className={cn(typography.body, "text-gray-700")}>
                  {profile.phone_number}
                </span>
              </div>
            )}
          </div>

          {/* Integrations */}
          <div className="space-y-4 pt-4 border-t border-gray-200">
            <h3 className={cn(typography.h4)}>Integrations</h3>

            {/* Google Calendar */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Calendar className="w-5 h-5 text-gray-500" />
                <span className={cn(typography.body)}>Google Calendar</span>
              </div>
              {profile?.google_calendar_token ? (
                <div className="flex items-center gap-2 text-green-600">
                  <CheckCircle2 className="w-5 h-5" />
                  <span className={cn(typography.bodySmall)}>Connected</span>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-gray-400">
                  <XCircle className="w-5 h-5" />
                  <span className={cn(typography.bodySmall)}>Not connected</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Instructions */}
        <div className="bg-gray-50 rounded-2xl p-6 space-y-4">
          <h3 className={cn(typography.h4)}>How to use Right Hand</h3>
          <ol className="list-decimal list-inside space-y-2">
            <li className={cn(typography.body, "text-gray-700")}>
              Save the Right Hand contact to your phone
            </li>
            <li className={cn(typography.body, "text-gray-700")}>
              Send a text message to Right Hand (858-815-0020)
            </li>
            <li className={cn(typography.body, "text-gray-700")}>
              Your Right Hand will help manage your calendar and emails
            </li>
          </ol>
        </div>
      </div>
    </div>
    </>
  )
}
