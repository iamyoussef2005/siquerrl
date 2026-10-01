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

        {/* Subtle Bottom Loading Line & Status */}
        <div className="absolute bottom-6 sm:bottom-8 left-0 right-0 flex flex-col items-center justify-center px-4 pointer-events-none">
          <div className="w-36 h-1 bg-slate-100/90 rounded-full overflow-hidden shadow-xs border border-orange-100">
            <div className="w-full h-full bg-gradient-to-r from-orange-400 via-orange-500 to-amber-500 rounded-full animate-pulse" />
          </div>
          <p className="mt-2.5 text-slate-600 font-bold text-xs tracking-wide bg-white/80 backdrop-blur-xs py-1 px-3.5 rounded-full border border-orange-100/80 shadow-xs">
            سنجاب دليفري • جاري تهيئة المنظومة...
          </p>
        </div>
      </div>
    </div>
  );
}
