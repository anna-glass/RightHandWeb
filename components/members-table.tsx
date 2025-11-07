"use client"

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { typography } from "@/lib/typography"
import { cn } from "@/lib/utils"
import { useProfiles } from "@/lib/supabase/hooks"
import type { Database } from "@/lib/supabase/types"

export type Member = Database['public']['Tables']['profiles']['Row']

interface MembersTableProps {
  onMemberClick?: (member: Member) => void
}

export function MembersTable({ onMemberClick }: MembersTableProps) {
  const { profiles, loading, error } = useProfiles()

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
    <div className="w-full">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className={cn(typography.tableHeader)}>Name</TableHead>
            <TableHead className={cn(typography.tableHeader)}>Email</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {profiles.map((member) => {
            const fullName = [member.first_name, member.last_name].filter(Boolean).join(' ') || 'No Name'
            return (
              <TableRow
                key={member.id}
                onClick={() => onMemberClick?.(member)}
                className={cn(onMemberClick && "cursor-pointer hover:bg-muted/50")}
              >
                <TableCell className={cn(typography.tableCell)}>
                  {fullName}
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
  )
}
