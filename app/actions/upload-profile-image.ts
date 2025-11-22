'use server'

import { createClient } from '@/lib/supabase/server'

/** Uploads a profile image to Supabase Storage. */
export async function uploadProfileImage(formData: FormData) {
  try {
    const supabase = await createClient()

    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return { success: false, error: 'Not authenticated' }
    }

    const file = formData.get('file') as File
    if (!file) {
      return { success: false, error: 'No file provided' }
    }

    // validate file type and size
    const validTypes = ['image/png', 'image/jpeg', 'image/jpg']
    if (!validTypes.includes(file.type)) {
      return { success: false, error: 'Invalid file type. Please upload a PNG or JPEG image.' }
    }

    const maxSize = 5 * 1024 * 1024
    if (file.size > maxSize) {
      return { success: false, error: 'File too large. Maximum size is 5MB.' }
    }

    // upload to supabase storage
    const fileExt = file.name.split('.').pop()
    const fileName = `${user.id}-${Date.now()}.${fileExt}`
    const filePath = `profile_images/${fileName}`

    const { error: uploadError } = await supabase.storage
      .from('profile_images')
      .upload(filePath, file, { contentType: file.type, upsert: false })

    if (uploadError) {
      return { success: false, error: uploadError.message }
    }

    const { data: { publicUrl } } = supabase.storage
      .from('profile_images')
      .getPublicUrl(filePath)

    return { success: true, url: publicUrl }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to upload image' }
  }
}
