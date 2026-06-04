import { NextResponse } from 'next/server';

import type { NextRequest } from 'next/server';



const PUBLIC_PATHS = ['/login', '/register', '/cadastro'];



const PROTECTED_PREFIXES = [
  '/clients',
  '/collaborators',
  '/documents',
  '/admin',
];



export function middleware(request: NextRequest) {

  const { pathname } = request.nextUrl;

  const isPublic = PUBLIC_PATHS.some((p) => pathname.startsWith(p));

  const hasToken = request.cookies.has('access_token');

  const isProtected = PROTECTED_PREFIXES.some((p) => pathname.startsWith(p));



  if (!isPublic && !hasToken && isProtected) {

    return NextResponse.redirect(new URL('/login', request.url));

  }



  if (hasToken && (pathname === '/login' || pathname === '/register')) {

    return NextResponse.redirect(new URL('/clients', request.url));

  }



  if (pathname === '/documents' || pathname.startsWith('/documents/')) {

    return NextResponse.redirect(new URL('/clients', request.url));

  }



  if (pathname === '/') {

    return NextResponse.redirect(

      new URL(hasToken ? '/clients' : '/login', request.url),

    );

  }



  return NextResponse.next();

}



export const config = {

  matcher: [

    '/',

    '/login',

    '/register',

    '/documents/:path*',

    '/clients/:path*',

    '/collaborators/:path*',

    '/admin',

    '/admin/:path*',

    '/cadastro/:path*',

  ],

};


