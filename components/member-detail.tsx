"use client"

import * as React from "react"
import { Search } from "lucide-react"
import { useRouter } from "next/navigation"
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
import { useAddresses, updateProfile } from "@/lib/supabase/hooks"
import { Button } from "@/components/ui/button"

interface MemberDetailProps {
  member: Member
  onBack: () => void
}

function formatDate(dateString: string | null): string {
  if (!dateString) return 'Unknown'
  const date = new Date(dateString)
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
}

export function MemberDetail({ member, onBack }: MemberDetailProps) {
  const router = useRouter()
  const [memorySearch, setMemorySearch] = React.useState("")

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
  const [tasksThisMonth, setTasksThisMonth] = React.useState(member.tasks_this_month.toString())
  const [hoursSavedThisMonth, setHoursSavedThisMonth] = React.useState(member.hours_saved_this_month.toString())
  const [isSavingMemories, setIsSavingMemories] = React.useState(false)
  const [isSavingNotes, setIsSavingNotes] = React.useState(false)
  const [isSavingTasks, setIsSavingTasks] = React.useState(false)
  const [isSavingHours, setIsSavingHours] = React.useState(false)

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

  // Auto-save tasks after user stops typing
  React.useEffect(() => {
    const timeoutId = setTimeout(async () => {
      const parsedValue = parseInt(tasksThisMonth) || 0
      if (parsedValue !== member.tasks_this_month) {
        setIsSavingTasks(true)
        try {
          await updateProfile(member.id, { tasks_this_month: parsedValue })
        } catch (error) {
          console.error('Error saving tasks:', error)
        } finally {
          setIsSavingTasks(false)
        }
      }
    }, 1000)

    return () => clearTimeout(timeoutId)
  }, [tasksThisMonth, member.id, member.tasks_this_month])

  // Auto-save hours after user stops typing
  React.useEffect(() => {
    const timeoutId = setTimeout(async () => {
      const parsedValue = parseInt(hoursSavedThisMonth) || 0
      if (parsedValue !== member.hours_saved_this_month) {
        setIsSavingHours(true)
        try {
          await updateProfile(member.id, { hours_saved_this_month: parsedValue })
        } catch (error) {
          console.error('Error saving hours:', error)
        } finally {
          setIsSavingHours(false)
        }
      }
    }, 1000)

    return () => clearTimeout(timeoutId)
  }, [hoursSavedThisMonth, member.id, member.hours_saved_this_month])

  return (
    <div className="flex flex-col gap-6">
      {/* Breadcrumb with Open Chat Button */}
      <div className="flex items-center justify-between">
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
        <Button onClick={() => router.push(`/chat/${member.id}`)}>
          Open Chat
        </Button>
      </div>

      {/* Profile Card */}
      <div className="bg-muted p-6 rounded-lg">
        <div className="flex gap-6">
          <img
            src={profilePicture}
            alt={memberName}
            className="size-32 bg-background object-cover rounded-md"
          />
          <div className="flex flex-col gap-4 flex-1">
            <div className="flex gap-6">
              <div>
                <p className={cn(typography.label, "text-muted-foreground")}>Last Active</p>
                <p className={cn(typography.body)}>{formatDate(member.updated_at)}</p>
              </div>
              <div>
                <p className={cn(typography.label, "text-muted-foreground")}>Joined</p>
                <p className={cn(typography.body)}>{joinedDate}</p>
              </div>
            </div>
            <div className="flex gap-6">
              <div>
                <p className={cn(typography.label, "text-muted-foreground")}>Tasks This Month</p>
                <Input
                  type="number"
                  value={tasksThisMonth}
                  onChange={(e) => setTasksThisMonth(e.target.value)}
                  className="w-24 h-8 mt-1 bg-white"
                  min="0"
                />
              </div>
              <div>
                <p className={cn(typography.label, "text-muted-foreground")}>Hours Saved This Month</p>
                <Input
                  type="number"
                  value={hoursSavedThisMonth}
                  onChange={(e) => setHoursSavedThisMonth(e.target.value)}
                  className="w-24 h-8 mt-1 bg-white"
                  min="0"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Contact Information */}
      <div className="bg-muted p-6 rounded-lg">
        <h4 className={cn(typography.bodySmall, "font-medium mb-4")}>Contact</h4>
        <div className="space-y-4">
          <div className="flex gap-6">
            <div>
              <p className={cn(typography.label, "text-muted-foreground")}>Email</p>
              <p className={cn(typography.body)}>{member.email}</p>
            </div>
            {member.phone_number && (
              <div>
                <p className={cn(typography.label, "text-muted-foreground")}>Phone</p>
                <p className={cn(typography.body)}>{member.phone_number}</p>
              </div>
            )}
          </div>
          <div>
            <p className={cn(typography.label, "text-muted-foreground mb-2")}>Addresses</p>
            {addressesLoading ? (
              <p className={cn(typography.body, "text-muted-foreground")}>Loading addresses...</p>
            ) : addresses.length === 0 ? (
              <p className={cn(typography.body, "text-muted-foreground")}>No addresses found</p>
            ) : (
              <div className="space-y-3">
                {addresses.map((address) => (
                  <div key={address.id} className="space-y-1">
                    <p className={cn(typography.label, "text-muted-foreground")}>{address.name}</p>
                    <p className={cn(typography.body)}>
                      {address.street}<br />
                      {address.city}, {address.state} {address.zip_code}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Memories & Notes */}
      <div className="bg-muted p-6 rounded-lg">
        <div className="grid grid-cols-2 gap-6">
          {/* Memories */}
          <div>
            <h4 className={cn(typography.bodySmall, "font-medium mb-3")}>Memories</h4>
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search memories..."
                value={memorySearch}
                onChange={(e) => setMemorySearch(e.target.value)}
                className="pl-9 bg-white"
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
                "focus:outline-none bg-white",
                memorySearch.trim() && "bg-muted/50"
              )}
              disabled={memorySearch.trim().length > 0}
            />
          </div>

          {/* Notes */}
          <div>
            <h4 className={cn(typography.bodySmall, "font-medium mb-3")}>Notes</h4>
            <textarea
              value={notesText}
              onChange={(e) => setNotesText(e.target.value)}
              placeholder="Add notes here..."
              className={cn(
                typography.body,
                "w-full min-h-[200px] p-3 rounded-lg resize-y border",
                "focus:outline-none bg-white"
              )}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
