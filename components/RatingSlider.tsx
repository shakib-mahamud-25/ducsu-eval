'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Star } from 'lucide-react';

interface RatingSliderProps {
  value: number;
  onChange: (value: number) => void;
  disabled?: boolean;
}

export default function RatingSlider({
  value,
  onChange,
  disabled = false,
}: RatingSliderProps) {
  const sliderRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(parseFloat(e.target.value));
  };

  const handleMouseDown = () => {
    setIsDragging(true);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  useEffect(() => {
    window.addEventListener('mouseup', handleMouseUp);
    return () => window.removeEventListener('mouseup', handleMouseUp);
  }, []);

  // Calculate filled stars
  const fullStars = Math.floor(value);
  const hasHalfStar = value % 1 !== 0;
  const fillPercentage = (value / 5) * 100;

  // Get color based on rating
  const getColor = () => {
    if (value < 2) return 'from-red-400 to-red-600';
    if (value < 3) return 'from-orange-400 to-orange-600';
    if (value < 4) return 'from-yellow-400 to-yellow-600';
    return 'from-green-400 to-green-600';
  };

  return (
    <div className="w-full space-y-4">
      {/* Star Display */}
      <div className="flex items-center justify-center gap-2">
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((star) => (
            <div key={star} className="relative">
              {/* Background star */}
              <Star
                size={40}
                className="text-gray-300"
                fill="currentColor"
              />
              {/* Filled star overlay */}
              {star <= fullStars && (
                <div className="absolute inset-0 overflow-hidden">
                  <Star
                    size={40}
                    className={`text-yellow-400 bg-gradient-to-r ${getColor()}`}
                    fill="currentColor"
                  />
                </div>
              )}
              {/* Partial star */}
              {star === fullStars + 1 && hasHalfStar && (
                <div
                  className="absolute inset-0 overflow-hidden"
                  style={{ width: `${(value % 1) * 100}%` }}
                >
                  <Star
                    size={40}
                    className={`text-yellow-400 bg-gradient-to-r ${getColor()}`}
                    fill="currentColor"
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Score Display */}
      <div className="text-center">
        <div className="text-5xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
          {value.toFixed(1)}
        </div>
        <p className="text-sm text-gray-500 mt-2">/ 5.0</p>
      </div>

      {/* Slider Container */}
      <div
        ref={sliderRef}
        className="relative w-full h-3 bg-gray-200 rounded-full overflow-hidden cursor-pointer shadow-md"
      >
        {/* Filled track */}
        <div
          className={`absolute h-full bg-gradient-to-r ${getColor()} transition-all duration-150 rounded-full`}
          style={{ width: `${fillPercentage}%` }}
        />

        {/* Slider input (hidden) */}
        <input
          type="range"
          min="1"
          max="5"
          step="0.1"
          value={value}
          onChange={handleSliderChange}
          onMouseDown={handleMouseDown}
          disabled={disabled}
          className="absolute w-full h-full opacity-0 cursor-pointer z-10"
          style={{ margin: 0 }}
        />

        {/* Visual thumb */}
        <div
          className={`absolute top-1/2 w-6 h-6 bg-white border-4 border-purple-600 rounded-full shadow-lg transform -translate-y-1/2 pointer-events-none transition-all duration-150 ${
            isDragging ? 'scale-125' : 'scale-100'
          }`}
          style={{ left: `calc(${fillPercentage}% - 12px)` }}
        />
      </div>

      {/* Labels */}
      <div className="flex justify-between text-xs text-gray-600 px-1">
        <span>Poor</span>
        <span>Average</span>
        <span>Excellent</span>
      </div>

      {/* Rating Description */}
      <div className="text-center text-sm text-gray-600 mt-3">
        {value < 2 && '😞 Poor Performance'}
        {value >= 2 && value < 3 && '😐 Below Average'}
        {value >= 3 && value < 4 && '🙂 Average Performance'}
        {value >= 4 && value < 4.5 && '😊 Good Performance'}
        {value >= 4.5 && '⭐ Excellent Performance'}
      </div>
    </div>
  );
}
