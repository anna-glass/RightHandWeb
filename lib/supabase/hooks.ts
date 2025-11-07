"use client"

import { useEffect, useState } from 'react'
import { supabase } from './client'
import type { Database } from './types'

type Profile = Database['public']['Tables']['profiles']['Row']
type Conversation = Database['public']['Tables']['conversations']['Row']
type Message = Database['public']['Tables']['messages']['Row']
type Address = Database['public']['Tables']['addresses']['Row']

// Profiles Hooks
export function useProfiles() {
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    async function fetchProfiles() {
      try {
        setLoading(true)
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .order('first_name', { ascending: true })

        if (error) throw error
        setProfiles(data || [])
      } catch (err) {
        setError(err as Error)
      } finally {
        setLoading(false)
      }
    }

    fetchProfiles()

    // Subscribe to real-time changes
    const channel = supabase
      .channel('profiles-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'profiles' },
        () => {
          fetchProfiles()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  return { profiles, loading, error }
}

export function useProfile(id: string | null) {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    if (!id) {
      setProfile(null)
      setLoading(false)
      return
    }

    async function fetchProfile() {
      try {
        setLoading(true)
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', id)
          .single()

        if (error) throw error
        setProfile(data)
      } catch (err) {
        setError(err as Error)
      } finally {
        setLoading(false)
      }
    }

    fetchProfile()
  }, [id])

  return { profile, loading, error }
}

// Conversations Hooks
export function useConversations() {
  const [conversations, setConversations] = useState<(Conversation & { profile?: Profile })[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    async function fetchConversations() {
      try {
        setLoading(true)
        const { data, error } = await supabase
          .from('conversations')
          .select(`
            *,
            profile:profiles!user_id(*)
          `)
          .order('created_at', { ascending: false })

        if (error) throw error
        setConversations(data || [])
      } catch (err) {
        setError(err as Error)
      } finally {
        setLoading(false)
      }
    }

    fetchConversations()

    // Subscribe to real-time changes
    const channel = supabase
      .channel('conversations-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'conversations' },
        () => {
          fetchConversations()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  return { conversations, loading, error }
}

export function useConversation(id: string | null) {
  const [conversation, setConversation] = useState<(Conversation & { profile?: Profile }) | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    if (!id) {
      setConversation(null)
      setLoading(false)
      return
    }

    async function fetchConversation() {
      try {
        setLoading(true)
        const { data, error } = await supabase
          .from('conversations')
          .select(`
            *,
            profile:profiles!user_id(*)
          `)
          .eq('id', id)
          .single()

        if (error) throw error
        setConversation(data)
      } catch (err) {
        setError(err as Error)
      } finally {
        setLoading(false)
      }
    }

    fetchConversation()
  }, [id])

  return { conversation, loading, error }
}

// Messages Hooks
export function useMessages(conversationId: string | null) {
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    if (!conversationId) {
      setMessages([])
      setLoading(false)
      return
    }

    async function fetchMessages() {
      try {
        setLoading(true)
        const { data, error } = await supabase
          .from('messages')
          .select('*')
          .eq('conversation_id', conversationId)
          .order('created_at', { ascending: true })

        if (error) throw error
        setMessages(data || [])
      } catch (err) {
        setError(err as Error)
      } finally {
        setLoading(false)
      }
    }

    fetchMessages()

    // Subscribe to real-time changes
    const channel = supabase
      .channel(`messages-${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`
        },
        () => {
          fetchMessages()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [conversationId])

  return { messages, loading, error }
}

// Addresses Hooks
export function useAddresses(userId: string | null) {
  const [addresses, setAddresses] = useState<Address[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    if (!userId) {
      setAddresses([])
      setLoading(false)
      return
    }

    async function fetchAddresses() {
      try {
        setLoading(true)
        const { data, error } = await supabase
          .from('addresses')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })

        if (error) throw error
        setAddresses(data || [])
      } catch (err) {
        setError(err as Error)
      } finally {
        setLoading(false)
      }
    }

    fetchAddresses()

    // Subscribe to real-time changes
    const channel = supabase
      .channel(`addresses-${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'addresses',
          filter: `user_id=eq.${userId}`
        },
        () => {
          fetchAddresses()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [userId])

  return { addresses, loading, error }
}

// Mutation functions
export async function createProfile(profile: Database['public']['Tables']['profiles']['Insert']) {
  const { data, error } = await supabase
    .from('profiles')
    .insert(profile)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function updateProfile(id: string, updates: Database['public']['Tables']['profiles']['Update']) {
  const { data, error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function deleteProfile(id: string) {
  const { error } = await supabase
    .from('profiles')
    .delete()
    .eq('id', id)

  if (error) throw error
}

export async function createConversation(conversation: Database['public']['Tables']['conversations']['Insert']) {
  const { data, error } = await supabase
    .from('conversations')
    .insert(conversation)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function updateConversation(id: string, updates: Database['public']['Tables']['conversations']['Update']) {
  const { data, error } = await supabase
    .from('conversations')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function createMessage(message: Database['public']['Tables']['messages']['Insert']) {
  const { data, error } = await supabase
    .from('messages')
    .insert(message)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function createAddress(address: Database['public']['Tables']['addresses']['Insert']) {
  const { data, error } = await supabase
    .from('addresses')
    .insert(address)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function updateAddress(id: string, updates: Database['public']['Tables']['addresses']['Update']) {
  const { data, error } = await supabase
    .from('addresses')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function deleteAddress(id: string) {
  const { error } = await supabase
    .from('addresses')
    .delete()
    .eq('id', id)

  if (error) throw error
}
