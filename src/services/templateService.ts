import { CVLMTemplate, CVLMPromoSlide } from '@/types/cvlm';

const PREF = 'cvlm_';

// CV Template Tags
const CV_TAGS = [
  ['Moderne', 'Professionnel', 'Tech'],
  ['Créatif', 'Design', 'Impact'],
  ['Simple', 'Minimaliste', 'Efficace'],
  ['Exécutif', 'Corporate', 'Classique'],
  ['Élégant', 'Minimaliste', 'Lettres']
];

export const generateTemplates = (): CVLMTemplate[] => {
  const templates: CVLMTemplate[] = [];

  // Generate 41 CV templates
  for (let i = 1; i <= 41; i++) {
    const padded = i.toString().padStart(3, '0');
    // Alternating H and F suffix as indicated in prompt
    const suffix = i % 2 === 0 ? 'F' : 'H';
    const numStr = `${padded}${suffix}`;
    const name = `CV Modèle ${numStr}`;
    const tags = CV_TAGS[i % CV_TAGS.length];
    
    templates.push({
      id: `cv-${i}`,
      name,
      thumbnail: `/cvlm/cv-samples/CV ${numStr}.png`,
      tags,
      isPremium: i % 4 === 0, // Every 4th template is Premium
      isFavorite: false,
      type: 'cv'
    });
  }

  // Generate 43 Letter of Motivation templates
  for (let i = 1; i <= 43; i++) {
    const padded = i.toString().padStart(3, '0');
    const name = `Lettre Modèle ${padded}`;
    const tags = ['Lettre', i % 2 === 0 ? 'Moderne' : 'Classique', i % 3 === 0 ? 'Créatif' : 'Corporate'];
    
    templates.push({
      id: `lm-${i}`,
      name,
      thumbnail: `/cvlm/lm-samples/LM ${padded}.png`,
      tags,
      isPremium: i % 5 === 0, // Every 5th letter template is Premium
      isFavorite: false,
      type: 'lm'
    });
  }

  return templates;
};

export const getTemplates = (): CVLMTemplate[] => {
  const stored = localStorage.getItem(`${PREF}templates`);
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch (e) {
      console.error('Error loading cvlm_templates', e);
    }
  }
  
  const fresh = generateTemplates();
  localStorage.setItem(`${PREF}templates`, JSON.stringify(fresh));
  return fresh;
};

export const getCVTemplates = (): CVLMTemplate[] => {
  return getTemplates().filter(t => t.type === 'cv');
};

export const getLMTemplates = (): CVLMTemplate[] => {
  return getTemplates().filter(t => t.type === 'lm');
};

export const toggleFavorite = (id: string): CVLMTemplate[] => {
  const templates = getTemplates();
  const updated = templates.map(t => {
    if (t.id === id) {
      return { ...t, isFavorite: !t.isFavorite };
    }
    return t;
  });
  localStorage.setItem(`${PREF}templates`, JSON.stringify(updated));
  return updated;
};

export const saveTemplates = (templates: CVLMTemplate[]): void => {
  localStorage.setItem(`${PREF}templates`, JSON.stringify(templates));
};

export const addTemplate = (template: Omit<CVLMTemplate, 'id' | 'isFavorite'>): CVLMTemplate[] => {
  const templates = getTemplates();
  const id = `${template.type}-${Date.now()}`;
  const newTemplate: CVLMTemplate = {
    ...template,
    id,
    isFavorite: false
  };
  const updated = [newTemplate, ...templates];
  saveTemplates(updated);
  return updated;
};

export const updateTemplate = (id: string, updatedFields: Partial<CVLMTemplate>): CVLMTemplate[] => {
  const templates = getTemplates();
  const updated = templates.map(t => {
    if (t.id === id) {
      return { ...t, ...updatedFields };
    }
    return t;
  });
  saveTemplates(updated);
  return updated;
};

export const deleteTemplate = (id: string): CVLMTemplate[] => {
  const templates = getTemplates();
  const updated = templates.filter(t => t.id !== id);
  saveTemplates(updated);
  return updated;
};

export const resetTemplates = (): CVLMTemplate[] => {
  const fresh = generateTemplates();
  saveTemplates(fresh);
  return fresh;
};

