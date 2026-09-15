import { clerkMiddleware } from '@clerk/nextjs/server';

// Every route in this app is public (anonymous voting is the whole point),
// so this middleware just needs to run on all routes to make Clerk's
// auth() / currentUser() available in Server Components and Route Handlers.
// It does NOT block or redirect anyone.
export default clerkMiddleware();

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
};
