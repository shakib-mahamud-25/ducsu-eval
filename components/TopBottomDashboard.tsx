'use client';

import React from 'react';
import Image from 'next/image';
import { TrendingUp, TrendingDown, Star } from 'lucide-react';
import { LeaderScore } from '@/lib/firebase';

interface Leader {
  id: string;
  name: string;
  position: string;
  imageUrl: string;
}

interface TopBottomDashboardProps {
  leaders: Leader[];
  leaderScores: Map<string, LeaderScore>;
  minVotes?: number;
}

export default function TopBottomDashboard({
  leaders,
  leaderScores,
  minVotes = 10,
}: TopBottomDashboardProps) {
  const qualified = leaders
    .map((leader) => ({ leader, score: leaderScores.get(leader.id) }))
    .filter((entry): entry is { leader: Leader; score: LeaderScore } =>
      Boolean(entry.score && entry.score.totalVotes >= minVotes)
    )
    .sort((a, b) => b.score.averageScore - a.score.averageScore);

  const top3 = qualified.slice(0, 3);
  const bottom3 = qualified.length > 3 ? qualified.slice(-3).reverse() : [];

  if (qualified.length === 0) {
    return (
      <div className="bg-navy-800 rounded-xl p-6 sm:p-8 text-center mb-10">
        <p className="text-navy-200 text-sm">
          Not enough votes yet. Rankings appear once a leader has received at least {minVotes} votes.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-navy-800 rounded-xl p-6 sm:p-8 mb-10">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <RankColumn
          title="Highest Rated"
          icon={<TrendingUp size={18} className="text-gold-400" />}
          entries={top3}
          accentClass="border-gold-500/40"
        />
        {bottom3.length > 0 ? (
          <RankColumn
            title="Lowest Rated"
            icon={<TrendingDown size={18} className="text-navy-300" />}
            entries={bottom3}
            accentClass="border-navy-500"
          />
        ) : (
          <div className="flex items-center justify-center text-navy-400 text-sm">
            More rankings will appear as votes come in.
          </div>
        )}
      </div>
      {qualified.length < leaders.length && (
        <p className="text-navy-400 text-xs text-center mt-6">
          {leaders.length - qualified.length} leader{leaders.length - qualified.length !== 1 ? 's' : ''} still under {minVotes} votes and not yet ranked.
        </p>
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
  entries: { leader: Leader; score: LeaderScore }[];
  accentClass: string;
}) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        {icon}
        <h3 className="font-display text-lg text-paper">{title}</h3>
      </div>
      <div className="space-y-3">
        {entries.map(({ leader, score }, idx) => (
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
              <span className="text-paper text-sm font-semibold">{score.averageScore.toFixed(1)}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