const DEFAULT_SLIDES: CVLMPromoSlide[] = [
  {
    id: 'slide-1',
    title: "Améliorez votre CV avec l'IA",
    description: "Bénéficiez de conseils de rédaction en temps réel alimentés par Google Gemini 2.5 pour booster vos recrutements.",
    badge: 'Nouveau',
    bgGradient: 'from-orange-650 to-amber-550',
    imagePath: 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=800&auto=format&fit=crop&q=80',
    iconName: 'Sparkles'
  },
  {
    id: 'slide-2',
    title: "Des Lettres de Motivation d'Impact",
    description: "Personnalisez plus de 43 structures de lettres prêtes à l'emploi pour capter l'attention immédiate des recruteurs.",
    badge: 'Premium',
    bgGradient: 'from-slate-900 via-slate-950 to-orange-900',
    imagePath: 'https://images.unsplash.com/photo-1586281380349-632531db7ed4?w=800&auto=format&fit=crop&q=80',
    iconName: 'Award'
  },
  {
    id: 'slide-3',
    title: "Gagnez des points d'expertise",
    description: "Complétez vos profils professionnels, téléchargez vos candidatures, et débloquez de nombreux templates exclusifs.",
    badge: 'Expertise',
    bgGradient: 'from-blue-900 to-indigo-950',
    imagePath: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=800&auto=format&fit=crop&q=80',
    iconName: 'Zap'
  }
];

export const getPromoSlides = (): CVLMPromoSlide[] => {
  const stored = localStorage.getItem(`${PREF}promo_slides`);
  if (stored) {
    try {
      const parsed: CVLMPromoSlide[] = JSON.parse(stored);
      // Automatically migrate old broken local paths to new high-quality Unsplash ones
      let migrated = false;
      const updated = parsed.map(slide => {
        if (slide.imagePath === '/cvlm/pub/promo1.jpg') {
          migrated = true;
          return { ...slide, imagePath: 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=800&auto=format&fit=crop&q=80' };
        }
        if (slide.imagePath === '/cvlm/pub/promo2.jpg') {
          migrated = true;
          return { ...slide, imagePath: 'https://images.unsplash.com/photo-1586281380349-632531db7ed4?w=800&auto=format&fit=crop&q=80' };
        }
        if (slide.imagePath === '/cvlm/pub/promo3.jpg') {
          migrated = true;
          return { ...slide, imagePath: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=800&auto=format&fit=crop&q=80' };
        }
        return slide;
      });
      if (migrated) {
        localStorage.setItem(`${PREF}promo_slides`, JSON.stringify(updated));
      }
      return updated;
    } catch (e) {
      console.error('Error loading cvlm_promo_slides', e);
    }
  }
  
  localStorage.setItem(`${PREF}promo_slides`, JSON.stringify(DEFAULT_SLIDES));
  return DEFAULT_SLIDES;
};

export const savePromoSlides = (slides: CVLMPromoSlide[]): void => {
  localStorage.setItem(`${PREF}promo_slides`, JSON.stringify(slides));
};

export const addPromoSlide = (slide: Omit<CVLMPromoSlide, 'id'>): CVLMPromoSlide[] => {
  const slides = getPromoSlides();
  const id = `slide-${Date.now()}`;
  const newSlide: CVLMPromoSlide = {
    ...slide,
    id
  };
  const updated = [...slides, newSlide];
  savePromoSlides(updated);
  return updated;
};

export const updatePromoSlide = (id: string, updatedFields: Partial<CVLMPromoSlide>): CVLMPromoSlide[] => {
  const slides = getPromoSlides();
  const updated = slides.map(s => {
    if (s.id === id) {
      return { ...s, ...updatedFields };
    }
    return s;
  });
  savePromoSlides(updated);
  return updated;
};

export const deletePromoSlide = (id: string): CVLMPromoSlide[] => {
  const slides = getPromoSlides();
  const updated = slides.filter(s => s.id !== id);
  savePromoSlides(updated);
  return updated;
};

export const resetPromoSlides = (): CVLMPromoSlide[] => {
  savePromoSlides(DEFAULT_SLIDES);
  return DEFAULT_SLIDES;
};

