"use client"

import * as React from "react"
import { ArrowLeft, Search } from "lucide-react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { typography } from "@/lib/typography"
import { cn } from "@/lib/utils"
import type { Member } from "./members-table"

interface MemberDetailProps {
  member: Member
  onBack: () => void
}

// Mock data - replace with actual data from your API
const getMemberConversations = (memberId: string) => [
  {
    id: "1",
    subject: "Q4 Strategy Review",
    lastMessage: "Let's schedule a meeting for next week",
    timestamp: "2 hours ago",
    status: "Active",
  },
  {
    id: "2",
    subject: "Budget Approval",
    lastMessage: "I've reviewed the numbers",
    timestamp: "1 day ago",
    status: "Active",
  },
]

const getMemberStats = (memberId: string) => ({
  totalRequests: 42,
  activeConversations: 3,
  completedRequests: 39,
})

const getMemberNotes = (memberId: string) =>
  "Prefers morning meetings. Very detail-oriented."

const getMemberAddressBook = (memberId: string) => [
  { type: "Work", phone: "+1 (555) 123-4567", email: "work@example.com" },
  { type: "Personal", phone: "+1 (555) 987-6543", email: "personal@example.com" },
]

const getMemberMemories = (memberId: string) => [
  "Hair salon: The Style Studio on 5th Ave",
  "Preferred restaurant: Casa Milano",
  "Coffee order: Oat milk latte, extra hot",
  "Birthday: March 15th",
  "Allergic to shellfish",
  "Prefers window seats on flights",
  "Dog's name is Max, a golden retriever",
  "Anniversary: June 10th",
  "Favorite flowers: white roses",
  "Gym: Equinox on Park Avenue, goes Mon/Wed/Fri at 6am",
]

export function MemberDetail({ member, onBack }: MemberDetailProps) {
  const [memorySearch, setMemorySearch] = React.useState("")

  const stats = getMemberStats(member.id)
  const conversations = getMemberConversations(member.id)
  const notes = getMemberNotes(member.id)
  const addressBook = getMemberAddressBook(member.id)
  const memories = getMemberMemories(member.id)

  const filteredMemories = React.useMemo(() => {
    if (!memorySearch.trim()) return memories
    const searchLower = memorySearch.toLowerCase()
    return memories.filter(memory =>
      memory.toLowerCase().includes(searchLower)
    )
  }, [memories, memorySearch])

  return (
    <div className="flex flex-col gap-6">
      {/* Breadcrumb */}
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink
              onClick={onBack}
              className="cursor-pointer"
            >
              Members
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>{member.name}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft />
        </Button>
        <div>
          <h1 className={cn(typography.h2)}>{member.name}</h1>
          <p className={cn(typography.bodySmall, "text-muted-foreground")}>
            {member.role} • {member.email}
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="flex gap-8">
        <div>
          <p className={cn(typography.caption)}>Total Requests</p>
          <p className={cn(typography.h3)}>{stats.totalRequests}</p>
        </div>
        <div>
          <p className={cn(typography.caption)}>Active Conversations</p>
          <p className={cn(typography.h3)}>{stats.activeConversations}</p>
        </div>
        <div>
          <p className={cn(typography.caption)}>Completed</p>
          <p className={cn(typography.h3)}>{stats.completedRequests}</p>
        </div>
      </div>

      {/* Conversations */}
      <div>
        <h2 className={cn(typography.h4, "mb-4")}>Conversations</h2>
        <Table>
          <TableHeader>
            <TableRow>
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

      {/* Notes */}
      <div>
        <h2 className={cn(typography.h4, "mb-2")}>Notes</h2>
        <div className="bg-muted p-4 rounded-md">
          <p className={cn(typography.body)}>{notes}</p>
        </div>
      </div>

      {/* Address Book */}
      <div>
        <h2 className={cn(typography.h4, "mb-4")}>Address Book</h2>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className={cn(typography.tableHeader)}>Type</TableHead>
              <TableHead className={cn(typography.tableHeader)}>Phone</TableHead>
              <TableHead className={cn(typography.tableHeader)}>Email</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {addressBook.map((contact, index) => (
              <TableRow key={index}>
                <TableCell className={cn(typography.tableCell)}>
                  {contact.type}
                </TableCell>
                <TableCell className={cn(typography.tableCell)}>
                  {contact.phone}
                </TableCell>
                <TableCell className={cn(typography.tableCell)}>
                  {contact.email}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Memories */}
      <div>
        <h2 className={cn(typography.h4, "mb-4")}>Memories</h2>
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search memories..."
            value={memorySearch}
            onChange={(e) => setMemorySearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="space-y-2">
          {filteredMemories.length > 0 ? (
            filteredMemories.map((memory, index) => (
              <div
                key={index}
                className="bg-muted p-3 rounded-md"
              >
                <p className={cn(typography.body)}>{memory}</p>
              </div>
            ))
          ) : (
            <p className={cn(typography.bodySmall, "text-muted-foreground")}>
              No memories found matching "{memorySearch}"
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
