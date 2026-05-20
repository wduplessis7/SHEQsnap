import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const pathname = req.nextUrl.pathname;

    // Admin-only routes
    if (pathname.startsWith("/admin") && token?.role !== "ADMIN") {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }

    const res = NextResponse.next();
    // Prevent Cloudflare and other CDNs from caching HTML pages — JS/CSS assets
    // have content-hash filenames so they can be cached forever via /_next/static/
    res.headers.set("Cache-Control", "no-store, no-cache, must-revalidate");
    return res;
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
  }
);

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/near-misses/:path*",
    "/incidents/:path*",
    "/actions/:path*",
    "/reports/:path*",
    "/admin/:path*",
    "/checklists/:path*",
    "/logs/:path*",
    "/licenses/:path*",
    "/observations/:path*",
    "/inductions/:path*",
    "/moc/:path*",
    "/help/:path*",
  ],
};
