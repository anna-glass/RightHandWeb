"use client"

import * as React from "react"
import { Search } from "lucide-react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
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

const getMemberProfile = (memberId: string) => ({
  profilePicture: `https://api.dicebear.com/7.x/avataaars/svg?seed=${memberId}`,
  phone: "+1 (555) 123-4567",
  tasksCompleted: 14,
  tasksLimit: 20,
  joinedDate: "January 15, 2024",
})

const getMemberNotes = (memberId: string) =>
  "Prefers morning meetings. Very detail-oriented."

const getMemberAddressBook = (memberId: string) => [
  { type: "Home", address: "123 Main Street, Apt 4B, New York, NY 10001" },
  { type: "Office", address: "456 Park Avenue, Suite 2000, New York, NY 10022" },
  { type: "Vacation Home", address: "789 Beach Road, Hamptons, NY 11968" },
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

  const profile = getMemberProfile(member.id)
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

      {/* Profile Card */}
      <div className="bg-muted p-6 rounded-lg">
        <div className="flex gap-6">
          <img
            src={profile.profilePicture}
            alt={member.name}
            className="size-32 rounded-full bg-background"
          />
          <div className="flex flex-col gap-4 flex-1">
            <div>
              <h2 className={cn(typography.h2)}>{member.name}</h2>
            </div>
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <span className={cn(typography.label, "text-muted-foreground w-20")}>Email</span>
                <span className={cn(typography.body)}>{member.email}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className={cn(typography.label, "text-muted-foreground w-20")}>Phone</span>
                <span className={cn(typography.body)}>{profile.phone}</span>
              </div>
            </div>
            <div className="flex gap-8 pt-2">
              <div>
                <p className={cn(typography.caption, "text-muted-foreground")}>Usage</p>
                <p className={cn(typography.body)}>
                  {profile.tasksCompleted} / {profile.tasksLimit} tasks
                </p>
              </div>
              <div>
                <p className={cn(typography.caption, "text-muted-foreground")}>Joined</p>
                <p className={cn(typography.body)}>{profile.joinedDate}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Notes */}
        <div className="mt-6 pt-6 border-t">
          <h3 className={cn(typography.h5, "mb-2")}>Notes</h3>
          <p className={cn(typography.body)}>{notes}</p>
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

      {/* Address Book */}
      <div>
        <h2 className={cn(typography.h4, "mb-4")}>Address Book</h2>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className={cn(typography.tableHeader)}>Type</TableHead>
              <TableHead className={cn(typography.tableHeader)}>Address</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {addressBook.map((contact, index) => (
              <TableRow key={index}>
                <TableCell className={cn(typography.tableCell)}>
                  {contact.type}
                </TableCell>
                <TableCell className={cn(typography.tableCell)}>
                  {contact.address}
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
