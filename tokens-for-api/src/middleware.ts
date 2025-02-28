import { NextRequest } from "next/server"

import { auth0 } from "./lib/auth0"

export async function middleware(request: NextRequest) {
  if (request.nextUrl.pathname === "/connect-google") {
    const linkUrl = new URL("/auth/login", request.nextUrl.host);
    linkUrl.searchParams.set("connection", "google-oauth2");
    const nextRequest = new NextRequest(linkUrl, request);
    return await auth0.middleware(nextRequest);
  }
  return await auth0.middleware(request)
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico, sitemap.xml, robots.txt (metadata files)
     */
    "/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)",
  ],
}