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
import type { Database } from "@/lib/supabase/types"

type UserRole = Database['public']['Enums']['user_role']

export function InviteUserPopover() {
  const [open, setOpen] = React.useState(false)
  const [email, setEmail] = React.useState("")
  const [role, setRole] = React.useState<UserRole>("member")
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [success, setSuccess] = React.useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setSuccess(false)

    try {
      const result = await inviteUser(email, role)

      if (!result.success) {
        setError(result.error || "Failed to invite user")
        return
      }

      setSuccess(true)
      setEmail("")
      setRole("member")

      // Close the popover after a short delay to show success message
      setTimeout(() => {
        setOpen(false)
        setSuccess(false)
      }, 1500)
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred")
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
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <h3 className={cn(typography.bodySmall, "font-semibold mb-1")}>Invite New Member</h3>
            <p className={cn(typography.caption, "text-muted-foreground")}>
              Send an invitation email to a new member.
            </p>
          </div>

          <div className="space-y-3">
            <div className="space-y-1.5">
              <label htmlFor="email" className={cn(typography.label, "text-xs")}>
                Email Address
              </label>
              <Input
                id="email"
                type="email"
                placeholder="user@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
                className="h-9"
              />
            </div>

            <div className="space-y-1.5">
              <label className={cn(typography.label, "text-xs")}>
                Role
              </label>
              <div className="space-y-2">
                <label className="flex items-start gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="role"
                    value="member"
                    checked={role === "member"}
                    onChange={(e) => setRole(e.target.value as UserRole)}
                    disabled={loading}
                    className="w-4 h-4 mt-0.5"
                  />
                  <div className="flex-1">
                    <div className={cn(typography.caption, "font-medium")}>Member</div>
                    <div className={cn(typography.caption, "text-muted-foreground text-xs")}>
                      Access to mobile app
                    </div>
                  </div>
                </label>

                <label className="flex items-start gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="role"
                    value="righthand"
                    checked={role === "righthand"}
                    onChange={(e) => setRole(e.target.value as UserRole)}
                    disabled={loading}
                    className="w-4 h-4 mt-0.5"
                  />
                  <div className="flex-1">
                    <div className={cn(typography.caption, "font-medium")}>Right Hand</div>
                    <div className={cn(typography.caption, "text-muted-foreground text-xs")}>
                      Dashboard admin
                    </div>
                  </div>
                </label>
              </div>
            </div>

            {error && (
              <div className="text-destructive text-xs p-2 bg-destructive/10 rounded-md">
                {error}
              </div>
            )}

            {success && (
              <div className="text-green-600 text-xs p-2 bg-green-600/10 rounded-md">
                Invitation sent!
              </div>
            )}
          </div>

          <Button type="submit" disabled={loading} className="w-full h-9">
            {loading ? "Sending..." : "Send Invitation"}
          </Button>
        </form>
      </PopoverContent>
    </Popover>
  )
}
