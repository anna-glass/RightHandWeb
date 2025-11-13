"use client"

import * as React from "react"
import { Search } from "lucide-react"
import { typography } from "@/lib/typography"
import { cn } from "@/lib/utils"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { useProfiles } from "@/lib/supabase/hooks"
import type { Database } from "@/lib/supabase/types"

export type Member = Database['public']['Tables']['profiles']['Row']

interface MembersTableProps {
  onMemberClick?: (member: Member) => void
  InviteButton?: React.ReactNode
}

function formatDate(dateString: string | null): string {
  if (!dateString) return 'Unknown'
  const date = new Date(dateString)
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
}

export function MembersTable({ onMemberClick, InviteButton }: MembersTableProps) {
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
    <div className="w-full space-y-6">
      {/* Search bar and Invite Button */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search members..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 bg-white"
          />
        </div>
        {InviteButton}
      </div>

      {/* Members table */}
      {filteredProfiles.length === 0 ? (
        <div className="w-full flex items-center justify-center p-8">
          <p className={cn(typography.body, "text-muted-foreground")}>
            No members found matching "{searchQuery}"
          </p>
        </div>
      ) : (
        <div className="bg-muted rounded-lg p-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className={cn(typography.tableHeader)}>Name</TableHead>
                <TableHead className={cn(typography.tableHeader)}>Last Active</TableHead>
                <TableHead className={cn(typography.tableHeader)}>Joined</TableHead>
                <TableHead className={cn(typography.tableHeader)}>Email</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredProfiles.map((member) => {
                const fullName = [member.first_name, member.last_name].filter(Boolean).join(' ') || 'No Name'

                return (
                  <TableRow
                    key={member.id}
                    onClick={() => onMemberClick?.(member)}
                    className={cn(
                      onMemberClick && "cursor-pointer hover:bg-muted/50"
                    )}
                  >
                    <TableCell className={cn(typography.tableCell, "font-medium")}>
                      {fullName}
                    </TableCell>
                    <TableCell className={cn(typography.tableCell)}>
                      {formatDate(member.updated_at)}
                    </TableCell>
                    <TableCell className={cn(typography.tableCell)}>
                      {formatDate(member.created_at)}
                    </TableCell>
                    <TableCell className={cn(typography.tableCell)}>
                      {member.email}
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}
