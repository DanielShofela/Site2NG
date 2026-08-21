import { CVLMTemplate, CVLMPromoSlide } from '@/types/cvlm';
import { safeSetItem, safeGetItem } from '@/lib/safeStorage';
import { db } from '@/lib/firebase';
import { collection, doc, setDoc, deleteDoc, onSnapshot } from 'firebase/firestore';
import { compressDataUrl, uploadImageToStorage } from '@/lib/imageUtils';

const PREF = 'cvlm_';


// CV Template Tags
const CV_TAGS = [
  ['Moderne', 'Professionnel', 'Tech'],
  ['Créatif', 'Design', 'Impact'],
  ['Simple', 'Minimaliste', 'Efficace'],
  ['Exécutif', 'Corporate', 'Classique'],
  ['Élégant', 'Minimaliste', 'Lettres']
];

const DEFAULT_CV_THUMBNAILS = [
  'https://images.unsplash.com/photo-1586281380349-632531db7ed4?w=400&auto=format&fit=crop&q=60',
  'https://images.unsplash.com/photo-1517842645767-c639042777db?w=400&auto=format&fit=crop&q=60',
  'https://images.unsplash.com/photo-1450133064473-71024230f91b?w=400&auto=format&fit=crop&q=60',
  'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=400&auto=format&fit=crop&q=60',
  'https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=400&auto=format&fit=crop&q=60'
];

const DEFAULT_LM_THUMBNAILS = [
  'https://images.unsplash.com/photo-1512486130939-2c4f79935e4f?w=400&auto=format&fit=crop&q=60',
  'https://images.unsplash.com/photo-1586281380117-5a60ae2050cc?w=400&auto=format&fit=crop&q=60',
  'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=400&auto=format&fit=crop&q=60',
  'https://images.unsplash.com/photo-1455390582262-044cdead277a?w=400&auto=format&fit=crop&q=60'
];

export const getTemplateThumbnail = (thumbnail?: string, type: 'cv' | 'lm' = 'cv', id: string = ''): string => {
  if (thumbnail && (thumbnail.startsWith('data:image/') || thumbnail.startsWith('http://') || thumbnail.startsWith('https://'))) {
    return thumbnail;
  }
  const pool = type === 'cv' ? DEFAULT_CV_THUMBNAILS : DEFAULT_LM_THUMBNAILS;
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash + id.charCodeAt(i)) % pool.length;
  }
  return pool[hash];
};

