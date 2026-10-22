import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { SUPABASE_ANON_KEY, SUPABASE_URL } from './env'

const USER_ROUTES = ['/challenges', '/leaderboard', '/team']
const GUEST_ROUTES = ['/login', '/register', '/admin/login']

function matches(pathname: string, routes: string[]) {
  return routes.some((r) => pathname === r || pathname.startsWith(r + '/'))
}

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request })

  const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
        response = NextResponse.next({ request })
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        )
      },
    },
  })

  // Jangan taruh logika lain di antara createServerClient dan getClaims.
  const { data } = await supabase.auth.getClaims()
  const signedIn = Boolean(data?.claims)
  const { pathname } = request.nextUrl

  const redirectTo = (path: string) => {
    const url = request.nextUrl.clone()
    url.pathname = path
    url.search = ''
    const res = NextResponse.redirect(url)
    response.cookies.getAll().forEach((c) => res.cookies.set(c))
    return res
  }

  if (!signedIn) {
    if (matches(pathname, USER_ROUTES)) return redirectTo('/login')
    if (pathname.startsWith('/admin') && !matches(pathname, ['/admin/login'])) {
      return redirectTo('/admin/login')
    }
  } else if (matches(pathname, GUEST_ROUTES)) {
    return redirectTo(pathname.startsWith('/admin') ? '/admin' : '/challenges')
  }

  return response
}
