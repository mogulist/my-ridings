import { type NextRequest, NextResponse } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

export async function middleware(request: NextRequest) {
  // Supabase 세션 업데이트
  const supabaseResponse = await updateSession(request)
  
  const host = request.headers.get('host') || ''
  const pathname = request.nextUrl.pathname
  
  const isAdminPath = pathname.startsWith('/admin')
  const isApiPath = pathname.startsWith('/api')
  const isAuthPath = pathname.startsWith('/admin/login') || pathname.startsWith('/admin/auth')
  
  // 로컬 개발 환경(localhost)이거나 admin 도메인인 경우
  const isLocalAdmin = host.includes('localhost') && isAdminPath
  const isAdminDomain = host.startsWith('admin.') || isLocalAdmin

  // admin.kfondo.cc 도메인에서만 /admin 경로 허용
  if (isAdminDomain) {
    // 1. 이미 로그인/인증 페이지에 있다면 건드리지 않음 (무한루프 방지)
    if (isAuthPath) {
      return supabaseResponse
    }

    // 2. admin 도메인인데 /admin 경로가 아니면 /admin으로 강제 이동
    // (단, 로컬에서는 메인 페이지도 봐야 하므로, 진짜 admin 도메인일 때만 적용)
    // /api 경로(예: GPX 업로드)는 리다이렉트 제외
    if (host.startsWith('admin.') && !isAdminPath && !isApiPath) {
      const url = request.nextUrl.clone()
      url.pathname = '/admin'
      return NextResponse.redirect(url)
    }
    
    return supabaseResponse
  }

  // 메인 도메인(www 등)에서 /admin 경로 접근 시 홈으로 리다이렉트
  if (isAdminPath && !isAdminDomain) {
    const url = request.nextUrl.clone()
    url.pathname = '/'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    /*
     * 다음을 제외한 모든 경로에 매칭:
     * - _next/static (정적 파일)
     * - _next/image (이미지 최적화)
     * - favicon.ico (파비콘)
     * - public 폴더 내 파일 (*.svg, *.png 등)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
