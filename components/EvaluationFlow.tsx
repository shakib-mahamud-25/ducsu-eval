'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { ChevronLeft, ChevronRight, SkipForward, X, Loader2, CheckCircle, AlertCircle, ShieldCheck, Zap, Mail } from 'lucide-react';
import Image from 'next/image';
import RatingSlider from './RatingSlider';
import {
  getDraftRatings,
  setDraftRating,
  getSkippedLeaderIds,
  markLeaderSkipped,
  getDraftPosition,
  setDraftPosition,
  getDraftTrack,
  setDraftTrack,
  clearDraftState,
  generateDeviceFingerprint,
  hashFingerprint,
  getOrCreateVisitorId,
  markLeaderAsVoted,
} from '@/lib/fingerprint';
import { loadTurnstileScript, renderTurnstile, getTurnstileToken, resetTurnstile } from '@/lib/turnstile';
import { sendVerificationLink, getCurrentUser, hashEmail } from '@/lib/auth';
import { VoteTrack } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/lib/auth';

interface Leader {
  id: string;
  name: string;
  nameAlt?: string;
  position: string;
  category: 'top_executive' | 'secretarial' | 'executive_member';
  imageUrl: string;
  bio: string;
}

interface EvaluationFlowProps {
  leaders: Leader[];
  onClose: () => void;
  onComplete: () => void;
}

type Screen = 'choose-track' | 'email-entry' | 'email-sent' | 'rating' | 'summary' | 'submitting';

