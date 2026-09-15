'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { Star } from 'lucide-react';

interface LeaderCardProps {
  id: string;
  name: string;
  nameAlt?: string;
  position: string;
  imageUrl: string;
  category: 'top_executive' | 'secretarial' | 'executive_member';
  score?: number;
  votes?: number;
  alreadyVoted?: boolean;
  showScore?: boolean;
}

export default function LeaderCard({
  id,
  name,
  nameAlt,
  position,
  imageUrl,
  category,
  score = 0,
  votes = 0,
  alreadyVoted = false,
  showScore = true,
}: LeaderCardProps) {
  const [imageError, setImageError] = useState(false);

  const getCategoryLabel = () => {
    switch (category) {
      case 'top_executive':
        return 'Top Executive';
      case 'secretarial':
        return 'Secretary';
      case 'executive_member':
        return 'Executive Member';
      default:
        return '';
    }
  };

  return (
    <div
      data-leader-id={id}
      className="group relative overflow-hidden rounded-xl bg-white border border-navy-100 transition-shadow duration-200 hover:shadow-lg"
    >
      {/* Image */}
      <div className="relative h-64 w-full overflow-hidden bg-navy-50">
        {!imageError ? (
          <Image
            src={imageUrl}
            alt={name}
            fill
            className="object-cover"
            onError={() => setImageError(true)}
            unoptimized
          />
        ) : (
          <div className="flex h-full items-center justify-center bg-navy-100">
            <div className="text-center">
              <div className="font-display text-5xl text-navy-400 mb-1">
                {name.charAt(0)}
              </div>
              <p className="text-navy-400 text-xs">Photo unavailable</p>
            </div>
          </div>
        )}

        <div className="absolute top-3 left-3 bg-navy-800/85 text-paper px-2.5 py-1 rounded text-[11px] font-medium tracking-wide">
          {getCategoryLabel()}
        </div>

        {alreadyVoted && (
          <div className="absolute top-3 right-3 bg-maroon-600 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs shadow">
            ✓
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-4 space-y-2.5">
        <div>
          <h3 className="font-display text-base text-navy-800 leading-snug truncate">
            {name}
          </h3>
          {nameAlt && (
            <p className="text-xs text-navy-400 italic truncate">({nameAlt})</p>
          )}
        </div>

        <p className="text-sm text-navy-500 line-clamp-2 leading-tight">
          {position}
        </p>

        {showScore && (
          <div className="pt-2.5 border-t border-navy-100 space-y-1.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1">
                <Star size={14} className="text-gold-500" fill="currentColor" />
                <span className="text-sm font-semibold text-navy-800">
                  {votes > 0 ? score.toFixed(1) : '—'}
                </span>
                <span className="text-navy-300 text-xs">/ 5.0</span>
              </div>
              <span className="text-xs text-navy-400">
                {votes} {votes === 1 ? 'vote' : 'votes'}
              </span>
            </div>
            <div className="w-full h-1 bg-navy-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-maroon-500 rounded-full transition-all duration-500"
                style={{ width: `${(score / 5) * 100}%` }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
