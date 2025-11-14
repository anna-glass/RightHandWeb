import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"

export default async function Home() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (user) {
    // Check if user is a righthand
    const { data: righthand } = await supabase
      .from('righthands')
      .select('id')
      .eq('id', user.id)
      .maybeSingle()

    if (righthand) {
      // User is a righthand, redirect to admin portal
      redirect("/chats")
    } else {
      // User is a member, redirect to welcome/app download page
      redirect("/welcome")
    }
  } else {
    redirect("/login")
  }
}
