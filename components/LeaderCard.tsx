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
  isSelected?: boolean;
  onClick?: () => void;
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
  isSelected = false,
  onClick,
  showScore = true,
}: LeaderCardProps) {
  const [imageError, setImageError] = useState(false);

  const getCategoryColor = () => {
    switch (category) {
      case 'top_executive':
        return 'from-purple-500 to-pink-500';
      case 'secretarial':
        return 'from-blue-500 to-cyan-500';
      case 'executive_member':
        return 'from-green-500 to-emerald-500';
      default:
        return 'from-gray-500 to-gray-700';
    }
  };

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
      onClick={onClick}
      className={`group relative overflow-hidden rounded-2xl bg-white shadow-lg transition-all duration-300 hover:shadow-2xl cursor-pointer ${
        isSelected ? 'ring-4 ring-purple-500 scale-105' : 'hover:scale-105'
      }`}
    >
      {/* Background gradient overlay */}
      <div
        className={`absolute inset-0 bg-gradient-to-br ${getCategoryColor()} opacity-0 group-hover:opacity-10 transition-opacity duration-300 z-0`}
      />

      {/* Content */}
      <div className="relative z-10 overflow-hidden">
        {/* Image Container */}
        <div className="relative h-80 w-full overflow-hidden bg-gray-200">
          {!imageError ? (
            <Image
              src={imageUrl}
              alt={name}
              fill
              className="object-cover transition-transform duration-500 group-hover:scale-110"
              onError={() => setImageError(true)}
              unoptimized
            />
          ) : (
            <div className="flex h-full items-center justify-center bg-gradient-to-br from-gray-300 to-gray-400">
              <div className="text-center">
                <div className="text-6xl font-bold text-gray-500 mb-2">
                  {name.charAt(0)}
                </div>
                <p className="text-gray-600 text-xs">Image unavailable</p>
              </div>
            </div>
          )}

          {/* Category Badge */}
          <div
            className={`absolute top-3 right-3 bg-gradient-to-r ${getCategoryColor()} text-white px-3 py-1 rounded-full text-xs font-semibold shadow-md`}
          >
            {getCategoryLabel()}
          </div>

          {/* Selection Indicator */}
          {isSelected && (
            <div className="absolute top-3 left-3 bg-green-500 text-white w-8 h-8 rounded-full flex items-center justify-center shadow-lg">
              ✓
            </div>
          )}
        </div>

        {/* Info Section */}
        <div className="p-4 space-y-2">
          {/* Name */}
          <div>
            <h3 className="text-lg font-bold text-gray-900 truncate">
              {name}
            </h3>
            {nameAlt && (
              <p className="text-xs text-gray-500 italic truncate">
                ({nameAlt})
              </p>
            )}
          </div>

          {/* Position */}
          <p className="text-sm text-gray-600 line-clamp-2 leading-tight">
            {position}
          </p>

          {/* Score Display */}
          {showScore && score > 0 && (
            <div className="pt-2 border-t border-gray-200 flex items-center justify-between">
              <div className="flex items-center gap-1">
                <Star size={16} className="text-yellow-400" fill="currentColor" />
                <span className="text-lg font-bold text-gray-900">
                  {score.toFixed(1)}
                </span>
              </div>
              <span className="text-xs text-gray-500">
                {votes} {votes === 1 ? 'vote' : 'votes'}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Hover gradient overlay */}
      <div
        className={`absolute inset-0 bg-gradient-to-t from-black/0 to-transparent opacity-0 group-hover:opacity-30 transition-opacity duration-300 z-0`}
      />
    </div>
  );
}
