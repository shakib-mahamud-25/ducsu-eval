'use client';

import React, { useState, useEffect } from 'react';
import { Loader2, Lock, Info } from 'lucide-react';
import LeaderCard from '@/components/LeaderCard';
import TopBottomDashboard from '@/components/TopBottomDashboard';
import EvaluationFlow from '@/components/EvaluationFlow';
import { detectIncognitoMode, getVotedLeaderIds } from '@/lib/fingerprint';
import { listenToScores, listenToVotingWindow, LeaderScore, VotingWindowConfig } from '@/lib/firebase';

interface Leader {
  id: string;
  name: string;
  nameAlt?: string;
  position: string;
  category: 'top_executive' | 'secretarial' | 'executive_member';
  imageUrl: string;
  bio: string;
}

export default function Home() {
  const [leaders, setLeaders] = useState<Leader[]>([]);
  const [votedLeaderIds, setVotedLeaderIds] = useState<string[]>([]);
  const [leaderScores, setLeaderScores] = useState<Map<string, LeaderScore>>(new Map());
  const [isIncognito, setIsIncognito] = useState(false);
  const [showFlow, setShowFlow] = useState(false);
  const [votingWindow, setVotingWindow] = useState<VotingWindowConfig>({
    isOpen: true,
    startTime: null,
    endTime: null,
  });
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    const loadLeaders = async () => {
      try {
        const leadersUrl = process.env.NEXT_PUBLIC_LEADERS_JSON_URL;
        if (!leadersUrl) throw new Error('Leaders data URL not configured');
        const response = await fetch(leadersUrl);
        const data = await response.json();
        setLeaders(data.leaders || []);
      } catch (error) {
        console.error('Failed to load leaders:', error);
        setLoadError('Failed to load leader data. Please refresh the page.');
      }
    };
    loadLeaders();
  }, []);

  useEffect(() => {
    const checkStatus = async () => {
      setVotedLeaderIds(getVotedLeaderIds());
      const isPrivate = await detectIncognitoMode();
      setIsIncognito(isPrivate);
    };
    checkStatus();
  }, []);

  useEffect(() => {
    const unsubscribe = listenToScores((scores) => setLeaderScores(scores));
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const unsubscribe = listenToVotingWindow((config) => setVotingWindow(config));
    return () => unsubscribe();
  }, []);

  const handleFlowComplete = () => {
    setShowFlow(false);
    setVotedLeaderIds(getVotedLeaderIds());
  };

  if (leaders.length === 0) {
    return (
      <div className="min-h-screen bg-paper flex items-center justify-center">
        <div className="text-center">
          {loadError ? (
            <p className="text-maroon-600 text-sm">{loadError}</p>
          ) : (
            <>
              <Loader2 className="w-10 h-10 animate-spin text-navy-600 mx-auto mb-4" />
              <p className="text-navy-500 text-sm">Loading DUCSU evaluation platform…</p>
            </>
          )}
        </div>
      </div>
    );
  }

  if (isIncognito) {
    return (
      <div className="min-h-screen bg-paper flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl border border-navy-100 p-8 max-w-md text-center">
          <Lock className="w-12 h-12 text-maroon-500 mx-auto mb-4" />
          <h1 className="font-display text-2xl text-navy-800 mb-2">Private Browsing Detected</h1>
          <p className="text-navy-500 text-sm mb-6">
            To keep this evaluation fair, voting isn't available in private browsing mode.
            Please disable it and try again.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="bg-navy-700 text-white px-6 py-2.5 rounded-lg font-medium hover:bg-navy-800 transition"
          >
            Reload page
          </button>
        </div>
      </div>
    );
  }

  const totalRated = votedLeaderIds.length;

  const renderLeaderGrid = (category: Leader['category']) => (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
      {leaders
        .filter((l) => l.category === category)
        .map((leader) => {
          const score = leaderScores.get(leader.id);
          return (
            <LeaderCard
              key={leader.id}
              {...leader}
              alreadyVoted={votedLeaderIds.includes(leader.id)}
              score={score?.averageScore || 0}
              votes={score?.totalVotes || 0}
            />
          );
        })}
    </div>
  );

  return (
    <div className="min-h-screen bg-paper">
      {/* Header */}
      <div className="bg-navy-800 text-paper py-10 px-4">
        <div className="max-w-6xl mx-auto">
          <p className="text-navy-300 text-xs font-medium tracking-wide uppercase mb-2">
            University of Dhaka
          </p>
          <h1 className="font-display text-3xl sm:text-4xl font-semibold mb-2">
            DUCSU 2025 Leadership Evaluation
          </h1>
          <p className="text-navy-300 text-sm max-w-xl">
            Your honest, anonymous assessment of the students elected to represent you.
            Every voice here shapes accountability.
          </p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-10">
        {!votingWindow.isOpen ? (
          <div className="bg-navy-50 border border-navy-200 rounded-xl p-5 mb-8 flex items-start gap-3">
            <Info size={20} className="text-navy-500 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-medium text-navy-800">Voting is currently closed</h3>
              <p className="text-navy-500 text-sm mt-0.5">
                Results below reflect submissions received while voting was open.
              </p>
            </div>
          </div>
        ) : (
          <div className="bg-white border border-navy-100 rounded-xl p-5 mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h3 className="font-display text-lg text-navy-800">
                {totalRated > 0 ? `You've rated ${totalRated} of ${leaders.length}` : 'Rate your leaders'}
              </h3>
              <p className="text-navy-500 text-sm mt-0.5">
                {totalRated > 0
                  ? 'You can rate any leader you missed at any time.'
                  : 'Takes about two minutes. One rating per leader, submitted anonymously.'}
              </p>
            </div>
            <button
              onClick={() => setShowFlow(true)}
              className="bg-maroon-600 text-white font-semibold px-6 py-3 rounded-lg hover:bg-maroon-700 transition whitespace-nowrap"
            >
              {totalRated > 0 ? 'Continue evaluation' : 'Start evaluation'}
            </button>
          </div>
        )}

        <TopBottomDashboard leaders={leaders} leaderScores={leaderScores} minVotes={10} />

        <div className="space-y-12">
          <section>
            <h2 className="font-display text-2xl text-navy-800 mb-5 pb-3 border-b border-navy-100">
              Top Executive Posts
            </h2>
            {renderLeaderGrid('top_executive')}
          </section>

          <section>
            <h2 className="font-display text-2xl text-navy-800 mb-5 pb-3 border-b border-navy-100">
              Secretarial Positions
            </h2>
            {renderLeaderGrid('secretarial')}
          </section>

          <section>
            <h2 className="font-display text-2xl text-navy-800 mb-5 pb-3 border-b border-navy-100">
              Executive Members
            </h2>
            {renderLeaderGrid('executive_member')}
          </section>
        </div>
      </div>

      {showFlow && votingWindow.isOpen && (
        <EvaluationFlow
          leaders={leaders}
          onClose={() => setShowFlow(false)}
          onComplete={handleFlowComplete}
        />
      )}

      <div className="bg-navy-900 text-navy-400 py-6 text-center text-sm mt-12">
        <p>DUCSU 2025 Leadership Evaluation · Anonymous & Independent</p>
      </div>
    </div>
  );
}
