"use client"

import * as React from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Image from "next/image"
import { createClient } from "@/lib/supabase/browser"
import { typography } from "@/lib/typography"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { CheckCircle2, XCircle, Calendar, Mail, Phone, Download, X } from "lucide-react"

export default function HomePage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()
  const [loading, setLoading] = React.useState(true)
  const [user, setUser] = React.useState<any>(null)
  const [profile, setProfile] = React.useState<any>(null)
  const [showContactCard, setShowContactCard] = React.useState(false)

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
      {/* Contact Card Modal */}
      {showContactCard && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-8 z-50">
          <div className="relative bg-white rounded-3xl p-8 max-w-sm w-full">
            {/* Close button */}
            <button
              onClick={() => setShowContactCard(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
            >
              <X className="w-6 h-6" />
            </button>

            {/* Contact Card */}
            <div className="flex flex-col items-center space-y-6">
              {/* Avatar */}
              <div className="relative w-32 h-32 rounded-full border-2 border-black flex items-center justify-center overflow-hidden bg-white">
                <Image
                  src="/righthandlogo.png"
                  alt="Right Hand"
                  width={96}
                  height={96}
                  className="rounded-full"
                />
              </div>

              {/* Name */}
              <h3 className={cn(typography.h3)}>{contactName}</h3>

              {/* Phone Number */}
              <div className="w-full space-y-2">
                <p className={cn(typography.bodySmall, "text-muted-foreground text-center")}>
                  Phone Number
                </p>
                <div className="bg-gray-50 rounded-xl p-4 text-center">
                  <a
                    href={`tel:${contactPhone}`}
                    className={cn(typography.body, "text-foreground font-normal")}
                  >
                    {contactPhone}
                  </a>
                </div>
              </div>

              {/* Save Button */}
              <Button
                onClick={handleSaveContact}
                className="w-full py-6 text-lg"
                size="lg"
              >
                <Download className="w-5 h-5 mr-2" />
                Save Contact
              </Button>
            </div>
          </div>
        </div>
      )}

      <div className="min-h-screen bg-white p-8">
      <div className="max-w-2xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className={cn(typography.h1)}>Welcome to Right Hand</h1>
          <Button variant="outline" onClick={handleLogout}>
            Logout
          </Button>
        </div>

        {/* Profile Card */}
        <div className="bg-white border-2 border-gray-200 rounded-3xl p-8 space-y-6">
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
