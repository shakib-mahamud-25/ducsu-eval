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
  const fillPercentage = ((value - 1) / 4) * 100;

  const getDescription = () => {
    if (value < 2) return 'Poor performance';
    if (value < 3) return 'Below average';
    if (value < 4) return 'Average performance';
    if (value < 4.5) return 'Good performance';
    return 'Excellent performance';
  };

  return (
    <div className="w-full space-y-5">
      {/* Star Display */}
      <div className="flex items-center justify-center gap-2">
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((star) => (
            <div key={star} className="relative">
              <Star size={36} className="text-navy-100" fill="currentColor" />
              {star <= fullStars && (
                <div className="absolute inset-0 overflow-hidden">
                  <Star size={36} className="text-maroon-500" fill="currentColor" />
                </div>
              )}
              {star === fullStars + 1 && hasHalfStar && (
                <div
                  className="absolute inset-0 overflow-hidden"
                  style={{ width: `${(value % 1) * 100}%` }}
                >
                  <Star size={36} className="text-maroon-500" fill="currentColor" />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Score Display */}
      <div className="text-center">
        <div className="font-display text-4xl font-semibold text-navy-800">
          {value.toFixed(1)}
        </div>
        <p className="text-xs text-navy-400 mt-1 uppercase tracking-wide">{getDescription()}</p>
      </div>

      {/* Slider Container */}
      <div
        ref={sliderRef}
        className="relative w-full h-2 bg-navy-100 rounded-full overflow-hidden"
      >
        <div
          className="absolute h-full bg-maroon-500 transition-all duration-150 rounded-full"
          style={{ width: `${fillPercentage}%` }}
        />

        <input
          type="range"
          min="1"
          max="5"
          step="0.5"
          value={value}
          onChange={handleSliderChange}
          onMouseDown={handleMouseDown}
          disabled={disabled}
          className="absolute w-full h-full opacity-0 cursor-pointer z-10"
          style={{ margin: 0 }}
        />

        <div
          className={`absolute top-1/2 w-5 h-5 bg-white border-[3px] border-maroon-500 rounded-full shadow transform -translate-y-1/2 pointer-events-none transition-all duration-150 ${
            isDragging ? 'scale-125' : 'scale-100'
          }`}
          style={{ left: `calc(${fillPercentage}% - 10px)` }}
        />
      </div>

      {/* Labels */}
      <div className="flex justify-between text-xs text-navy-400 px-1">
        <span>Poor</span>
        <span>Average</span>
        <span>Excellent</span>
      </div>
    </div>
  );
}
