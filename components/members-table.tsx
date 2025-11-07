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

export interface Member {
  id: string
  name: string
  email: string
  role: string
  status: string
}

// Mock data - replace with actual data from your API
const members: Member[] = [
  {
    id: "1",
    name: "Alice Johnson",
    email: "alice@example.com",
    role: "Executive",
    status: "Active",
  },
  {
    id: "2",
    name: "Bob Smith",
    email: "bob@example.com",
    role: "Executive",
    status: "Active",
  },
  {
    id: "3",
    name: "Carol Williams",
    email: "carol@example.com",
    role: "Executive",
    status: "Away",
  },
]

interface MembersTableProps {
  onMemberClick?: (member: Member) => void
}

export function MembersTable({ onMemberClick }: MembersTableProps) {
  return (
    <div className="w-full">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className={cn(typography.tableHeader)}>Name</TableHead>
            <TableHead className={cn(typography.tableHeader)}>Email</TableHead>
            <TableHead className={cn(typography.tableHeader)}>Role</TableHead>
            <TableHead className={cn(typography.tableHeader)}>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {members.map((member) => (
            <TableRow
              key={member.id}
              onClick={() => onMemberClick?.(member)}
              className={cn(onMemberClick && "cursor-pointer hover:bg-muted/50")}
            >
              <TableCell className={cn(typography.tableCell)}>
                {member.name}
              </TableCell>
              <TableCell className={cn(typography.tableCell)}>
                {member.email}
              </TableCell>
              <TableCell className={cn(typography.tableCell)}>
                {member.role}
              </TableCell>
              <TableCell className={cn(typography.tableCell)}>
                {member.status}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
