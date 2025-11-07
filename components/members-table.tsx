"use client"

import * as React from "react"
import { Search } from "lucide-react"
import { typography } from "@/lib/typography"
import { cn } from "@/lib/utils"
import { Input } from "@/components/ui/input"
import { useProfiles } from "@/lib/supabase/hooks"
import type { Database } from "@/lib/supabase/types"

export type Member = Database['public']['Tables']['profiles']['Row']

interface MembersTableProps {
  onMemberClick?: (member: Member) => void
}

function formatDate(dateString: string | null): string {
  if (!dateString) return 'Unknown'
  const date = new Date(dateString)
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
}

function formatRelativeTime(dateString: string | null): string {
  if (!dateString) return 'Never'

  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMins / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`

  return formatDate(dateString)
}

export function MembersTable({ onMemberClick }: MembersTableProps) {
  const { profiles, loading, error } = useProfiles()
  const [searchQuery, setSearchQuery] = React.useState("")

  const filteredProfiles = React.useMemo(() => {
    if (!searchQuery.trim()) return profiles

    const query = searchQuery.toLowerCase()
    return profiles.filter((member) => {
      const fullName = [member.first_name, member.last_name].filter(Boolean).join(' ').toLowerCase()
      const firstName = (member.first_name || '').toLowerCase()
      const lastName = (member.last_name || '').toLowerCase()
      const email = member.email.toLowerCase()

      return fullName.includes(query) ||
             firstName.includes(query) ||
             lastName.includes(query) ||
             email.includes(query)
    })
  }, [profiles, searchQuery])

  if (loading) {
    return (
      <div className="w-full flex items-center justify-center p-8">
        <p className={cn(typography.body, "text-muted-foreground")}>Loading members...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="w-full flex items-center justify-center p-8">
        <p className={cn(typography.body, "text-destructive")}>
          Error loading members: {error.message}
        </p>
      </div>
    )
  }

  if (profiles.length === 0) {
    return (
      <div className="w-full flex items-center justify-center p-8">
        <p className={cn(typography.body, "text-muted-foreground")}>No members found</p>
      </div>
    )
  }

  return (
    <div className="w-full p-6 space-y-6">
      {/* Search bar */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          type="text"
          placeholder="Search members..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Members grid */}
      {filteredProfiles.length === 0 ? (
        <div className="w-full flex items-center justify-center p-8">
          <p className={cn(typography.body, "text-muted-foreground")}>
            No members found matching "{searchQuery}"
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {filteredProfiles.map((member) => {
          const fullName = [member.first_name, member.last_name].filter(Boolean).join(' ') || 'No Name'
          const profilePicture = member.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${member.id}`

          return (
            <div
              key={member.id}
              onClick={() => onMemberClick?.(member)}
              className={cn(
                "bg-muted p-4 rounded-lg flex items-start gap-4 transition-all",
                onMemberClick && "cursor-pointer hover:bg-muted/70 hover:shadow-md"
              )}
            >
              <img
                src={profilePicture}
                alt={fullName}
                className="w-16 h-16 rounded-md object-cover bg-background flex-shrink-0"
              />
              <div className="flex-1 min-w-0 space-y-1">
                <h3 className={cn(typography.bodySmall, "font-medium")}>
                  {fullName}
                </h3>
                <p className={cn(typography.bodySmall, "text-muted-foreground truncate")}>
                  {member.email}
                </p>
                <div className={cn(typography.caption, "text-muted-foreground space-y-0.5")}>
                  <p>Last active: {formatRelativeTime(member.updated_at)}</p>
                  <p>Joined: {formatDate(member.created_at)}</p>
                </div>
              </div>
            </div>
          )
        })}
        </div>
      )}
    </div>
  )
}
