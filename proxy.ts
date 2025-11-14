import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Skip middleware for API routes
  if (request.nextUrl.pathname.startsWith('/api/')) {
    return supabaseResponse
  }

  // Refresh session if expired
  const { data: { user } } = await supabase.auth.getUser()

  // Protected routes - redirect to login if not authenticated
  // Allow /create-account, /onboarding, and /welcome for invite/checkout flow
  if (!user && !request.nextUrl.pathname.startsWith('/login') && !request.nextUrl.pathname.startsWith('/create-account') && !request.nextUrl.pathname.startsWith('/onboarding') && !request.nextUrl.pathname.startsWith('/welcome')) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  // If user is authenticated, check if they're a righthand
  if (user) {
    const { data: righthand } = await supabase
      .from('righthands')
      .select('id')
      .eq('id', user.id)
      .maybeSingle()

    // If user is not a righthand and not on member-allowed pages, redirect appropriately
    if (!righthand) {
      // Members should only access create-account, onboarding, and welcome pages
      if (!request.nextUrl.pathname.startsWith('/create-account') &&
          !request.nextUrl.pathname.startsWith('/onboarding') &&
          !request.nextUrl.pathname.startsWith('/welcome')) {
        // Member trying to access admin portal, redirect to welcome
        const url = request.nextUrl.clone()
        url.pathname = '/welcome'
        return NextResponse.redirect(url)
      }
    } else {
      // Righthand user - redirect from login to members page
      if (request.nextUrl.pathname.startsWith('/login')) {
        const url = request.nextUrl.clone()
        url.pathname = '/members'
        return NextResponse.redirect(url)
      }

      // Prevent righthands from accessing member-only pages
      if (request.nextUrl.pathname.startsWith('/create-account') ||
          request.nextUrl.pathname.startsWith('/onboarding') ||
          request.nextUrl.pathname.startsWith('/welcome')) {
        const url = request.nextUrl.clone()
        url.pathname = '/members'
        return NextResponse.redirect(url)
      }
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
