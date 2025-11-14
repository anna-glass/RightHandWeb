"use client"

import * as React from "react"
import { Search } from "lucide-react"
import { typography } from "@/lib/typography"
import { cn } from "@/lib/utils"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
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
  const { onboardedProfiles, pendingProfiles, loading, error } = useProfiles()
  const [searchQuery, setSearchQuery] = React.useState("")
  const [invitedOpen, setInvitedOpen] = React.useState(false)

  const filterMembers = React.useCallback((members: Member[]) => {
    if (!searchQuery.trim()) return members

    const query = searchQuery.toLowerCase()
    return members.filter((member) => {
      const fullName = [member.first_name, member.last_name].filter(Boolean).join(' ').toLowerCase()
      const firstName = (member.first_name || '').toLowerCase()
      const lastName = (member.last_name || '').toLowerCase()
      const email = member.email.toLowerCase()

      return fullName.includes(query) ||
             firstName.includes(query) ||
             lastName.includes(query) ||
             email.includes(query)
    })
  }, [searchQuery])

  const filteredOnboardedProfiles = React.useMemo(() =>
    filterMembers(onboardedProfiles),
    [onboardedProfiles, filterMembers]
  )

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

  if (onboardedProfiles.length === 0 && pendingProfiles.length === 0) {
    return (
      <div className="w-full flex items-center justify-center p-8">
        <p className={cn(typography.body, "text-muted-foreground")}>No members found</p>
      </div>
    )
  }

  return (
    <div className="w-full space-y-6">
      {/* Search bar, Invited Members button, and Invite Button */}
      <div className="flex items-center justify-between gap-4">
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

        <div className="flex items-center gap-4">
          {/* Invited Members Popover */}
          {pendingProfiles.length > 0 && (
            <Popover open={invitedOpen} onOpenChange={setInvitedOpen}>
              <PopoverTrigger asChild>
                <Button variant="ghost">
                  Invites Sent ({pendingProfiles.length})
                </Button>
              </PopoverTrigger>
            <PopoverContent className="w-[500px]" align="end">
              <div className="max-h-[400px] overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className={cn(typography.tableHeader)}>Email</TableHead>
                      <TableHead className={cn(typography.tableHeader)}>Date Invited</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pendingProfiles.map((member) => (
                      <TableRow key={member.id}>
                        <TableCell className={cn(typography.tableCell)}>
                          {member.email}
                        </TableCell>
                        <TableCell className={cn(typography.tableCell)}>
                          {formatDate(member.created_at)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </PopoverContent>
          </Popover>
          )}

          {InviteButton}
        </div>
      </div>

      {/* Active Members table */}
      {filteredOnboardedProfiles.length === 0 ? (
        <div className="w-full flex items-center justify-center p-8">
          <p className={cn(typography.body, "text-muted-foreground")}>
            No active members found{searchQuery ? ` matching "${searchQuery}"` : ''}
          </p>
        </div>
      ) : (
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
            {filteredOnboardedProfiles.map((member) => {
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
      )}
    </div>
  )
}
