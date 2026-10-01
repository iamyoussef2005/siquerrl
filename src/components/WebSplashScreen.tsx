'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';

export function WebSplashScreen() {
  const { isLoading: isAuthLoading } = useAuth();
  const [isVisible, setIsVisible] = useState(true);
  const [shouldRender, setShouldRender] = useState(true);

  useEffect(() => {
    // Show splash for smooth brand experience, waiting for auth or min 1.8s
    const timer = setTimeout(() => {
      setIsVisible(false);
    }, 1800);

    return () => clearTimeout(timer);
  }, []);

  // Once fade-out finishes, unmount component from DOM
  useEffect(() => {
    if (!isVisible) {
      const unmountTimer = setTimeout(() => {
        setShouldRender(false);
      }, 700);
      return () => clearTimeout(unmountTimer);
    }
  }, [isVisible]);

  if (!shouldRender) return null;

  return (
    <div
      className={`fixed inset-0 z-[999999] bg-white flex items-center justify-center transition-opacity duration-700 ease-out select-none ${
        isVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'
      }`}
      aria-hidden={!isVisible}
    >
      <div className="relative w-full h-full flex items-center justify-center overflow-hidden bg-white">
        {/* Responsive Picture: Landscape on desktop/tablets, Portrait on mobile screens */}
        <picture className="w-full h-full flex items-center justify-center">
          <source media="(max-width: 640px)" srcSet="/web-splash-mobile.png" />
          <img
            src="/web-splash.png"
            alt="سنجاب دليفري - شاشة البداية"
            className="w-full h-full object-cover object-center"
            loading="eager"
            fetchPriority="high"
          />
        </picture>

        {/* Subtle Bottom Loading Indicator & Status */}
        <div className="absolute bottom-6 sm:bottom-10 left-0 right-0 flex flex-col items-center justify-center px-4 pointer-events-none">
          <div className="flex items-center gap-2 mb-2">
            <span className="w-2.5 h-2.5 rounded-full bg-orange-500 animate-ping" />
            <span className="w-2 h-2 rounded-full bg-orange-400" />
            <span className="w-1.5 h-1.5 rounded-full bg-orange-300" />
          </div>
          <p className="text-slate-700 font-bold text-xs sm:text-sm tracking-wide bg-white/90 backdrop-blur-md py-1.5 px-4 rounded-full border border-orange-200/80 shadow-md">
            سنجاب دليفري • جاري تهيئة المنظومة...
          </p>
        </div>
      </div>
    </div>
  );
}
