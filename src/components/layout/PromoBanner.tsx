import React, { useState, useEffect } from 'react';
import { useSiteConfig } from '@/contexts/SiteConfigContext';
import { motion, AnimatePresence } from 'motion/react';
import { Megaphone, X } from 'lucide-react';

export default function PromoBanner() {
  const { config } = useSiteConfig();
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  const images = config.bannerImages || [];
  const hasImages = config.bannerBgType === 'image' && images.length > 0;
  const isAutomatic = hasImages && images.length > 1;

  // Handles auto rotation of background image rollovers
  useEffect(() => {
    if (!isAutomatic) {
      setCurrentImageIndex(0);
      return;
    }

    const intervalTime = config.bannerAutoChangeInterval || 5000;
    const interval = setInterval(() => {
      setCurrentImageIndex((prev) => (prev + 1) % images.length);
    }, intervalTime);

    return () => clearInterval(interval);
  }, [isAutomatic, images.length, config.bannerAutoChangeInterval]);

  if (!config.bannerEnabled || !config.bannerContent) {
    return null;
  }

  // Choose display content style
  const textColor = config.bannerTextColor || '#ffffff';
  const bgColor = config.bannerBgColor || '#ea580c';

  const bannerStyle: React.CSSProperties = {
    color: textColor,
    backgroundColor: !hasImages ? bgColor : undefined,
    position: 'relative',
    overflow: 'hidden'
  };

  return (
    <div 
      className="relative w-full py-3.5 px-4 text-center select-none text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 border-b border-white/10"
      style={bannerStyle}
      id="promo-banner-container"
    >
      {/* Background Image Slideshow/Rollover with dynamic transitions */}
      {hasImages && (
        <div className="absolute inset-0 z-0">
          <AnimatePresence mode="popLayout">
            <motion.div
              key={currentImageIndex}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1.2, ease: "easeInOut" }}
              className="absolute inset-0 bg-cover bg-center bg-no-repeat"
              style={{ 
                backgroundImage: `url(${images[currentImageIndex]})`,
              }}
            />
          </AnimatePresence>
          {/* Subtle dark overlay for better text contrast if reading markdown/markup */}
          <div className="absolute inset-0 bg-black/40 backdrop-blur-[1px] z-10" />
        </div>
      )}

      {/* Banner content */}
      <span className="relative z-20 flex items-center justify-center gap-2 text-center max-w-5xl mx-auto px-4 leading-relaxed font-bold tracking-wide">
        <Megaphone className="h-4.5 w-4.5 shrink-0 text-white animate-bounce-slow" />
        <span 
          className="prose-all banner-html-markup text-white"
          dangerouslySetInnerHTML={{ __html: config.bannerContent }}
        />
      </span>
    </div>
  );
}
