"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { typography } from "@/lib/typography"
import { cn } from "@/lib/utils"
import { createClient } from "@/lib/supabase/browser"
import { AudioLines } from "lucide-react"

function LoadingDots() {
  return (
    <span className="inline-flex gap-1">
      <span className="animate-bounce" style={{ animationDelay: '0ms' }}>.</span>
      <span className="animate-bounce" style={{ animationDelay: '150ms' }}>.</span>
      <span className="animate-bounce" style={{ animationDelay: '300ms' }}>.</span>
    </span>
  )
}

export default function OnboardingPage() {
  const router = useRouter()
  const supabase = createClient()
  const [currentStep, setCurrentStep] = React.useState(0)
  const [loading, setLoading] = React.useState(false)
  const [checkingOnboarding, setCheckingOnboarding] = React.useState(true)

  // Form state
  const [typicalWeek, setTypicalWeek] = React.useState("")
  const [calendarConnected, setCalendarConnected] = React.useState(false)
  const [addresses, setAddresses] = React.useState({
    home: "",
    work: "",
    frequentBusinesses: ""
  })

  // Voice recording state
  const [isRecording, setIsRecording] = React.useState(false)
  const [mediaRecorder, setMediaRecorder] = React.useState<MediaRecorder | null>(null)
  const [transcribing, setTranscribing] = React.useState(false)
  const [transcribed, setTranscribed] = React.useState(false)


  const startRecording = async () => {
    try {
      setTranscribed(false) // Reset transcribed state when starting new recording
      setTypicalWeek("") // Clear previous transcription when re-recording
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const recorder = new MediaRecorder(stream)
      const audioChunks: Blob[] = []

      recorder.ondataavailable = (event) => {
        audioChunks.push(event.data)
      }

      recorder.onstop = async () => {
        const audioBlob = new Blob(audioChunks, { type: 'audio/webm' })
        stream.getTracks().forEach(track => track.stop())
        await transcribeAudio(audioBlob)
      }

      recorder.start()
      setMediaRecorder(recorder)
      setIsRecording(true)
    } catch (err) {
      console.error('Error accessing microphone:', err)
      alert('Could not access microphone. Please check your permissions.')
    }
  }

  const stopRecording = () => {
    if (mediaRecorder && isRecording) {
      mediaRecorder.stop()
      setIsRecording(false)
    }
  }

  const transcribeAudio = async (audioBlob: Blob) => {
    setTranscribing(true)
    try {
      const formData = new FormData()
      formData.append('audio', audioBlob, 'recording.webm')

      const response = await fetch('/api/transcribe', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        throw new Error('Transcription failed')
      }

      const { text } = await response.json()
      setTypicalWeek(text)
      setTranscribed(true)
    } catch (err) {
      console.error('Transcription error:', err)
      alert('Failed to transcribe audio. Please try typing instead.')
    } finally {
      setTranscribing(false)
    }
  }

  const handleConnectCalendar = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          scopes: 'https://www.googleapis.com/auth/calendar.readonly',
          redirectTo: `${window.location.origin}/onboarding?calendar=true`,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      })

      if (error) throw error
    } catch (err) {
      console.error('Calendar connection error:', err)
      alert('Failed to connect Google Calendar. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  // Check if onboarding is already completed
  React.useEffect(() => {
    const checkOnboardingStatus = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
          setCheckingOnboarding(false)
          return
        }

        const { data: profile } = await supabase
          .from('profiles')
          .select('onboarding_completed')
          .eq('id', user.id)
          .single()

        if (profile?.onboarding_completed) {
          // Already completed onboarding, redirect to welcome
          router.push('/welcome')
          return
        }

        setCheckingOnboarding(false)
      } catch (err) {
        console.error('Error checking onboarding status:', err)
        setCheckingOnboarding(false)
      }
    }
    checkOnboardingStatus()
  }, [])

  // Check if returning from Google OAuth
  React.useEffect(() => {
    const checkCalendarConnection = async () => {
      const urlParams = new URLSearchParams(window.location.search)
      if (urlParams.get('calendar') === 'true') {
        const { data: { session } } = await supabase.auth.getSession()
        if (session?.provider_token) {
          setCalendarConnected(true)
          // Set to calendar step (index 2)
          setCurrentStep(2)
          // Remove the query param from URL
          window.history.replaceState({}, '', '/onboarding')
        }
      }
    }
    checkCalendarConnection()
  }, [])

  const steps = [
    {
      title: "Welcome to Right Hand!",
      content: (
        <div className="space-y-4">
          <p className="text-lg text-muted-foreground">
            I'm Anna, the first (and only) personal assistant behind Right Hand - so whenever you send a message,
            I'll be the one making sure it gets done! Over time, I'll get to know you and how to do tasks exactly
            how you would do them - and your responses during the onboarding give me a head start.
          </p>
        </div>
      )
    },
    {
      title: "First, let's get to know you.",
      content: (
        <div className="space-y-6">
          <p className="text-lg text-muted-foreground">
            Can you walk me through a typical week in your life? You can make this as brief or as lengthy as you'd like,
            it's just helpful to know the kinds of things you get up to and the tasks that tend to come up.
          </p>
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Button
                type="button"
                onClick={isRecording ? stopRecording : startRecording}
                disabled={transcribing}
                variant={isRecording ? "default" : "outline"}
              >
                <AudioLines className="mr-2 h-4 w-4" />
                {isRecording ? "Stop Recording" : transcribed ? "Re-record" : "Voice to Text"}
              </Button>
              <span className="text-muted-foreground">(or type)</span>
            </div>
            {!isRecording && (
              <div className="space-y-2">
                <div className="relative">
                  <Textarea
                    placeholder="Your typical week..."
                    value={transcribing ? "" : typicalWeek}
                    onChange={(e) => setTypicalWeek(e.target.value)}
                    className="min-h-[150px] bg-white"
                    disabled={transcribing}
                  />
                  {transcribing && (
                    <div className="absolute inset-0 flex items-center justify-center bg-white/80">
                      <p className="text-lg text-muted-foreground flex items-center gap-1">
                        Processing<LoadingDots />
                      </p>
                    </div>
                  )}
                </div>
                {transcribed && !transcribing && (
                  <p className="text-sm text-muted-foreground">
                    Feel free to edit anything here.
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      )
    },
    {
      title: "Now, let's connect your calendar.",
      content: (
        <div className="space-y-4">
          <p className="text-lg text-muted-foreground mb-4">
            Calendars help with birthdays, booking appointments that work with your schedule,
            and not bugging you when you're busy.
          </p>
          {!calendarConnected ? (
            <div className="space-y-4">
              <Button
                onClick={handleConnectCalendar}
                disabled={loading}
              >
                {loading ? "Connecting..." : "Connect Google Calendar"}
              </Button>
              <p className="text-lg text-muted-foreground">
                If you don't use Google Calendar, I'll just ask for dates & times that work for you when creating bookings or reservations.
              </p>
            </div>
          ) : (
            <div className="p-4 bg-green-500/10 rounded-lg border border-green-500/20">
              <p className={cn(typography.body, "text-green-600")}>
                ✓ Google Calendar connected successfully!
              </p>
            </div>
          )}
        </div>
      )
    },
    {
      title: "Finally, let's create your address book.",
      content: (
        <div className="space-y-4">
          <p className="text-lg text-muted-foreground mb-4">
            You can add to this over time, but I recommend starting with your home address, work address,
            and any businesses you frequent. If a task comes up at a business outside of what you specified,
            I can just make a recommendation.
          </p>
          <div className="space-y-3">
            <Input
              type="text"
              placeholder="Home Address"
              value={addresses.home}
              onChange={(e) => setAddresses({...addresses, home: e.target.value})}
            />
            <Input
              type="text"
              placeholder="Work Address"
              value={addresses.work}
              onChange={(e) => setAddresses({...addresses, work: e.target.value})}
            />
            <Textarea
              placeholder="Frequent Businesses - Just list out any doctors, spas, gyms, etc. I'll know what you mean."
              value={addresses.frequentBusinesses}
              onChange={(e) => setAddresses({...addresses, frequentBusinesses: e.target.value})}
              className="min-h-[100px]"
            />
          </div>
        </div>
      )
    }
  ]

  const handleNext = async () => {
    if (currentStep === steps.length - 1) {
      // Final step - save and redirect
      await handleComplete()
    } else {
      setCurrentStep(currentStep + 1)
    }
  }

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
    }
  }

  const handleComplete = async () => {
    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      const { data: { session } } = await supabase.auth.getSession()

      if (!user) {
        throw new Error('Not authenticated')
      }

      // Save onboarding responses to database
      const { error: onboardingError } = await supabase
        .from('onboarding_responses')
        .insert({
          user_id: user.id,
          typical_week: typicalWeek,
          calendar_connected: calendarConnected,
          home_address: addresses.home,
          work_address: addresses.work,
          frequent_businesses: addresses.frequentBusinesses,
          completed_at: new Date().toISOString()
        })

      if (onboardingError) throw onboardingError

      // Update profile with Google Calendar tokens if connected and mark onboarding as completed
      const profileUpdate: any = {
        onboarding_completed: true,
        updated_at: new Date().toISOString()
      }

      if (calendarConnected && session?.provider_token) {
        profileUpdate.google_calendar_token = session.provider_token
        profileUpdate.google_refresh_token = session.provider_refresh_token
      }

      const { error: profileError } = await supabase
        .from('profiles')
        .update(profileUpdate)
        .eq('id', user.id)

      if (profileError) throw profileError

      // Redirect to welcome page
      router.push('/welcome')
    } catch (err: any) {
      console.error('Failed to save onboarding:', err)
      alert('Failed to save onboarding responses. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const canProceed = () => {
    switch (currentStep) {
      case 2:
        // Calendar step - can skip
        return true
      case 3:
        // Address step - all optional
        return true
      default:
        return true
    }
  }

  if (checkingOnboarding) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="w-full max-w-md bg-sidebar/95 backdrop-blur-sm rounded-lg p-8 text-center">
          <p className={cn(typography.body, "text-muted-foreground")}>
            Loading...
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center p-4 overflow-hidden">
      {/* Image Background */}
      <div
        className="absolute inset-0 w-full h-full bg-cover bg-center"
        style={{ backgroundImage: 'url(/background.png)' }}
      />

      {/* Dark Overlay */}
      <div className="absolute inset-0 bg-black/60" />

      {/* Content */}
      <div className="relative z-10 w-full max-w-2xl bg-sidebar/95 backdrop-blur-sm rounded-lg p-8 space-y-8 shadow-lg">
        <div className="h-[500px] overflow-y-auto">
          <h2 className={cn(typography.h3, "mb-6")}>
            {steps[currentStep].title}
          </h2>
          {steps[currentStep].content}
        </div>

        <div className="flex justify-between items-center gap-4">
          <Button
            variant="outline"
            onClick={handleBack}
            disabled={currentStep === 0}
            className="w-32"
          >
            Back
          </Button>
          <div className="flex justify-center gap-2">
            {steps.map((_, index) => (
              <div
                key={index}
                className={cn(
                  "h-2 rounded-full transition-all",
                  index === currentStep ? "w-8 bg-primary" : "w-2 bg-gray-300"
                )}
              />
            ))}
          </div>
          <Button
            onClick={handleNext}
            disabled={!canProceed() || loading}
            className="w-32"
          >
            {loading ? "Saving..." : currentStep === steps.length - 1 ? "Finish" : "Next"}
          </Button>
        </div>
      </div>
    </div>
  )
}
