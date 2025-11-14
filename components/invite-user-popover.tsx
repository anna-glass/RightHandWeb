"use client"

import * as React from "react"
import { UserPlus } from "lucide-react"
import { typography } from "@/lib/typography"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { inviteUser } from "@/app/actions/invite-user"

export function InviteUserPopover() {
  const [open, setOpen] = React.useState(false)
  const [email, setEmail] = React.useState("")
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [success, setSuccess] = React.useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setSuccess(false)

    try {
      const result = await inviteUser(email)

      if (!result.success) {
        setError(result.error || "Failed to invite user")
        return
      }

      setSuccess(true)
      setEmail("")

      // Close the popover after a short delay to show success message
      setTimeout(() => {
        setOpen(false)
        setSuccess(false)
      }, 1500)
    } catch (err: any) {
      setError(err.message || "Unexpected error occurred")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button>
          Invite Member
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80" align="end">
        <form onSubmit={handleSubmit} className="space-y-3">
          <Input
            id="email"
            type="text"
            placeholder="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            disabled={loading}
            autoComplete="off"
            autoCorrect="off"
            spellCheck="false"
          />

          <Button type="submit" disabled={loading} className="w-full">
            {loading ? "Sending..." : "Send Invitation"}
          </Button>
        </form>
      </PopoverContent>
    </Popover>
  )
}
