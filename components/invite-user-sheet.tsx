"use client"

import * as React from "react"
import { UserPlus } from "lucide-react"
import { typography } from "@/lib/typography"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { inviteUser } from "@/app/actions/invite-user"
import type { Database } from "@/lib/supabase/types"

type UserRole = Database['public']['Enums']['user_role']

export function InviteUserSheet() {
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

      // Close the sheet after a short delay to show success message
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
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button className="gap-2">
          <UserPlus className="h-4 w-4" />
          Invite User
        </Button>
      </SheetTrigger>
      <SheetContent>
        <form onSubmit={handleSubmit}>
          <SheetHeader>
            <SheetTitle>Invite New User</SheetTitle>
            <SheetDescription>
              Send an invitation email to a new user. They will receive a link to create their account.
            </SheetDescription>
          </SheetHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label htmlFor="email" className={cn(typography.label)}>
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
              />
            </div>

            <div className="space-y-2">
              <label className={cn(typography.label)}>
                Role
              </label>
              <div className="space-y-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="role"
                    value="member"
                    checked={role === "member"}
                    onChange={(e) => setRole(e.target.value as UserRole)}
                    disabled={loading}
                    className="w-4 h-4"
                  />
                  <div>
                    <div className={cn(typography.bodySmall, "font-medium")}>Member</div>
                    <div className={cn(typography.caption, "text-muted-foreground")}>
                      Regular user with access to the mobile app
                    </div>
                  </div>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="role"
                    value="righthand"
                    checked={role === "righthand"}
                    onChange={(e) => setRole(e.target.value as UserRole)}
                    disabled={loading}
                    className="w-4 h-4"
                  />
                  <div>
                    <div className={cn(typography.bodySmall, "font-medium")}>Right Hand</div>
                    <div className={cn(typography.caption, "text-muted-foreground")}>
                      Admin user with access to this dashboard
                    </div>
                  </div>
                </label>
              </div>
            </div>

            {error && (
              <div className="text-destructive text-sm p-3 bg-destructive/10 rounded-md">
                {error}
              </div>
            )}

            {success && (
              <div className="text-green-600 text-sm p-3 bg-green-600/10 rounded-md">
                Invitation sent successfully!
              </div>
            )}
          </div>

          <SheetFooter>
            <Button type="submit" disabled={loading} className="w-full">
              {loading ? "Sending..." : "Send Invitation"}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  )
}
