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
import { useConversations, useAddresses } from "@/lib/supabase/hooks"

interface MemberDetailProps {
  member: Member
  onBack: () => void
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
  if (diffMins < 60) return `${diffMins} min${diffMins !== 1 ? 's' : ''} ago`
  if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`
  if (diffDays < 7) return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`

  return date.toLocaleDateString()
}

export function MemberDetail({ member, onBack }: MemberDetailProps) {
  const [memorySearch, setMemorySearch] = React.useState("")

  // Fetch conversations for this member
  const { conversations: allConversations, loading: conversationsLoading } = useConversations()
  const memberConversations = React.useMemo(
    () => allConversations.filter(c => c.user_id === member.id),
    [allConversations, member.id]
  )

  // Fetch addresses for this member
  const { addresses, loading: addressesLoading } = useAddresses(member.id)

  // Profile info
  const profilePicture = member.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${member.id}`
  const joinedDate = member.created_at
    ? new Date(member.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
    : 'Unknown'
  const memberName = [member.first_name, member.last_name].filter(Boolean).join(' ') || 'No Name'

  // Mock data for memories and notes (these would typically come from a separate table)
  const defaultMemories = [
    "Hair salon: The Style Studio on 5th Ave",
    "Preferred restaurant: Casa Milano",
    "Coffee order: Oat milk latte, extra hot",
  ]

  // Initialize memories text from array only once
  const [memoriesText, setMemoriesText] = React.useState(() => defaultMemories.join('\n'))
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
            <BreadcrumbPage>{memberName}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {/* Profile Card */}
      <div className="bg-muted p-6 rounded-lg">
        <div className="flex gap-6">
          <img
            src={profilePicture}
            alt={memberName}
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
                </div>
                <div className="pt-2">
                  <div>
                    <p className={cn(typography.caption, "text-muted-foreground")}>Joined</p>
                    <p className={cn(typography.body)}>{joinedDate}</p>
                  </div>
                </div>
              </div>

              {/* Right side - Address Book */}
              <div className="flex flex-col gap-2 min-w-[300px]">
                {addressesLoading ? (
                  <p className={cn(typography.body, "text-muted-foreground")}>Loading addresses...</p>
                ) : addresses.length === 0 ? (
                  <p className={cn(typography.body, "text-muted-foreground")}>No addresses found</p>
                ) : (
                  addresses.map((address) => (
                    <div key={address.id} className="flex items-start gap-2">
                      <span className={cn(typography.label, "text-muted-foreground w-24 shrink-0")}>
                        {address.name}
                      </span>
                      <span className={cn(typography.body)}>
                        {address.street}, {address.city}, {address.state}, {address.zip_code}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Conversations */}
      <div className="bg-muted p-6 rounded-lg">
        {conversationsLoading ? (
          <p className={cn(typography.body, "text-muted-foreground text-center p-4")}>Loading conversations...</p>
        ) : memberConversations.length === 0 ? (
          <p className={cn(typography.body, "text-muted-foreground text-center p-4")}>No conversations found</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="border-b border-gray-300">
                <TableHead className={cn(typography.tableHeader)}>Conversation</TableHead>
                <TableHead className={cn(typography.tableHeader)}>Last Talked</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {memberConversations.map((conversation) => (
                <TableRow key={conversation.id} className="border-b border-gray-300">
                  <TableCell className={cn(typography.tableCell)}>
                    {conversation.title || 'Untitled'}
                  </TableCell>
                  <TableCell className={cn(typography.tableCell)}>
                    {formatRelativeTime(conversation.created_at)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
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
