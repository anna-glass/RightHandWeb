"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

export default function CreateAccountRedirect() {
  const router = useRouter()

  useEffect(() => {
    router.replace('/login?tab=signup')
  }, [router])

  return null
}
