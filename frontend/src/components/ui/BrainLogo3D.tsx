'use client';

import React from 'react';
import { Brain, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';

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
    <div className={`relative shrink-0 [perspective:1000px] group cursor-pointer select-none ${className}`}>
      {/* Dynamic Ambient Synaptic Halo */}
      <div className="absolute -inset-1 rounded-2xl bg-gradient-to-r from-sage via-honey to-sage opacity-40 blur-md group-hover:opacity-75 transition-opacity duration-500 animate-pulse pointer-events-none" />

      {/* 3D Container with Multi-Axis Transform */}
      <div
        className={`relative ${sizeClasses[size]} bg-gradient-to-br from-[#2D5A45] via-[#3E7259] to-[#1E3D2F] border border-sage/40 shadow-lg shadow-sage/30 flex items-center justify-center transition-all duration-700 [transform-style:preserve-3d] group-hover:[transform:rotateY(180deg)_rotateX(12deg)_scale(1.05)]`}
      >
        {/* Front Face: Cognitive Logic (Emerald & Silver Brain with Frontal Synaptic Spark) */}
        <div className="absolute inset-0 flex items-center justify-center [backface-visibility:hidden] [transform:translateZ(8px)]">
          <div className="relative">
            <Brain className={`${iconSizes[size]} text-white drop-shadow-[0_2px_8px_rgba(255,255,255,0.4)]`} />
            {/* Prefrontal Cortex Decision Synapse (Psychology Spark) */}
            <motion.div
              animate={{ scale: [1, 1.4, 1], opacity: [0.7, 1, 0.7] }}
              transition={{ repeat: Infinity, duration: 2.4, ease: 'easeInOut' }}
              className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-honey shadow-[0_0_8px_#E5A93C]"
            />
          </div>
        </div>

        {/* Back Face: Intuitive Wealth Psychology (Golden Synaptic Core) */}
        <div className="absolute inset-0 flex items-center justify-center [backface-visibility:hidden] [transform:rotateY(180deg)_translateZ(8px)] rounded-2xl bg-gradient-to-br from-[#8C5E1A] via-[#C68A28] to-[#604010] border border-honey/40">
          <div className="relative flex items-center justify-center">
            <Brain className={`${iconSizes[size]} text-cream drop-shadow-[0_2px_10px_rgba(229,169,60,0.6)]`} />
            <Sparkles className="w-2.5 h-2.5 text-white absolute -bottom-1 -left-1 animate-spin" style={{ animationDuration: '4s' }} />
          </div>
        </div>

        {/* 3D Depth Layer (Simulated Extrusion Block) */}
        <div className="absolute inset-0 rounded-2xl bg-[#14261D] [transform:translateZ(-4px)] opacity-80" />
      </div>
    </div>
  );
}
