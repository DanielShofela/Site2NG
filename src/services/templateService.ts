import { CVLMTemplate, CVLMPromoSlide } from '@/types/cvlm';
import { safeSetItem, safeGetItem } from '@/lib/safeStorage';
import { db } from '@/lib/firebase';
import { collection, doc, setDoc, deleteDoc, onSnapshot } from 'firebase/firestore';

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
    const suffix = i % 2 === 0 ? 'F' : 'H';
    const numStr = `${padded}${suffix}`;
    const name = `CV Modèle ${numStr}`;
    const tags = CV_TAGS[i % CV_TAGS.length];
    
    templates.push({
      id: `cv-${i}`,
      name,
      thumbnail: `/cvlm/cv-samples/CV ${numStr}.png`,
      tags,
      isPremium: i % 4 === 0,
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
      isPremium: i % 5 === 0,
      isFavorite: false,
      type: 'lm'
    });
  }

  return templates;
};

export const getTemplates = (): CVLMTemplate[] => {
  const stored = safeGetItem(`${PREF}templates`);
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch (e) {
      console.error('Error loading cvlm_templates', e);
    }
  }
  
  const fresh = generateTemplates();
  safeSetItem(`${PREF}templates`, JSON.stringify(fresh));
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
  saveTemplates(updated);
  return updated;
};

export const saveTemplates = (templates: CVLMTemplate[]): void => {
  safeSetItem(`${PREF}templates`, JSON.stringify(templates));
};

export const addTemplate = async (template: Omit<CVLMTemplate, 'id' | 'isFavorite'>): Promise<CVLMTemplate[]> => {
  const templates = getTemplates();
  const id = `${template.type}-${Date.now()}`;
  const newTemplate: CVLMTemplate = {
    ...template,
    id,
    isFavorite: false
  };
  const updated = [newTemplate, ...templates];
  saveTemplates(updated);

  try {
    await setDoc(doc(db, 'cv_templates', id), JSON.parse(JSON.stringify(newTemplate)), { merge: true });
  } catch (err) {
    console.error('Firestore addTemplate error:', err);
  }

  return updated;
};

export const updateTemplate = async (id: string, updatedFields: Partial<CVLMTemplate>): Promise<CVLMTemplate[]> => {
  const templates = getTemplates();
  let updatedItem: CVLMTemplate | undefined;

  const updated = templates.map(t => {
    if (t.id === id) {
      updatedItem = { ...t, ...updatedFields };
      return updatedItem;
    }
    return t;
  });
  saveTemplates(updated);

  if (updatedItem) {
    try {
      await setDoc(doc(db, 'cv_templates', id), JSON.parse(JSON.stringify(updatedItem)), { merge: true });
    } catch (err) {
      console.error('Firestore updateTemplate error:', err);
    }
  }

  return updated;
};

export const deleteTemplate = async (id: string): Promise<CVLMTemplate[]> => {
  const templates = getTemplates();
  const updated = templates.filter(t => t.id !== id);
  saveTemplates(updated);

  try {
    await deleteDoc(doc(db, 'cv_templates', id));
  } catch (err) {
    console.error('Firestore deleteTemplate error:', err);
  }

  return updated;
};

export const resetTemplates = (): CVLMTemplate[] => {
  const fresh = generateTemplates();
  saveTemplates(fresh);
  return fresh;
};

export const subscribeToTemplates = (onUpdate: (templates: CVLMTemplate[]) => void) => {
  try {
    const templatesRef = collection(db, 'cv_templates');
    return onSnapshot(templatesRef, (snapshot) => {
      const remoteTemplates: CVLMTemplate[] = [];
      snapshot.forEach(docSnap => {
        remoteTemplates.push(docSnap.data() as CVLMTemplate);
      });

      if (remoteTemplates.length > 0) {
        const local = getTemplates();
        const map = new Map<string, CVLMTemplate>();
        local.forEach(t => map.set(t.id, t));
        remoteTemplates.forEach(t => map.set(t.id, t));

        const merged = Array.from(map.values());
        saveTemplates(merged);
        onUpdate(merged);
      } else {
        onUpdate(getTemplates());
      }
    }, (err) => {
      console.warn('Firestore templates listener notice:', err);
      onUpdate(getTemplates());
    });
  } catch (e) {
    console.error('Failed to subscribe to templates:', e);
    onUpdate(getTemplates());
    return () => {};
  }
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
  const stored = safeGetItem(`${PREF}promo_slides`);
  if (stored) {
    try {
      const parsed: CVLMPromoSlide[] = JSON.parse(stored);
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
        safeSetItem(`${PREF}promo_slides`, JSON.stringify(updated));
      }
      return updated;
    } catch (e) {
      console.error('Error loading cvlm_promo_slides', e);
    }
  }
  
  safeSetItem(`${PREF}promo_slides`, JSON.stringify(DEFAULT_SLIDES));
  return DEFAULT_SLIDES;
};

export const savePromoSlides = (slides: CVLMPromoSlide[]): void => {
  safeSetItem(`${PREF}promo_slides`, JSON.stringify(slides));
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
