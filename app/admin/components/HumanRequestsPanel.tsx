/**
 * app/admin/components/HumanRequestsPanel.tsx
 *
 * Author: Anna Glass
 * Created: 11/22/2025
 *
 * Right Hand, 2025. All rights reserved.
 */

"use client"

import { useState } from "react"
import { typography } from "@/lib/typography"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Check, Clock, AlertCircle, X } from "lucide-react"
import type { HumanRequest, UserProfile } from "../types"

interface HumanRequestsPanelProps {
  requests: HumanRequest[]
  users: UserProfile[]
  onComplete: (requestId: string, notes?: string) => Promise<void>
  onUpdateStatus: (requestId: string, status: HumanRequest['status']) => Promise<void>
}

const statusColors = {
  pending: "bg-yellow-100 text-yellow-800",
  in_progress: "bg-blue-100 text-blue-800",
  completed: "bg-green-100 text-green-800",
  cancelled: "bg-gray-100 text-gray-800"
}

const typeLabels = {
  reservation: "Reservation",
  appointment: "Appointment",
  payment: "Payment",
  other: "Other"
}

/**
 * HumanRequestsPanel
 * displays and manages human assistance requests.
 */
export function HumanRequestsPanel({
  requests,
  users,
  onComplete,
  onUpdateStatus
}: HumanRequestsPanelProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [notes, setNotes] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState<string | null>(null)

  const getUserName = (userId: string) => {
    const user = users.find(u => u.id === userId)
    if (user?.first_name || user?.last_name) {
      return `${user.first_name || ''} ${user.last_name || ''}`.trim()
    }
    return user?.email || user?.phone_number || 'Unknown'
  }

  const handleComplete = async (requestId: string) => {
    setLoading(requestId)
    try {
      await onComplete(requestId, notes[requestId])
      setNotes(prev => ({ ...prev, [requestId]: '' }))
      setExpandedId(null)
    } finally {
      setLoading(null)
    }
  }

  const handleStatusChange = async (requestId: string, status: HumanRequest['status']) => {
    setLoading(requestId)
    try {
      await onUpdateStatus(requestId, status)
    } finally {
      setLoading(null)
    }
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    })
  }

  const pendingRequests = requests.filter(r => r.status === 'pending' || r.status === 'in_progress')
  const completedRequests = requests.filter(r => r.status === 'completed' || r.status === 'cancelled')

  if (requests.length === 0) {
    return (
      <div className="flex-1 flex flex-col rounded-2xl overflow-hidden bg-gray-50 p-6">
        <div className="flex items-center justify-center h-full">
          <p className={cn(typography.body, "text-muted-foreground")}>
            No human requests yet
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col rounded-2xl overflow-hidden bg-gray-50">
      <div className="p-4 border-b border-gray-200 bg-white">
        <h2 className={cn(typography.h3, "text-gray-900")}>Human Requests</h2>
        <p className="text-sm text-gray-500 mt-1">
          {pendingRequests.length} pending, {completedRequests.length} completed
        </p>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {pendingRequests.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide">Active</h3>
            {pendingRequests.map(request => (
              <div
                key={request.id}
                className="bg-white rounded-xl p-4 shadow-sm border border-gray-100"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={cn(
                        "px-2 py-0.5 rounded-full text-xs font-medium",
                        statusColors[request.status]
                      )}>
                        {request.status.replace('_', ' ')}
                      </span>
                      <span className="text-xs text-gray-400">
                        {typeLabels[request.request_type]}
                      </span>
                    </div>
                    <h4 className="font-medium text-gray-900 truncate">{request.title}</h4>
                    <p className="text-sm text-gray-500">
                      {getUserName(request.user_id)} &middot; {formatDate(request.created_at)}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setExpandedId(expandedId === request.id ? null : request.id)}
                  >
                    {expandedId === request.id ? 'Hide' : 'View'}
                  </Button>
                </div>

                {expandedId === request.id && (
                  <div className="mt-4 pt-4 border-t border-gray-100 space-y-4">
                    <div>
                      <h5 className="text-sm font-medium text-gray-700 mb-1">Details</h5>
                      <p className="text-sm text-gray-600 whitespace-pre-wrap bg-gray-50 rounded-lg p-3">
                        {request.details}
                      </p>
                    </div>

                    <div>
                      <h5 className="text-sm font-medium text-gray-700 mb-1">Contact</h5>
                      <p className="text-sm text-gray-600">{request.phone_number}</p>
                    </div>

                    <div>
                      <h5 className="text-sm font-medium text-gray-700 mb-1">Completion notes (optional)</h5>
                      <textarea
                        className="w-full rounded-lg border border-gray-200 p-2 text-sm resize-none"
                        rows={2}
                        placeholder="Add notes about what was done..."
                        value={notes[request.id] || ''}
                        onChange={(e) => setNotes(prev => ({ ...prev, [request.id]: e.target.value }))}
                      />
                    </div>

                    <div className="flex gap-2">
                      {request.status === 'pending' && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleStatusChange(request.id, 'in_progress')}
                          disabled={loading === request.id}
                        >
                          <Clock className="w-4 h-4 mr-1" />
                          Start
                        </Button>
                      )}
                      <Button
                        size="sm"
                        onClick={() => handleComplete(request.id)}
                        disabled={loading === request.id}
                      >
                        <Check className="w-4 h-4 mr-1" />
                        Complete & Notify
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleStatusChange(request.id, 'cancelled')}
                        disabled={loading === request.id}
                      >
                        <X className="w-4 h-4 mr-1" />
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {completedRequests.length > 0 && (
          <div className="space-y-3 mt-6">
            <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide">Completed</h3>
            {completedRequests.map(request => (
              <div
                key={request.id}
                className="bg-white/60 rounded-xl p-4 border border-gray-100"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={cn(
                        "px-2 py-0.5 rounded-full text-xs font-medium",
                        statusColors[request.status]
                      )}>
                        {request.status}
                      </span>
                    </div>
                    <h4 className="font-medium text-gray-600 truncate">{request.title}</h4>
                    <p className="text-sm text-gray-400">
                      {getUserName(request.user_id)} &middot; {formatDate(request.created_at)}
                    </p>
                    {request.admin_notes && (
                      <p className="text-sm text-gray-500 mt-2 italic">
                        &quot;{request.admin_notes}&quot;
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
