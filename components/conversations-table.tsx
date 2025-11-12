"use client"

import * as React from "react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { typography } from "@/lib/typography"
import { cn } from "@/lib/utils"
import { useConversations, useMessages } from "@/lib/supabase/hooks"
import type { Database } from "@/lib/supabase/types"

type ConversationRow = Database['public']['Tables']['conversations']['Row']
type ProfileRow = Database['public']['Tables']['profiles']['Row']

export interface Conversation extends ConversationRow {
  profile: ProfileRow | null
}

interface ConversationsTableProps {
  onConversationClick?: (conversation: Conversation) => void
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

type StatusType = Database['public']['Enums']['task_status']

function getStatusDisplay(status: StatusType): { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' } {
  switch (status) {
    case 'triage':
      return { label: 'Triage', variant: 'outline' }
    case 'with_claude':
      return { label: 'With Claude', variant: 'default' }
    case 'with_human':
      return { label: 'With Human', variant: 'secondary' }
    case 'complete':
      return { label: 'Complete', variant: 'secondary' }
    case 'cancelled':
      return { label: 'Cancelled', variant: 'destructive' }
    default:
      return { label: 'Unknown', variant: 'outline' }
  }
}

function LastMessageCell({ conversationId }: { conversationId: string }) {
  const { messages, loading } = useMessages(conversationId)

  if (loading) return <span className="text-muted-foreground">Loading...</span>
  if (messages.length === 0) return <span className="text-muted-foreground">No messages</span>

  const lastMessage = messages[messages.length - 1]
  return <span>{lastMessage.content.substring(0, 50)}{lastMessage.content.length > 50 ? '...' : ''}</span>
}

export function ConversationsTable({ onConversationClick }: ConversationsTableProps) {
  const { conversations, loading, error } = useConversations()

  // Sort conversations with 'with_human' status at the top
  const sortedConversations = React.useMemo(() => {
    return [...conversations].sort((a, b) => {
      if (a.status === 'with_human' && b.status !== 'with_human') return -1
      if (a.status !== 'with_human' && b.status === 'with_human') return 1
      return 0
    })
  }, [conversations])

  if (loading) {
    return (
      <div className="w-full flex items-center justify-center p-8">
        <p className={cn(typography.body, "text-muted-foreground")}>Loading conversations...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="w-full flex items-center justify-center p-8">
        <p className={cn(typography.body, "text-destructive")}>
          Error loading conversations: {error.message}
        </p>
      </div>
    )
  }

  if (conversations.length === 0) {
    return (
      <div className="w-full flex items-center justify-center p-8">
        <p className={cn(typography.body, "text-muted-foreground")}>No conversations found</p>
      </div>
    )
  }

  return (
    <div className="w-full">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className={cn(typography.tableHeader, "h-14 px-4")}>Status</TableHead>
            <TableHead className={cn(typography.tableHeader, "h-14 px-4")}>Member</TableHead>
            <TableHead className={cn(typography.tableHeader, "h-14 px-4")}>Title</TableHead>
            <TableHead className={cn(typography.tableHeader, "h-14 px-4")}>Created</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedConversations.map((conversation) => {
            const memberName = conversation.profile
              ? [conversation.profile.first_name, conversation.profile.last_name].filter(Boolean).join(' ') || 'No Name'
              : 'Unknown'

            const statusDisplay = getStatusDisplay(conversation.status)

            return (
              <TableRow
                key={conversation.id}
                className="cursor-pointer hover:bg-muted/50"
                onClick={() => onConversationClick?.(conversation)}
              >
                <TableCell className={cn(typography.tableCell, "py-6 px-4")}>
                  <Badge variant={statusDisplay.variant} className="text-base px-3 py-1">{statusDisplay.label}</Badge>
                </TableCell>
                <TableCell className={cn(typography.tableCell, "py-6 px-4")}>
                  {memberName}
                </TableCell>
                <TableCell className={cn(typography.tableCell, "py-6 px-4")}>
                  {conversation.title || 'Untitled'}
                </TableCell>
                <TableCell className={cn(typography.tableCell, "py-6 px-4")}>
                  {formatRelativeTime(conversation.created_at)}
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}
