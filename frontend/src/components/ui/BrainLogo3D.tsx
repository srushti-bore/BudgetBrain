'use client';

import React from 'react';
import { Brain } from 'lucide-react';
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
    <div className={`relative shrink-0 [perspective:800px] select-none cursor-pointer ${className}`}>
      {/* Subtle Breathing Ambient Glow */}
      <motion.div
        animate={{
          scale: [1, 1.12, 1],
          opacity: [0.35, 0.65, 0.35],
        }}
        transition={{
          repeat: Infinity,
          duration: 4,
          ease: 'easeInOut',
        }}
        className="absolute -inset-1 rounded-2xl bg-sage/40 blur-md pointer-events-none"
      />

      {/* 3D Modern Squircle Icon with Continuous Gentle Float & Interactive Tilt */}
      <motion.div
        animate={{
          y: [0, -3.5, 0],
          rotateY: [0, 7, 0, -7, 0],
          rotateX: [0, -3, 0, 3, 0],
        }}
        transition={{
          repeat: Infinity,
          duration: 5.5,
          ease: 'easeInOut',
        }}
        whileHover={{
          scale: 1.09,
          rotateY: 16,
          rotateX: -10,
          transition: { duration: 0.25 },
        }}
        whileTap={{
          scale: 0.94,
        }}
        className={`relative ${sizeClasses[size]} bg-gradient-to-br from-[#356B52] via-[#2F5E48] to-[#1C3B2D] border border-white/25 shadow-lg shadow-[#1C3B2D]/35 flex items-center justify-center [transform-style:preserve-3d] overflow-hidden`}
      >
        {/* Top-down Specular Glass Sheen */}
        <div className="absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/25 to-transparent rounded-t-2xl pointer-events-none" />

        {/* Periodic Elegant Shimmer Light Sweep */}
        <motion.div
          animate={{
            x: ['-150%', '220%'],
          }}
          transition={{
            repeat: Infinity,
            repeatDelay: 3.5,
            duration: 1.6,
            ease: 'easeInOut',
          }}
          className="absolute inset-0 w-1/2 h-full bg-gradient-to-r from-transparent via-white/30 to-transparent -skew-x-20 pointer-events-none"
        />

        {/* Center 3D Floating Brain Emblem */}
        <div className="relative z-10 flex items-center justify-center [transform:translateZ(8px)]">
          <Brain className={`${iconSizes[size]} text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.35)]`} />

          {/* Glowing Pulsing Synaptic Node */}
          <motion.div
            animate={{
              scale: [1, 1.4, 1],
              opacity: [0.8, 1, 0.8],
            }}
            transition={{
              repeat: Infinity,
              duration: 2,
              ease: 'easeInOut',
            }}
            className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-honey shadow-[0_0_8px_#E5A93C]"
          />
        </div>

        {/* Bottom Ambient Reflection */}
        <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/25 to-transparent pointer-events-none" />
      </motion.div>
    </div>
  );
}
