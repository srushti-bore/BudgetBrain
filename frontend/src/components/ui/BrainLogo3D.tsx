'use client';

import React from 'react';
import { Brain, Sparkles } from 'lucide-react';

interface BrainLogo3DProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export default function BrainLogo3D({ size = 'md', className = '' }: BrainLogo3DProps) {
  const sizeClasses = {
    sm: 'w-8 h-8 rounded-xl',
    md: 'w-10 h-10 rounded-2xl',
    lg: 'w-12 h-12 rounded-2xl',
  };

  const iconSizes = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6',
  };

  return (
    <div className={`relative shrink-0 [perspective:800px] group cursor-pointer select-none ${className}`}>
      {/* Subtle Ambient Glowing Shadow */}
      <div className="absolute -inset-0.5 rounded-2xl bg-sage opacity-30 blur-sm group-hover:opacity-60 transition-opacity duration-300 pointer-events-none" />

      {/* 3D Modern Squircle Icon Container */}
      <div
        className={`relative ${sizeClasses[size]} bg-gradient-to-br from-[#356B52] via-[#2F5E48] to-[#1C3B2D] border border-white/20 shadow-md shadow-[#1C3B2D]/30 flex items-center justify-center transition-transform duration-300 ease-out [transform-style:preserve-3d] group-hover:[transform:rotateY(14deg)_rotateX(-8deg)_scale(1.06)] overflow-hidden`}
      >
        {/* Top-down Specular Glass Sheen */}
        <div className="absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/25 to-transparent rounded-t-2xl pointer-events-none" />

        {/* Center 3D Floating Brain Emblem */}
        <div className="relative z-10 flex items-center justify-center [transform:translateZ(6px)]">
          <Brain className={`${iconSizes[size]} text-white drop-shadow-[0_2px_6px_rgba(0,0,0,0.3)]`} />
          
          {/* Subtle Golden Synapse Indicator */}
          <div className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-honey shadow-[0_0_6px_#E5A93C] animate-pulse" />
        </div>

        {/* Bottom Ambient Reflection */}
        <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/20 to-transparent pointer-events-none" />
      </div>
    </div>
  );
}
