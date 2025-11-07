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

// Mock data - replace with actual data from your API
const conversations = [
  {
    id: "1",
    member: "Alice Johnson",
    subject: "Q4 Strategy Review",
    lastMessage: "Let's schedule a meeting for next week",
    timestamp: "2 hours ago",
    status: "Active",
  },
  {
    id: "2",
    member: "Bob Smith",
    subject: "Budget Approval",
    lastMessage: "I've reviewed the numbers and they look good",
    timestamp: "5 hours ago",
    status: "Active",
  },
  {
    id: "3",
    member: "Carol Williams",
    subject: "Team Updates",
    lastMessage: "Thanks for the update!",
    timestamp: "1 day ago",
    status: "Archived",
  },
]

export function ConversationsTable() {
  return (
    <div className="w-full">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className={cn(typography.tableHeader)}>Member</TableHead>
            <TableHead className={cn(typography.tableHeader)}>Subject</TableHead>
            <TableHead className={cn(typography.tableHeader)}>Last Message</TableHead>
            <TableHead className={cn(typography.tableHeader)}>Time</TableHead>
            <TableHead className={cn(typography.tableHeader)}>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {conversations.map((conversation) => (
            <TableRow key={conversation.id}>
              <TableCell className={cn(typography.tableCell)}>
                {conversation.member}
              </TableCell>
              <TableCell className={cn(typography.tableCell)}>
                {conversation.subject}
              </TableCell>
              <TableCell className={cn(typography.tableCell)}>
                {conversation.lastMessage}
              </TableCell>
              <TableCell className={cn(typography.tableCell)}>
                {conversation.timestamp}
              </TableCell>
              <TableCell className={cn(typography.tableCell)}>
                {conversation.status}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
