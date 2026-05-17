import { UserProfile } from '@/types';

export function calculateCompletionScore(user: UserProfile): number {
  if (user.role === 'candidate') {
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
    if (user.firstName && user.lastName && user.phone && user.city) score += weights.personal;
    else if (user.firstName || user.lastName) score += weights.personal / 2;
    if (user.photoUrl && !user.photoUrl.includes('googleusercontent')) score += weights.photo;
    if (user.jobTitle && user.sector && user.yearsOfExperience !== undefined) score += weights.professional;
    if (user.skills && user.skills.length > 0) score += weights.skills;
    if (user.experiences && user.experiences.length > 0) score += weights.experiences;
    if (user.education && user.education.length > 0) score += weights.education;
    if (user.languages && user.languages.length > 0) score += weights.languages;
    if (user.cvUrl) score += weights.documents;
    if (user.preferences && (user.preferences.contractType?.length || 0) > 0) score += weights.preferences;
    if (user.social && (user.social.linkedin || user.social.github || user.social.portfolio)) score += weights.social;
    return score;
  }

  if (user.role === 'recruiter') {
    const weights = {
      general: 15,
      legal: 15,
      contact: 15,
      manager: 15,
      sizeType: 10,
      needs: 10,
      branding: 10,
      documents: 10,
    };

    let score = 0;
    if (user.companyName && user.sectorActivity && user.companyDescription) score += weights.general;
    if (user.registrationNumber && user.legalForm) score += weights.legal;
    if (user.city && user.companyEmail && user.phone) score += weights.contact;
    if (user.manager?.firstName && user.manager?.lastName && user.manager?.role) score += weights.manager;
    if (user.companySize && user.companyType) score += weights.sizeType;
    if (user.recruitmentNeeds?.frequency) score += weights.needs;
    if (user.branding?.mission || user.branding?.bannerUrl) score += weights.branding;
    if (user.legalDocuments) score += weights.documents; // Placeholder for file upload check
    return score;
  }

  return 100;
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
