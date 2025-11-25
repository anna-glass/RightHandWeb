/**
 * lib/supabase/hooks.ts
 *
 * Author: Anna Glass
 * Created: 11/21/2025
 *
 * Right Hand, 2025. All rights reserved.
 */

"use client"

import { useEffect, useState } from 'react'
import { createClient } from './browser'
import type { Database } from './types'

// Create a single instance for the hooks
const supabase = createClient()

type Profile = Database['public']['Tables']['profiles']['Row']
type Task = Database['public']['Tables']['tasks']['Row']
type Address = Database['public']['Tables']['addresses']['Row']
type OnboardingResponse = Database['public']['Tables']['onboarding_responses']['Row']

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

    const profileId = id // Capture the non-null id

    async function fetchProfile() {
      try {
        setLoading(true)
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', profileId)
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

// Tasks Hooks
export function useTasks(userId: string | null) {
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    if (!userId) {
      setTasks([])
      setLoading(false)
      return
    }

    const uid = userId // Capture the non-null id

    async function fetchTasks() {
      try {
        setLoading(true)
        const { data, error } = await supabase
          .from('tasks')
          .select('*')
          .eq('user_id', uid)
          .order('created_at', { ascending: false })

        if (error) throw error
        setTasks(data || [])
      } catch (err) {
        setError(err as Error)
      } finally {
        setLoading(false)
      }
    }

    fetchTasks()

    // Subscribe to real-time changes
    const channel = supabase
      .channel(`tasks-${uid}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tasks',
          filter: `user_id=eq.${uid}`
        },
        () => {
          fetchTasks()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [userId])

  return { tasks, loading, error }
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

    const uid = userId // Capture the non-null id

    async function fetchAddresses() {
      try {
        setLoading(true)
        const { data, error } = await supabase
          .from('addresses')
          .select('*')
          .eq('user_id', uid)
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
      .channel(`addresses-${uid}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'addresses',
          filter: `user_id=eq.${uid}`
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

// Onboarding Responses Hook
export function useOnboardingResponse(userId: string | null) {
  const [onboardingResponse, setOnboardingResponse] = useState<OnboardingResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    if (!userId) {
      setOnboardingResponse(null)
      setLoading(false)
      return
    }

    const uid = userId // Capture the non-null id

    async function fetchOnboardingResponse() {
      try {
        setLoading(true)
        const { data, error } = await supabase
          .from('onboarding_responses')
          .select('*')
          .eq('user_id', uid)
          .maybeSingle()

        if (error) throw error
        setOnboardingResponse(data)
      } catch (err) {
        setError(err as Error)
      } finally {
        setLoading(false)
      }
    }

    fetchOnboardingResponse()

    // Subscribe to real-time changes
    const channel = supabase
      .channel(`onboarding-response-${uid}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'onboarding_responses',
          filter: `user_id=eq.${uid}`
        },
        () => {
          fetchOnboardingResponse()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [userId])

  return { onboardingResponse, loading, error }
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

export async function createTask(task: Database['public']['Tables']['tasks']['Insert']) {
  const { data, error } = await supabase
    .from('tasks')
    .insert(task)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function updateTask(id: string, updates: Database['public']['Tables']['tasks']['Update']) {
  const { data, error } = await supabase
    .from('tasks')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function deleteTask(id: string) {
  const { error } = await supabase
    .from('tasks')
    .delete()
    .eq('id', id)

  if (error) throw error
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