export default function EvaluationFlow({ leaders, onClose, onComplete }: EvaluationFlowProps) {
  const [track, setTrack] = useState<VoteTrack | null>(() => getDraftTrack());
  const [screen, setScreen] = useState<Screen>(() => {
    const existingTrack = getDraftTrack();
    if (!existingTrack) return 'choose-track';
    if (existingTrack === 'verified' && !getCurrentUser()) return 'choose-track';
    return 'rating';
  });

  const [position, setPosition] = useState(() => getDraftPosition());
  const [ratings, setRatings] = useState<Record<string, number>>(() => getDraftRatings());
  const [currentScore, setCurrentScore] = useState(3);
  const [imageError, setImageError] = useState(false);
  const [turnstileVerified, setTurnstileVerified] = useState(false);
  const [turnstileWidgetId, setTurnstileWidgetId] = useState('');
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  // Email-entry state (verified track only)
  const [emailInput, setEmailInput] = useState('');
  const [emailError, setEmailError] = useState<string | null>(null);
  const [sendingLink, setSendingLink] = useState(false);
  const [isSignedIn, setIsSignedIn] = useState(!!getCurrentUser());

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setIsSignedIn(!!user);
      // If a verified user completes sign-in (e.g. returning from /verify
      // in the same tab context) while this flow is mounted, move them
      // straight into rating.
      if (user && track === 'verified' && screen !== 'rating' && screen !== 'summary' && screen !== 'submitting') {
        setScreen('rating');
      }
    });
    return () => unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [track]);

  const currentLeader = leaders[position];
  const ratedCount = Object.keys(ratings).length;

  useEffect(() => {
    if (currentLeader) {
      setCurrentScore(ratings[currentLeader.id] ?? 3);
      setImageError(false);
    }
  }, [position, currentLeader, ratings]);

  const persistRating = useCallback((leaderId: string, score: number) => {
    setDraftRating(leaderId, score);
    setRatings((prev) => ({ ...prev, [leaderId]: score }));
  }, []);

  const goToNextUnrated = useCallback(
    (fromIndex: number, latestRatings: Record<string, number>) => {
      for (let i = fromIndex + 1; i < leaders.length; i++) {
        if (!(leaders[i].id in latestRatings)) {
          setPosition(i);
          setDraftPosition(i);
          return;
        }
      }
      setScreen('summary');
    },
    [leaders]
  );

  // ============ TRACK SELECTION ============
  const handleChooseTrack = (chosen: VoteTrack) => {
    setTrack(chosen);
    setDraftTrack(chosen);
    if (chosen === 'unverified') {
      setScreen('rating');
    } else {
      setScreen(getCurrentUser() ? 'rating' : 'email-entry');
    }
  };

  // ============ EMAIL ENTRY (verified track) ============
  const handleSendLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setEmailError(null);
    setSendingLink(true);
    try {
      await sendVerificationLink(emailInput);
      setScreen('email-sent');
    } catch (err) {
      setEmailError(err instanceof Error ? err.message : 'Could not send the verification link.');
    } finally {
      setSendingLink(false);
    }
  };

  const handleRateAndContinue = () => {
    if (!currentLeader) return;
    const updated = { ...ratings, [currentLeader.id]: currentScore };
    persistRating(currentLeader.id, currentScore);
    goToNextUnrated(position, updated);
  };

  const handleSkip = () => {
    if (!currentLeader) return;
    markLeaderSkipped(currentLeader.id);
    goToNextUnrated(position, ratings);
  };

  const handleBack = () => {
    if (position === 0) return;
    const prevIndex = position - 1;
    setPosition(prevIndex);
    setDraftPosition(prevIndex);
    setScreen('rating');
  };

  const jumpToLeader = (leaderId: string) => {
    const idx = leaders.findIndex((l) => l.id === leaderId);
    if (idx >= 0) {
      setPosition(idx);
      setDraftPosition(idx);
      setScreen('rating');
    }
  };

  const unratedLeaders = leaders.filter((l) => !(l.id in ratings));

  // Render Turnstile only for the unverified track, on the summary screen
  useEffect(() => {
    if (track !== 'unverified') return;
    if (screen !== 'summary' || unratedLeaders.length > 0) return;

    let cancelled = false;
    (async () => {
      try {
        await loadTurnstileScript();
      } catch (err) {
        console.error('Failed to load Turnstile:', err);
      }
      if (cancelled) return;
      setTimeout(() => {
        const containerId = 'turnstile-final-container';
        if (document.getElementById(containerId)) {
          const widgetId = renderTurnstile(
            containerId,
            () => setTurnstileVerified(true),
            () => setTurnstileVerified(false)
          );
          setTurnstileWidgetId(widgetId);
        }
      }, 100);
    })();

    return () => {
      cancelled = true;
    };
  }, [screen, unratedLeaders.length, track]);

  const handleFinalSubmit = async () => {
    setSubmitError(null);

    if (track === 'unverified') {
      const token = getTurnstileToken(turnstileWidgetId);
      if (!turnstileVerified || !token) {
        setSubmitError('Please complete the verification above.');
        return;
      }

      setScreen('submitting');
      try {
        const deviceFP = await generateDeviceFingerprint();
        const fpHash = hashFingerprint(deviceFP.fingerprintId);
        const visitorId = getOrCreateVisitorId();

        const response = await fetch('/api/submit-rating', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ratings: Object.entries(ratings).map(([leaderId, score]) => ({ leaderId, score })),
            track: 'unverified',
            turnstileToken: token,
            fingerprintHash: fpHash,
            visitorId,
          }),
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Submission failed');

        Object.keys(ratings).forEach((leaderId) => markLeaderAsVoted(leaderId));
        clearDraftState();
        setSubmitSuccess(true);
        setTimeout(() => onComplete(), 2000);
      } catch (error) {
        setSubmitError(
          error instanceof Error
            ? error.message
            : 'Something went wrong. Your ratings are still saved on this device — please try submitting again.'
        );
        setTurnstileVerified(false);
        setScreen('summary');
        resetTurnstile(turnstileWidgetId);
      }
      return;
    }

    // Verified track
    const user = getCurrentUser();
    if (!user) {
      setSubmitError('Your session expired. Please verify your email again.');
      setScreen('email-entry');
      return;
    }

    setScreen('submitting');
    try {
      const idToken = await user.getIdToken();

      const response = await fetch('/api/submit-rating', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ratings: Object.entries(ratings).map(([leaderId, score]) => ({ leaderId, score })),
          track: 'verified',
          firebaseIdToken: idToken,
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Submission failed');

      clearDraftState();
      setSubmitSuccess(true);
      setTimeout(() => onComplete(), 2000);
    } catch (error) {
      setSubmitError(
        error instanceof Error
          ? error.message
          : 'Something went wrong. Your ratings are still saved on this device — please try submitting again.'
      );
      setScreen('summary');
    }
  };

  // ============ CHOOSE TRACK ============
  if (screen === 'choose-track') {
    return (
      <FlowShell onClose={onClose}>
        <div className="p-6 sm:p-8">
          <h2 className="font-display text-2xl text-navy-800 mb-1">How would you like to vote?</h2>
          <p className="text-navy-500 text-sm mb-6">
            Both options are anonymous. Choose the one that fits you.
          </p>

          <div className="space-y-3">
            <button
              onClick={() => handleChooseTrack('unverified')}
              className="w-full text-left border border-navy-200 rounded-xl p-4 hover:border-maroon-300 hover:bg-maroon-50 transition flex gap-3"
            >
              <Zap size={22} className="text-navy-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-navy-800">Quick vote</p>
                <p className="text-navy-500 text-sm mt-0.5">
                  No login needed. Takes a moment, protected by standard bot and duplicate checks.
                </p>
              </div>
            </button>

            <button
              onClick={() => handleChooseTrack('verified')}
              className="w-full text-left border border-navy-200 rounded-xl p-4 hover:border-maroon-300 hover:bg-maroon-50 transition flex gap-3"
            >
              <ShieldCheck size={22} className="text-navy-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-navy-800">Verified vote (DU email)</p>
                <p className="text-navy-500 text-sm mt-0.5">
                  Sign in with your DU student email for a verified result. Your identity is
                  never linked to your ratings — only used to confirm one vote per student.
                </p>
              </div>
            </button>
          </div>
        </div>
      </FlowShell>
    );
  }

  // ============ EMAIL ENTRY ============
  if (screen === 'email-entry') {
    return (
      <FlowShell onClose={onClose}>
        <div className="p-6 sm:p-8">
          <h2 className="font-display text-2xl text-navy-800 mb-1">Verify your DU email</h2>
          <p className="text-navy-500 text-sm mb-6">
            We'll send a sign-in link to your official DU student email
            (e.g. name-id@dept.du.ac.bd). Tap it to continue — no password needed.
          </p>

          <form onSubmit={handleSendLink} className="space-y-3">
            <input
              type="email"
              value={emailInput}
              onChange={(e) => setEmailInput(e.target.value)}
              placeholder="name-id@dept.du.ac.bd"
              className="w-full border border-navy-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-maroon-400"
            />
            {emailError && <p className="text-maroon-600 text-sm">{emailError}</p>}
            <button
              type="submit"
              disabled={sendingLink}
              className="w-full bg-maroon-600 text-white font-semibold py-3 rounded-lg hover:bg-maroon-700 transition disabled:opacity-50"
            >
              {sendingLink ? 'Sending…' : 'Send verification link'}
            </button>
          </form>

          <button
            onClick={() => setScreen('choose-track')}
            className="w-full text-navy-400 text-sm mt-4 hover:text-navy-600 transition"
          >
            ← Back
          </button>
        </div>
      </FlowShell>
    );
  }

  // ============ EMAIL SENT ============
  if (screen === 'email-sent') {
    return (
      <FlowShell onClose={onClose}>
        <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
          <Mail className="w-12 h-12 text-navy-500 mb-4" />
          <h2 className="font-display text-2xl text-navy-800 mb-2">Check your inbox</h2>
          <p className="text-navy-500 text-sm mb-1">We sent a sign-in link to</p>
          <p className="text-navy-800 font-medium mb-4">{emailInput}</p>
          <p className="text-navy-400 text-xs max-w-xs">
            Open it on this device to come straight back here. If it lands on another device,
            you'll just be asked to confirm your email once more.
          </p>
        </div>
      </FlowShell>
    );
  }

  // ============ SUBMITTING / SUCCESS ============
  if (screen === 'submitting') {
    return (
      <FlowShell onClose={onClose}>
        <div className="flex flex-col items-center justify-center py-20 text-center">
          {submitSuccess ? (
            <>
              <CheckCircle className="w-14 h-14 text-maroon-500 mb-4" />
              <h2 className="font-display text-2xl text-navy-800 mb-2">Evaluation recorded</h2>
              <p className="text-navy-500 text-sm">Thank you for taking the time to evaluate your representatives.</p>
            </>
          ) : (
            <>
              <Loader2 className="w-10 h-10 animate-spin text-maroon-500 mb-4" />
              <p className="text-navy-600">Saving your evaluation…</p>
            </>
          )}
        </div>
      </FlowShell>
    );
  }

  // ============ SUMMARY ============
  if (screen === 'summary') {
    const readyToSubmit = unratedLeaders.length === 0;
    const canSubmit = track === 'unverified' ? turnstileVerified : isSignedIn;

    return (
      <FlowShell onClose={onClose}>
        <div className="p-6 sm:p-8">
          <h2 className="font-display text-2xl text-navy-800 mb-1">
            {readyToSubmit ? 'Ready to submit' : 'Almost there'}
          </h2>
          <p className="text-navy-500 text-sm mb-6">
            {readyToSubmit
              ? `You've rated all ${leaders.length} leaders. Review below, then submit once.`
              : `You've rated ${ratedCount} of ${leaders.length}. Tap any leader below to rate them.`}
          </p>

          {!readyToSubmit && (
            <div className="space-y-2 mb-6 max-h-72 overflow-y-auto">
              {unratedLeaders.map((leader) => (
                <button
                  key={leader.id}
                  onClick={() => jumpToLeader(leader.id)}
                  className="w-full flex items-center justify-between px-4 py-3 rounded-lg border border-navy-100 bg-white hover:border-maroon-300 hover:bg-maroon-50 transition text-left"
                >
                  <div>
                    <p className="font-medium text-navy-800 text-sm">{leader.name}</p>
                    <p className="text-navy-400 text-xs">{leader.position}</p>
                  </div>
                  <ChevronRight size={18} className="text-navy-300" />
                </button>
              ))}
            </div>
          )}

          {readyToSubmit && (
            <>
              {submitError && (
                <div className="bg-maroon-50 border border-maroon-200 rounded-lg p-3 mb-4 flex items-start gap-2">
                  <AlertCircle size={16} className="text-maroon-600 flex-shrink-0 mt-0.5" />
                  <p className="text-maroon-700 text-sm">{submitError}</p>
                </div>
              )}

              {track === 'unverified' ? (
                <>
                  <p className="text-navy-500 text-xs mb-3">
                    One last check to confirm you're not a bot, then your evaluation is submitted.
                  </p>
                  <div id="turnstile-final-container" className="flex justify-center mb-4" />
                </>
              ) : (
                <p className="text-navy-500 text-xs mb-3">
                  Signed in as a verified DU student. Submitting will record your evaluation as
                  verified and cannot be repeated with the same email.
                </p>
              )}

              <button
                onClick={handleFinalSubmit}
                disabled={!canSubmit}
                className="w-full bg-maroon-600 text-white font-semibold py-3 rounded-lg hover:bg-maroon-700 transition disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {canSubmit ? 'Submit evaluation' : 'Complete verification above'}
              </button>
            </>
          )}

          <button
            onClick={() => {
              setPosition(Math.min(position, leaders.length - 1));
              setScreen('rating');
            }}
            className="w-full text-navy-400 text-sm mt-3 hover:text-navy-600 transition"
          >
            Continue reviewing leaders
          </button>
        </div>
      </FlowShell>
    );
  }

  // ============ RATING ============
  if (!currentLeader) return null;

  return (
    <FlowShell onClose={onClose}>
      <div className="px-6 sm:px-8 pt-5">
        <div className="flex items-center justify-between text-xs text-navy-400 mb-2">
          <span>Leader {position + 1} of {leaders.length}</span>
          <span>{ratedCount} rated</span>
        </div>
        <div className="w-full h-1.5 bg-navy-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-maroon-500 transition-all duration-300"
            style={{ width: `${((position + 1) / leaders.length) * 100}%` }}
          />
        </div>
      </div>

      <div className="p-6 sm:p-8">
        <div className="flex items-center gap-4 mb-6">
          <div className="relative w-16 h-16 rounded-full overflow-hidden bg-navy-100 flex-shrink-0 ring-2 ring-navy-100">
            {!imageError ? (
              <Image
                src={currentLeader.imageUrl}
                alt={currentLeader.name}
                fill
                className="object-cover"
                onError={() => setImageError(true)}
                unoptimized
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-navy-400 font-display text-xl">
                {currentLeader.name.charAt(0)}
              </div>
            )}
          </div>
          <div>
            <h2 className="font-display text-xl text-navy-800 leading-tight">{currentLeader.name}</h2>
            {currentLeader.nameAlt && (
              <p className="text-navy-400 text-xs italic">({currentLeader.nameAlt})</p>
            )}
            <p className="text-maroon-600 text-sm font-medium">{currentLeader.position}</p>
          </div>
        </div>

        <RatingSlider value={currentScore} onChange={setCurrentScore} />

        <div className="flex items-center gap-2 mt-6">
          <button
            onClick={handleBack}
            disabled={position === 0}
            className="flex items-center justify-center gap-1 px-4 py-3 rounded-lg border border-navy-200 text-navy-600 hover:bg-navy-50 transition disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <ChevronLeft size={18} />
          </button>
          <button
            onClick={handleSkip}
            className="flex items-center justify-center gap-1.5 px-4 py-3 rounded-lg border border-navy-200 text-navy-500 hover:bg-navy-50 transition text-sm"
          >
            <SkipForward size={16} />
            Skip
          </button>
          <button
            onClick={handleRateAndContinue}
            className="flex-1 flex items-center justify-center gap-1.5 bg-maroon-600 text-white font-semibold py-3 rounded-lg hover:bg-maroon-700 transition"
          >
            Rate & continue
            <ChevronRight size={18} />
          </button>
        </div>
      </div>
    </FlowShell>
  );
}

function FlowShell({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-navy-900/60 flex items-center justify-center z-50 p-4">
      <div className="bg-paper rounded-2xl shadow-2xl max-w-md w-full max-h-[92vh] overflow-y-auto relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-navy-300 hover:text-navy-600 transition z-10"
          aria-label="Close evaluation"
        >
          <X size={22} />
        </button>
        {children}
      </div>
    </div>
  );
}
