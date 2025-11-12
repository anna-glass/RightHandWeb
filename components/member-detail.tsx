"use client"

import * as React from "react"
import { Search } from "lucide-react"
import { useRouter } from "next/navigation"
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
import type { Conversation } from "./conversations-table"
import { useConversations, useAddresses, updateProfile } from "@/lib/supabase/hooks"

interface MemberDetailProps {
  member: Member
  onBack: () => void
  fromConversation?: Conversation | null
  onBackToConversation?: () => void
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

export function MemberDetail({ member, onBack, fromConversation, onBackToConversation }: MemberDetailProps) {
  const router = useRouter()
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

  // Initialize memories and notes from database
  const [memoriesText, setMemoriesText] = React.useState(member.memories || '')
  const [notesText, setNotesText] = React.useState(member.notes || '')
  const [isSavingMemories, setIsSavingMemories] = React.useState(false)
  const [isSavingNotes, setIsSavingNotes] = React.useState(false)

  const filteredMemoriesText = React.useMemo(() => {
    if (!memorySearch.trim()) return memoriesText
    const searchLower = memorySearch.toLowerCase()
    const lines = memoriesText.split('\n')
    return lines.filter(line =>
      line.toLowerCase().includes(searchLower)
    ).join('\n')
  }, [memoriesText, memorySearch])

  // Auto-save memories after user stops typing
  React.useEffect(() => {
    const timeoutId = setTimeout(async () => {
      // Normalize values for comparison (treat null as empty string)
      const currentValue = memoriesText || ''
      const savedValue = member.memories || ''

      if (currentValue !== savedValue) {
        setIsSavingMemories(true)
        try {
          await updateProfile(member.id, { memories: memoriesText })
        } catch (error) {
          console.error('Error saving memories:', error)
        } finally {
          setIsSavingMemories(false)
        }
      }
    }, 1000) // Save 1 second after user stops typing

    return () => clearTimeout(timeoutId)
  }, [memoriesText, member.id, member.memories])

  // Auto-save notes after user stops typing
  React.useEffect(() => {
    const timeoutId = setTimeout(async () => {
      // Normalize values for comparison (treat null as empty string)
      const currentValue = notesText || ''
      const savedValue = member.notes || ''

      if (currentValue !== savedValue) {
        setIsSavingNotes(true)
        try {
          await updateProfile(member.id, { notes: notesText })
        } catch (error) {
          console.error('Error saving notes:', error)
        } finally {
          setIsSavingNotes(false)
        }
      }
    }, 1000) // Save 1 second after user stops typing

    return () => clearTimeout(timeoutId)
  }, [notesText, member.id, member.notes])

  return (
    <div className="flex flex-col gap-6">
      {/* Breadcrumb */}
      <Breadcrumb>
        <BreadcrumbList>
          {fromConversation ? (
            <>
              <BreadcrumbItem>
                <BreadcrumbLink
                  onClick={onBack}
                  className="cursor-pointer"
                >
                  Conversations
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbLink
                  onClick={onBackToConversation}
                  className="cursor-pointer"
                >
                  {fromConversation.title || 'Untitled'}
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>{memberName}</BreadcrumbPage>
              </BreadcrumbItem>
            </>
          ) : (
            <>
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
            </>
          )}
        </BreadcrumbList>
      </Breadcrumb>

      {/* Profile Card */}
      <div className="bg-muted p-6 rounded-lg">
        <h4 className={cn(typography.bodySmall, "font-medium mb-4")}>Profile</h4>
        <div className="flex gap-6">
          <img
            src={profilePicture}
            alt={memberName}
            className="size-32 bg-background object-cover rounded-md"
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
                    <p className={cn(typography.label, "text-muted-foreground")}>Joined</p>
                    <p className={cn(typography.body)}>{joinedDate}</p>
                  </div>
                </div>
                <div>
                  <div>
                    <p className={cn(typography.label, "text-muted-foreground")}>Tasks This Month</p>
                    <p className={cn(typography.body)}>{member.tasks_this_month}</p>
                  </div>
                </div>
                <div>
                  <div>
                    <p className={cn(typography.label, "text-muted-foreground")}>Hours Saved This Month</p>
                    <p className={cn(typography.body)}>{member.hours_saved_this_month}</p>
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
        <h4 className={cn(typography.bodySmall, "font-medium mb-3")}>Conversations</h4>
        {conversationsLoading ? (
          <p className={cn(typography.body, "text-muted-foreground text-center p-4")}>Loading conversations...</p>
        ) : memberConversations.length === 0 ? (
          <p className={cn(typography.body, "text-muted-foreground text-center p-4")}>No conversations found</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className={cn(typography.tableHeader)}>Conversation</TableHead>
                <TableHead className={cn(typography.tableHeader)}>Last Talked</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {memberConversations.map((conversation) => {
                const handleConversationClick = () => {
                  // Build the navigation path
                  const searchParams = new URLSearchParams(window.location.search)
                  const currentPath = searchParams.get('path') || ''

                  // Parse current path
                  const pathParts = currentPath ? currentPath.split(',') : []

                  // Check if 'conv' type already exists in path
                  const convIndex = pathParts.findIndex(p => p.startsWith('conv-'))

                  let newPath: string[]
                  if (convIndex >= 0) {
                    // Pop off everything from the first conversation onward (inclusive)
                    newPath = pathParts.slice(0, convIndex)
                  } else {
                    // No conversation in path, add current member to path
                    const memberId = `member-${member.id}`
                    newPath = [...pathParts]
                    if (!newPath.includes(memberId)) {
                      newPath.push(memberId)
                    }
                  }

                  // Navigate to conversation with new path
                  const pathParam = newPath.length > 0 ? `path=${newPath.join(',')}` : ''
                  router.push(`/conversations/${conversation.id}${pathParam ? '?' + pathParam : ''}`)
                }

                return (
                  <TableRow
                    key={conversation.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={handleConversationClick}
                  >
                    <TableCell className={cn(typography.tableCell)}>
                      {conversation.title || 'Untitled'}
                    </TableCell>
                    <TableCell className={cn(typography.tableCell)}>
                      {formatRelativeTime(conversation.created_at)}
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Memories */}
      <div className="bg-muted p-6 rounded-lg">
        <h4 className={cn(typography.bodySmall, "font-medium mb-3")}>Memories</h4>
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
            "w-full min-h-[200px] p-3 rounded-lg resize-y border",
            "focus:outline-none",
            memorySearch.trim() && "bg-muted/50"
          )}
          disabled={memorySearch.trim().length > 0}
        />
      </div>

      {/* Notes */}
      <div className="bg-muted p-6 rounded-lg">
        <h4 className={cn(typography.bodySmall, "font-medium mb-3")}>Notes</h4>
        <textarea
          value={notesText}
          onChange={(e) => setNotesText(e.target.value)}
          placeholder="Add notes here..."
          className={cn(
            typography.body,
            "w-full min-h-[200px] p-3 rounded-lg resize-y border",
            "focus:outline-none"
          )}
        />
      </div>
    </div>
  )
}
