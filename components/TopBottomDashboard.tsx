'use client';

import React from 'react';
import Image from 'next/image';
import { TrendingUp, TrendingDown, Star, Zap, ShieldCheck } from 'lucide-react';
import { DualTrackLeaderScore } from '@/lib/firebase';

interface Leader {
  id: string;
  name: string;
  position: string;
  imageUrl: string;
}

interface TopBottomDashboardProps {
  leaders: Leader[];
  leaderScores: Map<string, DualTrackLeaderScore>;
  minVotes?: number;
}

interface QualifiedEntry {
  leader: Leader;
  averageScore: number;
  totalVotes: number;
}

function buildQualified(
  leaders: Leader[],
  leaderScores: Map<string, DualTrackLeaderScore>,
  track: 'unverified' | 'verified',
  minVotes: number
): QualifiedEntry[] {
  return leaders
    .map((leader) => {
      const entry = leaderScores.get(leader.id);
      const bucket = entry?.[track];
      return { leader, averageScore: bucket?.averageScore ?? 0, totalVotes: bucket?.totalVotes ?? 0 };
    })
    .filter((entry) => entry.totalVotes >= minVotes)
    .sort((a, b) => b.averageScore - a.averageScore);
}

export default function TopBottomDashboard({
  leaders,
  leaderScores,
  minVotes = 10,
}: TopBottomDashboardProps) {
  const unverifiedQualified = buildQualified(leaders, leaderScores, 'unverified', minVotes);
  const verifiedQualified = buildQualified(leaders, leaderScores, 'verified', minVotes);

  return (
    <div className="space-y-6 mb-10">
      <TrackSection
        title="Unverified Votes"
        icon={<Zap size={16} className="text-maroon-400" />}
        qualified={unverifiedQualified}
        totalLeaders={leaders.length}
        minVotes={minVotes}
        accentClass="border-maroon-500/40"
      />
      <TrackSection
        title="Verified Votes (DU Email)"
        icon={<ShieldCheck size={16} className="text-gold-400" />}
        qualified={verifiedQualified}
        totalLeaders={leaders.length}
        minVotes={minVotes}
        accentClass="border-gold-500/40"
      />
    </div>
  );
}

function TrackSection({
  title,
  icon,
  qualified,
  totalLeaders,
  minVotes,
  accentClass,
}: {
  title: string;
  icon: React.ReactNode;
  qualified: QualifiedEntry[];
  totalLeaders: number;
  minVotes: number;
  accentClass: string;
}) {
  const top3 = qualified.slice(0, 3);
  const bottom3 = qualified.length > 3 ? qualified.slice(-3).reverse() : [];

  return (
    <div className="bg-navy-800 rounded-xl p-6 sm:p-8">
      <div className="flex items-center gap-2 mb-5">
        {icon}
        <h2 className="font-display text-lg text-paper">{title}</h2>
      </div>

      {qualified.length === 0 ? (
        <p className="text-navy-300 text-sm text-center py-6">
          Not enough votes yet. Rankings appear once a leader has received at least {minVotes}{' '}
          votes in this category.
        </p>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <RankColumn
              title="Highest Rated"
              icon={<TrendingUp size={16} className="text-gold-400" />}
              entries={top3}
              accentClass={accentClass}
            />
            {bottom3.length > 0 ? (
              <RankColumn
                title="Lowest Rated"
                icon={<TrendingDown size={16} className="text-navy-300" />}
                entries={bottom3}
                accentClass="border-navy-500"
              />
            ) : (
              <div className="flex items-center justify-center text-navy-400 text-sm">
                More rankings will appear as votes come in.
              </div>
            )}
          </div>
          {qualified.length < totalLeaders && (
            <p className="text-navy-400 text-xs text-center mt-6">
              {totalLeaders - qualified.length} leader
              {totalLeaders - qualified.length !== 1 ? 's' : ''} still under {minVotes} votes in
              this category and not yet ranked.
            </p>
          )}
        </>
      )}
    </div>
  );
}

function RankColumn({
  title,
  icon,
  entries,
  accentClass,
}: {
  title: string;
  icon: React.ReactNode;
  entries: QualifiedEntry[];
  accentClass: string;
}) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        {icon}
        <h3 className="font-display text-base text-paper">{title}</h3>
      </div>
      <div className="space-y-3">
        {entries.map(({ leader, averageScore }, idx) => (
          <div
            key={leader.id}
            className={`flex items-center gap-3 bg-navy-700/60 rounded-lg p-2.5 border ${accentClass}`}
          >
            <span className="font-display text-navy-400 text-sm w-4 text-center flex-shrink-0">
              {idx + 1}
            </span>
            <div className="relative w-10 h-10 rounded-full overflow-hidden bg-navy-600 flex-shrink-0">
              <Image src={leader.imageUrl} alt={leader.name} fill className="object-cover" unoptimized />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-paper text-sm font-medium truncate">{leader.name}</p>
              <p className="text-navy-300 text-xs truncate">{leader.position}</p>
            </div>
            <div className="flex items-center gap-1 flex-shrink-0">
              <Star size={12} className="text-gold-400" fill="currentColor" />
              <span className="text-paper text-sm font-semibold">{averageScore.toFixed(1)}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
