import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"

export default async function Home() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login")
  }

  // Check if user has completed onboarding
  const { data: profile } = await supabase
    .from('profiles')
    .select('onboarding_completed')
    .eq('id', user.id)
    .maybeSingle()

  if (!profile?.onboarding_completed) {
    // User hasn't completed onboarding, redirect to onboarding
    redirect("/onboarding")
  }

  // User is onboarded, redirect to download page
  redirect("/download")
}
