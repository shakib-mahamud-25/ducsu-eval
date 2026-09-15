'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

// This page is no longer part of the verification flow. Clerk's email
// one-time-code sign-in happens entirely inline in EvaluationFlow (enter
// email -> enter 6-digit code -> done), so there's no separate landing page
// to click through from an email link.
//
// This route is kept only so that any old bookmarked/cached links to
// /verify don't 404 — it just bounces the visitor back home.
export default function VerifyPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/');
  }, [router]);

  return (
    <div className="min-h-screen bg-paper flex items-center justify-center">
      <Loader2 className="w-10 h-10 animate-spin text-navy-600" />
    </div>
  );
}
