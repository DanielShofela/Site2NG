import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';

interface BannerRotatorProps {
  images?: string[];
  interval?: number;
  heightClass?: string;
  className?: string;
}

export default function BannerRotator({
  images = [],
  interval = 5000,
  heightClass = "h-48 sm:h-64",
  className = ""
}: BannerRotatorProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (!images || images.length <= 1) return;

    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % images.length);
    }, interval);

    return () => clearInterval(timer);
  }, [images, interval]);

  // Handle case where images list is empty
  if (!images || images.length === 0) {
    return null;
  }

  return (
    <div id="banner-rotator-container" className={`relative overflow-hidden rounded-[32px] border border-slate-100 shadow-sm w-full bg-slate-900 ${heightClass} ${className}`}>
      {/* Slide rendering with smooth cross-fade animation */}
      <div id="banner-rotator-slides" className="absolute inset-0">
        <AnimatePresence mode="wait">
          <motion.img
            key={currentIndex}
            src={images[currentIndex]}
            alt={`Banner Slide ${currentIndex}`}
            initial={{ opacity: 0, scale: 1.02 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.7, ease: "easeInOut" }}
            className="w-full h-full object-cover"
            referrerPolicy="no-referrer"
          />
        </AnimatePresence>
      </div>

      {/* Ambient gradient overlay */}
      <div id="banner-rotator-overlay" className="absolute inset-0 bg-linear-to-t from-black/55 via-black/15 to-transparent pointer-events-none" />

      {/* Slide indicator dots */}
      {images.length > 1 && (
        <div id="banner-rotator-dots" className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5 z-10 bg-black/35 backdrop-blur-md px-3 py-1.5 rounded-full">
          {images.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setCurrentIndex(idx)}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                idx === currentIndex 
                  ? 'bg-orange-500 w-4' 
                  : 'bg-white/60 w-1.5 hover:bg-white'
              }`}
              title={`Aller à la diapositive ${idx + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
