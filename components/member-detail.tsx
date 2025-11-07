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

const getMemberAddressBook = (memberId: string) => [
  { type: "Home", address: "123 Main Street, Apt 4B, New York, NY 10001" },
  { type: "Office", address: "456 Park Avenue, Suite 2000, New York, NY 10022" },
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
  const addressBook = getMemberAddressBook(member.id)
  const memories = getMemberMemories(member.id)

  // Initialize memories text from array only once
  const [memoriesText, setMemoriesText] = React.useState(() => memories.join('\n'))
  const [notesText, setNotesText] = React.useState("")

  const filteredMemoriesText = React.useMemo(() => {
    if (!memorySearch.trim()) return memoriesText
    const searchLower = memorySearch.toLowerCase()
    const lines = memoriesText.split('\n')
    return lines.filter(line =>
      line.toLowerCase().includes(searchLower)
    ).join('\n')
  }, [memoriesText, memorySearch])

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
            className="size-32 bg-background"
          />
          <div className="flex flex-col gap-4 flex-1">
            {/* Profile Content - Left and Right */}
            <div className="flex gap-8">
              {/* Left side - Email, Phone, Usage, Joined */}
              <div className="flex flex-col gap-4">
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

              {/* Right side - Address Book */}
              <div className="flex flex-col gap-2 min-w-[300px]">
                {addressBook.map((contact, index) => (
                  <div key={index} className="flex items-start gap-2">
                    <span className={cn(typography.label, "text-muted-foreground w-24 shrink-0")}>{contact.type}</span>
                    <span className={cn(typography.body)}>{contact.address}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Conversations */}
      <div className="bg-muted p-6 rounded-lg">
        <Table>
          <TableHeader>
            <TableRow className="border-b border-gray-300">
              <TableHead className={cn(typography.tableHeader)}>Conversation</TableHead>
              <TableHead className={cn(typography.tableHeader)}>Last Message</TableHead>
              <TableHead className={cn(typography.tableHeader)}>Last Talked</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {conversations.map((conversation) => (
              <TableRow key={conversation.id} className="border-b border-gray-300">
                <TableCell className={cn(typography.tableCell)}>
                  <div className="flex items-center gap-2">
                    <div className={cn(
                      "size-2 rounded-full shrink-0",
                      conversation.status === "Active" ? "bg-green-500" : "bg-gray-400"
                    )} />
                    {conversation.subject}
                  </div>
                </TableCell>
                <TableCell className={cn(typography.tableCell)}>
                  {conversation.lastMessage}
                </TableCell>
                <TableCell className={cn(typography.tableCell)}>
                  {conversation.timestamp}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Memories */}
      <div className="bg-muted p-6 rounded-lg">
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search memories..."
            value={memorySearch}
            onChange={(e) => setMemorySearch(e.target.value)}
            className="pl-9 border-gray-300"
          />
        </div>
        <textarea
          value={memorySearch.trim() ? filteredMemoriesText : memoriesText}
          onChange={(e) => {
            if (!memorySearch.trim()) {
              setMemoriesText(e.target.value)
            }
          }}
          placeholder="Add memories here..."
          className={cn(
            typography.body,
            "w-full min-h-[200px] p-3 rounded-lg resize-y",
            "focus:outline-none",
            memorySearch.trim() && "bg-muted/50"
          )}
          disabled={memorySearch.trim().length > 0}
        />
      </div>

      {/* Notes */}
      <div className="bg-muted p-6 rounded-lg">
        <textarea
          value={notesText}
          onChange={(e) => setNotesText(e.target.value)}
          placeholder="Add notes here..."
          className={cn(
            typography.body,
            "w-full min-h-[200px] p-3 rounded-lg resize-y",
            "focus:outline-none"
          )}
        />
      </div>
    </div>
  )
}
