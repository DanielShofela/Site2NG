import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Sparkles, Award, Zap, Briefcase, FileText } from 'lucide-react';
import { getPromoSlides } from '@/services/templateService';
import { CVLMPromoSlide } from '@/types/cvlm';

const getIcon = (name: string) => {
  switch (name) {
    case 'Sparkles':
      return <Sparkles className="h-4 w-4 text-amber-400" />;
    case 'Award':
      return <Award className="h-4 w-4 text-purple-400" />;
    case 'Zap':
      return <Zap className="h-4 w-4 text-emerald-400" />;
    case 'Briefcase':
      return <Briefcase className="h-4 w-4 text-blue-400" />;
    case 'FileText':
      return <FileText className="h-4 w-4 text-cyan-400" />;
    default:
      return <Sparkles className="h-4 w-4 text-amber-400" />;
  }
};

export default function ImageCarousel() {
  const [slides, setSlides] = useState<CVLMPromoSlide[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [imgError, setImgError] = useState<Record<number, boolean>>({});

  useEffect(() => {
    setSlides(getPromoSlides());
  }, []);

  useEffect(() => {
    if (slides.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % slides.length);
    }, 6000); // 6s rotation

    return () => clearInterval(interval);
  }, [slides]);

  // Reset all image errors when the slide list is updated (e.g., edited in Admin)
  useEffect(() => {
    setImgError({});
  }, [slides]);

  // Reset the image error for the current slide if its imagePath changes
  useEffect(() => {
    const currentSlide = slides[currentIndex];
    if (currentSlide?.imagePath) {
      setImgError((prev) => {
        if (prev[currentIndex]) {
          const updated = { ...prev };
          delete updated[currentIndex];
          return updated;
        }
        return prev;
      });
    }
  }, [slides, currentIndex]);

  if (slides.length === 0) {
    return null;
  }

  const handleNext = () => {
    setCurrentIndex((prev) => (prev + 1) % slides.length);
  };

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev - 1 + slides.length) % slides.length);
  };

  const slide = slides[currentIndex];

  return (
    <div className="relative w-full h-48 sm:h-52 md:h-56 rounded-3xl overflow-hidden shadow-md group transition-all duration-300">
      {/* Background slide renderer */}
      <div className="absolute inset-0 w-full h-full bg-slate-900 transition-all duration-500">
        {slide.imagePath && !imgError[currentIndex] ? (
          <>
            <img
              src={slide.imagePath}
              alt={slide.title}
              className="absolute inset-0 w-full h-full object-cover transition-all duration-500"
              onError={() => setImgError(prev => ({ ...prev, [currentIndex]: true }))}
            />
            {/* Elegant dark gradient overlay to ensure white text is perfectly legible */}
            <div className="absolute inset-0 bg-gradient-to-r from-slate-950/80 via-slate-950/50 to-transparent" />
          </>
        ) : (
          <div className={`absolute inset-0 w-full h-full bg-gradient-to-r ${slide.bgGradient}`} />
        )}
      </div>

      {/* Slide Text Content */}
      <div className="absolute inset-0 p-6 sm:p-8 flex flex-col justify-between text-white z-10 select-none">
        <div>
          {slide.badge && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/20 backdrop-blur-md rounded-full text-[10px] font-black uppercase tracking-wider text-white">
              {getIcon(slide.iconName)}
              {slide.badge}
            </span>
          )}
          <h2 className="text-lg sm:text-xl font-black mt-3 tracking-tight drop-shadow-sm leading-tight max-w-xl">
            {slide.title}
          </h2>
          <p className="text-xs sm:text-sm text-slate-100 font-medium mt-1.5 max-w-lg leading-relaxed">
            {slide.description}
          </p>
        </div>

        {/* Indicators Dots */}
        {slides.length > 1 && (
          <div className="flex items-center gap-1.5">
            {slides.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentIndex(idx)}
                className={`h-1.5 rounded-full transition-all duration-300 cursor-pointer ${
                  idx === currentIndex ? 'w-6 bg-white' : 'w-1.5 bg-white/40'
                }`}
                title={`Slide ${idx + 1}`}
              />
            ))}
          </div>
        )}
      </div>

      {/* Navigation Controls */}
      {slides.length > 1 && (
        <>
          <button
            onClick={handlePrev}
            className="absolute left-4 top-1/2 -translate-y-1/2 p-2 bg-black/10 hover:bg-black/30 backdrop-blur-sm rounded-xl text-white opacity-0 group-hover:opacity-100 transition-all duration-300 cursor-pointer"
            title="Précédent"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            onClick={handleNext}
            className="absolute right-4 top-1/2 -translate-y-1/2 p-2 bg-black/10 hover:bg-black/30 backdrop-blur-sm rounded-xl text-white opacity-0 group-hover:opacity-100 transition-all duration-300 cursor-pointer"
            title="Suivant"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </>
      )}
    </div>
  );
}

