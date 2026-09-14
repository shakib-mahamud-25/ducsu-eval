'use client';

import React, { useState, useEffect } from 'react';
import { AlertCircle, CheckCircle, Loader2, X, Lock } from 'lucide-react';
import LeaderCard from '@/components/LeaderCard';
import RatingSlider from '@/components/RatingSlider';
import {
  detectIncognitoMode,
  hasUserVoted,
  markAsVoted,
  generateDeviceFingerprint,
  hashFingerprint,
  getOrCreateVisitorId,
} from '@/lib/fingerprint';
import { loadTurnstileScript, renderTurnstile, getTurnstileToken, resetTurnstile } from '@/lib/turnstile';

interface Leader {
  id: string;
  name: string;
  nameAlt?: string;
  position: string;
  category: 'top_executive' | 'secretarial' | 'executive_member';
  imageUrl: string;
  bio: string;
}

interface SubmissionState {
  loading: boolean;
  error: string | null;
  success: boolean;
  message: string;
}

export default function Home() {
  const [leaders, setLeaders] = useState<Leader[]>([]);
  const [selectedLeader, setSelectedLeader] = useState<Leader | null>(null);
  const [rating, setRating] = useState<number>(3);
  const [showModal, setShowModal] = useState(false);
  const [hasVoted, setHasVoted] = useState(false);
  const [isIncognito, setIsIncognito] = useState(false);
  const [submission, setSubmission] = useState<SubmissionState>({
    loading: false,
    error: null,
    success: false,
    message: '',
  });
  const [loadingMessage, setLoadingMessage] = useState('');
  const [turnstileVerified, setTurnstileVerified] = useState(false);
  const [turnstileWidgetId, setTurnstileWidgetId] = useState<string>('');

  // Load leaders data
  useEffect(() => {
    const loadLeaders = async () => {
      try {
        const leadersUrl = process.env.NEXT_PUBLIC_LEADERS_JSON_URL;
        if (!leadersUrl) {
          throw new Error('Leaders JSON URL not configured');
        }

        const response = await fetch(leadersUrl);
        const data = await response.json();
        setLeaders(data.leaders || []);
      } catch (error) {
        console.error('Failed to load leaders:', error);
        setSubmission({
          loading: false,
          error: 'Failed to load leaders data',
          success: false,
          message: '',
        });
      }
    };

    loadLeaders();
  }, []);

  // Check voting status and incognito mode on mount
  useEffect(() => {
    const checkStatus = async () => {
      // Check if user already voted
      setHasVoted(hasUserVoted());

      // Load Turnstile script
      try {
        await loadTurnstileScript();
      } catch (error) {
        console.error('Failed to load Turnstile:', error);
      }

      // Check incognito mode
      const isPrivate = await detectIncognitoMode();
      setIsIncognito(isPrivate);
    };

    checkStatus();
  }, []);

  const handleSelectLeader = (leader: Leader) => {
    setSelectedLeader(leader);
    setShowModal(true);
    setRating(3);
    setSubmission({ loading: false, error: null, success: false, message: '' });
    setTurnstileVerified(false);
    setTurnstileWidgetId('');

    // Render Turnstile in modal (delay ensures the container div exists in the DOM)
    setTimeout(() => {
      const containerId = 'turnstile-container';
      if (document.getElementById(containerId)) {
        const widgetId = renderTurnstile(
          containerId,
          () => setTurnstileVerified(true),
          () => setTurnstileVerified(false)
        );
        setTurnstileWidgetId(widgetId);
      }
    }, 100);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setSelectedLeader(null);
    resetTurnstile(turnstileWidgetId);
    setTurnstileVerified(false);
    setTurnstileWidgetId('');
    setSubmission({ loading: false, error: null, success: false, message: '' });
  };

  const handleSubmitRating = async () => {
    if (!selectedLeader) return;

    setSubmission({ loading: true, error: null, success: false, message: '' });
    setLoadingMessage('Generating device signature...');

    try {
      // Get Turnstile token
      const turnstileToken = getTurnstileToken(turnstileWidgetId);
      if (!turnstileVerified || !turnstileToken) {
        setSubmission({
          loading: false,
          error: 'Please complete the verification',
          success: false,
          message: '',
        });
        return;
      }

      // Generate device fingerprint
      setLoadingMessage('Analyzing device...');
      const deviceFP = await generateDeviceFingerprint();

      // Hash fingerprint for privacy
      const fpHash = hashFingerprint(deviceFP.fingerprintId);
      const visitorId = getOrCreateVisitorId();

      // Call submission API
      setLoadingMessage('Submitting your vote...');
      const response = await fetch('/api/submit-rating', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          leaderId: selectedLeader.id,
          score: rating,
          turnstileToken,
          fingerprintHash: fpHash,
          visitorId,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Submission failed');
      }

      // Mark as voted
      markAsVoted();
      setHasVoted(true);

      setSubmission({
        loading: false,
        error: null,
        success: true,
        message: data.message || 'Your vote has been recorded!',
      });

      // Auto-close modal after 2 seconds
      setTimeout(() => {
        handleCloseModal();
      }, 2000);
    } catch (error) {
      setSubmission({
        loading: false,
        error: error instanceof Error ? error.message : 'An error occurred',
        success: false,
        message: '',
      });
    }
  };

  // Render loading state
  if (leaders.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-purple-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading DUCSU evaluation platform...</p>
        </div>
      </div>
    );
  }

  // Render incognito warning
  if (isIncognito) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md text-center">
          <Lock className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Private Browsing Detected
          </h1>
          <p className="text-gray-600 mb-6">
            To maintain the integrity of this evaluation, you cannot vote in private browsing mode.
            Please disable private browsing and try again.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="bg-purple-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-purple-700 transition"
          >
            Reload Page
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-pink-600 text-white py-8 px-4 shadow-lg">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-4xl font-bold mb-2">DUCSU 2025 Leadership Evaluation</h1>
          <p className="text-purple-100">
            Rate the performance of our elected leaders • Anonymous & Secure
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-12">
        {/* Voting Status Banner */}
        {hasVoted && (
          <div className="bg-green-50 border-2 border-green-200 rounded-2xl p-4 mb-8 flex items-start gap-3">
            <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-green-900">Thank you for voting!</h3>
              <p className="text-green-800 text-sm">
                Your evaluation has been recorded. You can view live results below.
              </p>
            </div>
          </div>
        )}

        {/* Instructions */}
        <div className="bg-blue-50 border-2 border-blue-200 rounded-2xl p-4 mb-8 flex items-start gap-3">
          <AlertCircle className="w-6 h-6 text-blue-600 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-blue-900">How to Evaluate</h3>
            <p className="text-blue-800 text-sm">
              Click on any leader to rate them on a scale of 1-5. Your identity is completely anonymous and secure.
              Voting is limited to {hasVoted ? 'once per device' : 'one submission per device'}.
            </p>
          </div>
        </div>

        {/* Leaders Grid */}
        <div className="space-y-12">
          {/* Top Executive Posts */}
          <section>
            <h2 className="text-3xl font-bold text-gray-900 mb-6 pb-3 border-b-4 border-purple-600">
              Top Executive Posts
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {leaders
                .filter((l) => l.category === 'top_executive')
                .map((leader) => (
                  <LeaderCard
                    key={leader.id}
                    {...leader}
                    isSelected={selectedLeader?.id === leader.id}
                    onClick={() => !hasVoted && handleSelectLeader(leader)}
                  />
                ))}
            </div>
          </section>

          {/* Secretarial Positions */}
          <section>
            <h2 className="text-3xl font-bold text-gray-900 mb-6 pb-3 border-b-4 border-blue-600">
              Secretarial Positions
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {leaders
                .filter((l) => l.category === 'secretarial')
                .map((leader) => (
                  <LeaderCard
                    key={leader.id}
                    {...leader}
                    isSelected={selectedLeader?.id === leader.id}
                    onClick={() => !hasVoted && handleSelectLeader(leader)}
                  />
                ))}
            </div>
          </section>

          {/* Executive Members */}
          <section>
            <h2 className="text-3xl font-bold text-gray-900 mb-6 pb-3 border-b-4 border-green-600">
              Executive Members
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {leaders
                .filter((l) => l.category === 'executive_member')
                .map((leader) => (
                  <LeaderCard
                    key={leader.id}
                    {...leader}
                    isSelected={selectedLeader?.id === leader.id}
                    onClick={() => !hasVoted && handleSelectLeader(leader)}
                  />
                ))}
            </div>
          </section>
        </div>
      </div>

      {/* Rating Modal */}
      {showModal && selectedLeader && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="sticky top-0 bg-gradient-to-r from-purple-600 to-pink-600 text-white p-6 flex justify-between items-start rounded-t-3xl">
              <div>
                <h2 className="text-2xl font-bold">{selectedLeader.name}</h2>
                <p className="text-purple-100 text-sm mt-1">{selectedLeader.position}</p>
              </div>
              <button
                onClick={handleCloseModal}
                disabled={submission.loading}
                className="text-white hover:bg-white/20 p-2 rounded-full transition"
              >
                <X size={24} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-6">
              {/* Error State */}
              {submission.error && (
                <div className="bg-red-50 border-2 border-red-200 rounded-xl p-4">
                  <p className="text-red-800 font-semibold">{submission.error}</p>
                </div>
              )}

              {/* Success State */}
              {submission.success && (
                <div className="bg-green-50 border-2 border-green-200 rounded-xl p-4 text-center">
                  <CheckCircle className="w-12 h-12 text-green-600 mx-auto mb-2" />
                  <p className="text-green-800 font-semibold">{submission.message}</p>
                </div>
              )}

              {/* Loading State */}
              {submission.loading && (
                <div className="text-center py-8">
                  <Loader2 className="w-8 h-8 animate-spin text-purple-600 mx-auto mb-3" />
                  <p className="text-gray-600">{loadingMessage}</p>
                </div>
              )}

              {/* Rating Slider */}
              {!submission.loading && !submission.success && (
                <>
                  <div>
                    <RatingSlider value={rating} onChange={setRating} />
                  </div>

                  {/* Turnstile */}
                  <div id="turnstile-container" className="flex justify-center" />

                  {/* Submit Button */}
                  <button
                    onClick={handleSubmitRating}
                    disabled={submission.loading || !turnstileVerified}
                    className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold py-3 rounded-xl hover:shadow-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {submission.loading
                      ? 'Submitting...'
                      : turnstileVerified
                      ? 'Submit Rating'
                      : 'Complete verification above'}
                  </button>

                  {/* Privacy Notice */}
                  <p className="text-xs text-gray-600 text-center">
                    Your response is completely anonymous and encrypted. We never store your identity.
                  </p>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="bg-gray-900 text-gray-300 py-6 text-center text-sm mt-12">
        <p>DUCSU 2025 Leadership Evaluation • Anonymous & Secure Platform</p>
      </div>
    </div>
  );
}
