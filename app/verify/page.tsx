'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, CheckCircle, AlertCircle, Mail } from 'lucide-react';
import { completeSignInFromLink, getPendingEmail, isValidDuEmail } from '@/lib/auth';

type Status = 'checking' | 'needs-email' | 'success' | 'error';

function VerifyContent() {
  const router = useRouter();
  const [status, setStatus] = useState<Status>('checking');
  const [error, setError] = useState<string | null>(null);
  const [manualEmail, setManualEmail] = useState('');

  const attemptSignIn = async (fallbackEmail?: string) => {
    setStatus('checking');
    setError(null);

    const result = await completeSignInFromLink(fallbackEmail);

    if (result.success) {
      setStatus('success');
      setTimeout(() => {
        router.push('/');
      }, 1800);
    } else if (result.error?.includes('re-enter')) {
      setStatus('needs-email');
    } else {
      setStatus('error');
      setError(result.error || 'Verification failed. Please request a new link.');
    }
  };

  useEffect(() => {
    // If the link is being opened on the same device/browser that requested
    // it, the pending email is already in localStorage and sign-in completes
    // automatically. Otherwise we fall back to asking for it again.
    const pending = getPendingEmail();
    attemptSignIn(pending || undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValidDuEmail(manualEmail)) {
      setError('Please enter the same DU email you used to request this link.');
      return;
    }
    attemptSignIn(manualEmail);
  };

  return (
    <div className="min-h-screen bg-paper flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl border border-navy-100 p-8 max-w-md w-full text-center">
        {status === 'checking' && (
          <>
            <Loader2 className="w-10 h-10 animate-spin text-navy-600 mx-auto mb-4" />
            <p className="text-navy-600">Verifying your email…</p>
          </>
        )}

        {status === 'success' && (
          <>
            <CheckCircle className="w-12 h-12 text-maroon-500 mx-auto mb-4" />
            <h1 className="font-display text-2xl text-navy-800 mb-2">Verified</h1>
            <p className="text-navy-500 text-sm">Taking you back to the evaluation…</p>
          </>
        )}

        {status === 'needs-email' && (
          <>
            <Mail className="w-11 h-11 text-navy-500 mx-auto mb-4" />
            <h1 className="font-display text-xl text-navy-800 mb-2">Confirm your email</h1>
            <p className="text-navy-500 text-sm mb-5">
              You opened this link on a different device or browser. Please re-enter your DU
              email to finish verifying.
            </p>
            <form onSubmit={handleManualSubmit} className="space-y-3">
              <input
                type="email"
                value={manualEmail}
                onChange={(e) => setManualEmail(e.target.value)}
                placeholder="name-id@dept.du.ac.bd"
                className="w-full border border-navy-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-maroon-400"
              />
              {error && <p className="text-maroon-600 text-sm text-left">{error}</p>}
              <button
                type="submit"
                className="w-full bg-maroon-600 text-white font-semibold py-2.5 rounded-lg hover:bg-maroon-700 transition"
              >
                Confirm
              </button>
            </form>
          </>
        )}

        {status === 'error' && (
          <>
            <AlertCircle className="w-11 h-11 text-maroon-500 mx-auto mb-4" />
            <h1 className="font-display text-xl text-navy-800 mb-2">Verification failed</h1>
            <p className="text-navy-500 text-sm mb-6">{error}</p>
            <button
              onClick={() => router.push('/')}
              className="bg-navy-700 text-white px-6 py-2.5 rounded-lg font-medium hover:bg-navy-800 transition"
            >
              Back to home
            </button>
          </>
        )}
      </div>
    </div>
  );
}

function VerifyLoadingFallback() {
  return (
    <div className="min-h-screen bg-paper flex items-center justify-center">
      <Loader2 className="w-10 h-10 animate-spin text-navy-600" />
    </div>
  );
}

export default function VerifyPage() {
  return (
    <Suspense fallback={<VerifyLoadingFallback />}>
      <VerifyContent />
    </Suspense>
  );
}