export const generateTemplates = (): CVLMTemplate[] => {
  const templates: CVLMTemplate[] = [];

  // Generate 41 CV templates
  for (let i = 1; i <= 41; i++) {
    const padded = i.toString().padStart(3, '0');
    const suffix = i % 2 === 0 ? 'F' : 'H';
    const numStr = `${padded}${suffix}`;
    const name = `CV Modèle ${numStr}`;
    const tags = CV_TAGS[i % CV_TAGS.length];
    const id = `cv-${i}`;
    
    templates.push({
      id,
      name,
      thumbnail: getTemplateThumbnail('', 'cv', id),
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
    const id = `lm-${i}`;
    
    templates.push({
      id,
      name,
      thumbnail: getTemplateThumbnail('', 'lm', id),
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
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    } catch (e) {
      console.error('Error loading cvlm_templates', e);
    }
  }
  
  const fresh = generateTemplates();
  safeSetItem(`${PREF}templates`, JSON.stringify(fresh));
  return fresh;
};

export const getCVTemplates = (): CVLMTemplate[] => {
  const list = getTemplates();
  return (Array.isArray(list) ? list : []).filter(t => t?.type === 'cv');
};

export const getLMTemplates = (): CVLMTemplate[] => {
  const list = getTemplates();
  return (Array.isArray(list) ? list : []).filter(t => t?.type === 'lm');
};

export const toggleFavorite = (id: string): CVLMTemplate[] => {
  const templates = getTemplates();
  const list = Array.isArray(templates) ? templates : [];
  const updated = list.map(t => {
    if (t && t.id === id) {
      return { ...t, isFavorite: !t.isFavorite };
    }
    return t;
  });
  saveTemplates(updated);
  return updated;
};

export const saveTemplates = (templates: CVLMTemplate[]): void => {
  const validList = Array.isArray(templates) ? templates : [];
  safeSetItem(`${PREF}templates`, JSON.stringify(validList));
};

export const addTemplate = async (template: Omit<CVLMTemplate, 'id' | 'isFavorite'>): Promise<CVLMTemplate[]> => {
  const templates = getTemplates();
  const id = `${template.type}-${Date.now()}`;

  let thumbnail = template.thumbnail;
  if (thumbnail && thumbnail.startsWith('data:image/')) {
    try {
      thumbnail = await uploadImageToStorage(thumbnail, 'cvlm/thumbnails');
    } catch (e) {
      console.warn('Failed uploading thumbnail in addTemplate:', e);
    }
  }

  const newTemplate: CVLMTemplate = {
    ...template,
    thumbnail,
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

  const fieldsToApply = { ...updatedFields };
  if (fieldsToApply.thumbnail && fieldsToApply.thumbnail.startsWith('data:image/')) {
    try {
      fieldsToApply.thumbnail = await uploadImageToStorage(fieldsToApply.thumbnail, 'cvlm/thumbnails');
    } catch (e) {
      console.warn('Failed uploading thumbnail in updateTemplate:', e);
    }
  }

  const updated = templates.map(t => {
    if (t.id === id) {
      updatedItem = { ...t, ...fieldsToApply };
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

export const resetTemplates = async (): Promise<CVLMTemplate[]> => {
  const fresh = generateTemplates();
  saveTemplates(fresh);
  for (const tpl of fresh) {
    try {
      await setDoc(doc(db, 'cv_templates', tpl.id), JSON.parse(JSON.stringify(tpl)), { merge: true });
    } catch (e) {
      console.error('Error resetting template in Firestore:', e);
    }
  }
  return fresh;
};

export const subscribeToTemplates = (onUpdate: (templates: CVLMTemplate[]) => void) => {
  try {
    const templatesRef = collection(db, 'cv_templates');
    return onSnapshot(templatesRef, async (snapshot) => {
      const remoteTemplates: CVLMTemplate[] = [];
      snapshot.forEach(docSnap => {
        const data = docSnap.data() as CVLMTemplate;
        if (data && data.id) {
          const thumb = getTemplateThumbnail(data.thumbnail, data.type, data.id);
          remoteTemplates.push({
            ...data,
            thumbnail: thumb
          });

          // Auto-migrate base64 thumbnail in Firestore to Firebase Storage URL
          if (data.thumbnail && data.thumbnail.startsWith('data:image/')) {
            uploadImageToStorage(data.thumbnail, 'cvlm/thumbnails').then(uploadedUrl => {
              if (uploadedUrl && uploadedUrl.startsWith('http')) {
                setDoc(doc(db, 'cv_templates', data.id), { thumbnail: uploadedUrl }, { merge: true }).catch(console.error);
              }
            }).catch(console.error);
          }
        }
      });

      const defaultTemplates = generateTemplates();
      const existingIds = new Set(remoteTemplates.map(t => t.id));
      const missingTemplates = defaultTemplates.filter(t => !existingIds.has(t.id));

      if (missingTemplates.length > 0) {
        // Seed any missing default CV / LM templates into Firestore so the database contains all 41 CVs and 43 LMs
        for (const tpl of missingTemplates) {
          try {
            await setDoc(doc(db, 'cv_templates', tpl.id), JSON.parse(JSON.stringify(tpl)), { merge: true });
          } catch (e) {
            console.error('Error seeding template to Firestore:', e);
          }
        }
        const fullList = [...remoteTemplates, ...missingTemplates];
        saveTemplates(fullList);
        onUpdate(fullList);
      } else {
        saveTemplates(remoteTemplates);
        onUpdate(remoteTemplates);
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
    title: "Améliorez votre CV avec nos experts",
    description: "Bénéficiez de conseils de rédaction en temps réel conçus par nos experts RH pour booster vos recrutements.",
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
        let s = { ...slide };
        if (s.title && (s.title.includes("l'IA") || s.title.includes("IA"))) {
          s.title = s.title.replace("l'IA", "nos experts").replace("IA", "nos experts");
          migrated = true;
        }
        if (s.description && (s.description.includes("Gemini") || s.description.includes("l'IA") || s.description.includes("IA"))) {
          s.description = "Bénéficiez de conseils de rédaction en temps réel conçus par nos experts RH pour booster vos recrutements.";
          migrated = true;
        }
        if (s.imagePath === '/cvlm/pub/promo1.jpg') {
          migrated = true;
          s.imagePath = 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=800&auto=format&fit=crop&q=80';
        }
        if (s.imagePath === '/cvlm/pub/promo2.jpg') {
          migrated = true;
          s.imagePath = 'https://images.unsplash.com/photo-1586281380349-632531db7ed4?w=800&auto=format&fit=crop&q=80';
        }
        if (s.imagePath === '/cvlm/pub/promo3.jpg') {
          migrated = true;
          s.imagePath = 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=800&auto=format&fit=crop&q=80';
        }
        return s;
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

export const addPromoSlide = async (slide: Omit<CVLMPromoSlide, 'id'>): Promise<CVLMPromoSlide[]> => {
  const slides = getPromoSlides();
  const id = `slide-${Date.now()}`;
  let imagePath = slide.imagePath;
  if (imagePath && imagePath.startsWith('data:image/')) {
    try {
      imagePath = await uploadImageToStorage(imagePath, 'cvlm/promo');
    } catch (e) {
      console.warn('Failed uploading promo slide image:', e);
    }
  }
  const newSlide: CVLMPromoSlide = {
    ...slide,
    imagePath,
    id
  };
  const updated = [...slides, newSlide];
  savePromoSlides(updated);
  return updated;
};

export const updatePromoSlide = async (id: string, updatedFields: Partial<CVLMPromoSlide>): Promise<CVLMPromoSlide[]> => {
  const slides = getPromoSlides();
  const fieldsToApply = { ...updatedFields };
  if (fieldsToApply.imagePath && fieldsToApply.imagePath.startsWith('data:image/')) {
    try {
      fieldsToApply.imagePath = await uploadImageToStorage(fieldsToApply.imagePath, 'cvlm/promo');
    } catch (e) {
      console.warn('Failed uploading promo slide image:', e);
    }
  }
  const updated = slides.map(s => {
    if (s.id === id) {
      return { ...s, ...fieldsToApply };
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
