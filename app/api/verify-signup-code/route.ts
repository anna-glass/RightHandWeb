import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { code } = await request.json()

    // Check if the provided code matches the one in .env
    const validCode = process.env.SIGNUP_CODE

    if (!validCode) {
      console.error('SIGNUP_CODE not set in environment variables')
      return NextResponse.json({ valid: false }, { status: 500 })
    }

    const isValid = code === validCode

    return NextResponse.json({ valid: isValid })
  } catch (error) {
    console.error('Error verifying signup code:', error)
    return NextResponse.json({ valid: false }, { status: 500 })
  }
}
