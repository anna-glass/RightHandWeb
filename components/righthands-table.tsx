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
import { useRighthands } from "@/lib/supabase/hooks"
import type { Database } from "@/lib/supabase/types"

export type Righthand = Database['public']['Tables']['righthands']['Row']

interface RighthandsTableProps {
  onRighthandClick?: (righthand: Righthand) => void
}

function formatDate(dateString: string | null): string {
  if (!dateString) return 'Unknown'
  const date = new Date(dateString)
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
}

export function RighthandsTable({ onRighthandClick }: RighthandsTableProps) {
  const { righthands, loading, error } = useRighthands()
  const [searchQuery, setSearchQuery] = React.useState("")

  const filteredRighthands = React.useMemo(() => {
    if (!searchQuery.trim()) return righthands

    const query = searchQuery.toLowerCase()
    return righthands.filter((righthand) => {
      const fullName = [righthand.first_name, righthand.last_name].filter(Boolean).join(' ').toLowerCase()
      const firstName = (righthand.first_name || '').toLowerCase()
      const lastName = (righthand.last_name || '').toLowerCase()
      const email = righthand.email.toLowerCase()

      return fullName.includes(query) ||
             firstName.includes(query) ||
             lastName.includes(query) ||
             email.includes(query)
    })
  }, [righthands, searchQuery])

  if (loading) {
    return (
      <div className="w-full flex items-center justify-center p-8">
        <p className={cn(typography.body, "text-muted-foreground")}>Loading righthands...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="w-full flex items-center justify-center p-8">
        <p className={cn(typography.body, "text-destructive")}>
          Error loading righthands: {error.message}
        </p>
      </div>
    )
  }

  if (righthands.length === 0) {
    return (
      <div className="w-full flex items-center justify-center p-8">
        <p className={cn(typography.body, "text-muted-foreground")}>No righthands found</p>
      </div>
    )
  }

  return (
    <div className="w-full space-y-6">
      {/* Search bar */}
      <div className="flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search righthands..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 bg-white"
          />
        </div>
      </div>

      {/* Righthands table */}
      {filteredRighthands.length === 0 ? (
        <div className="w-full flex items-center justify-center p-8">
          <p className={cn(typography.body, "text-muted-foreground")}>
            No righthands found{searchQuery ? ` matching "${searchQuery}"` : ''}
          </p>
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className={cn(typography.tableHeader)}>Name</TableHead>
              <TableHead className={cn(typography.tableHeader)}>Role</TableHead>
              <TableHead className={cn(typography.tableHeader)}>Email</TableHead>
              <TableHead className={cn(typography.tableHeader)}>Joined</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredRighthands.map((righthand) => {
              const fullName = [righthand.first_name, righthand.last_name].filter(Boolean).join(' ') || 'No Name'

              return (
                <TableRow
                  key={righthand.id}
                  onClick={() => onRighthandClick?.(righthand)}
                  className={cn(
                    onRighthandClick && "cursor-pointer hover:bg-muted/50"
                  )}
                >
                  <TableCell className={cn(typography.tableCell, "font-medium")}>
                    {fullName}
                  </TableCell>
                  <TableCell className={cn(typography.tableCell, "capitalize")}>
                    {righthand.role}
                  </TableCell>
                  <TableCell className={cn(typography.tableCell)}>
                    {righthand.email}
                  </TableCell>
                  <TableCell className={cn(typography.tableCell)}>
                    {formatDate(righthand.created_at)}
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
