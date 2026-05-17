import { UserProfile } from '@/types';

export function calculateCompletionScore(user: UserProfile): number {
  if (user.role !== 'candidate') return 100;

  const weights = {
    personal: 15,
    photo: 5,
    professional: 15,
    skills: 10,
    experiences: 15,
    education: 15,
    languages: 5,
    documents: 10,
    preferences: 5,
    social: 5,
  };

  let score = 0;

  // Personal Info
  if (user.firstName && user.lastName && user.phone && user.city) {
    score += weights.personal;
  } else if (user.firstName || user.lastName) {
    score += weights.personal / 2;
  }

  // Photo
  if (user.photoUrl && !user.photoUrl.includes('googleusercontent')) score += weights.photo;

  // Professional
  if (user.jobTitle && user.sector && user.yearsOfExperience !== undefined) score += weights.professional;

  // Skills
  if (user.skills && user.skills.length > 0) score += weights.skills;

  // Experiences
  if (user.experiences && user.experiences.length > 0) score += weights.experiences;

  // Education
  if (user.education && user.education.length > 0) score += weights.education;

  // Languages
  if (user.languages && user.languages.length > 0) score += weights.languages;

  // Documents
  if (user.cvUrl) score += weights.documents;

  // Preferences
  if (user.preferences && (user.preferences.contractType?.length || 0) > 0) score += weights.preferences;

  // Social
  if (user.social && (user.social.linkedin || user.social.github || user.social.portfolio)) score += weights.social;

  return score;
}

export function getProfileSuggestions(user: UserProfile): string[] {
  const suggestions: string[] = [];
  if (user.role !== 'candidate') return [];

  if (!user.firstName || !user.lastName) suggestions.push('Complétez votre nom et prénom');
  if (!user.phone) suggestions.push('Ajoutez un numéro de téléphone pour être contacté');
  if (!user.photoUrl || user.photoUrl.includes('googleusercontent')) suggestions.push('Ajoutez une photo professionnelle');
  if (!user.jobTitle) suggestions.push('Précisez votre titre professionnel');
  if (!user.skills || user.skills.length < 3) suggestions.push('Ajoutez au moins 3 compétences clés');
  if (!user.experiences || user.experiences.length === 0) suggestions.push('Détaillez vos expériences professionnelles');
  if (!user.education || user.education.length === 0) suggestions.push('Ajoutez votre formation académique');
  if (!user.cvUrl) suggestions.push('Téléchargez votre CV au format PDF');
  if (!user.social?.linkedin) suggestions.push('Liez votre profil LinkedIn');

  return suggestions;
}
