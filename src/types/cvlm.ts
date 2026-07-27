export enum CVLMScreen {
  ONBOARDING = 'ONBOARDING',
  LOGIN = 'LOGIN',
  DASHBOARD = 'DASHBOARD',
  MY_CVS = 'MY_CVS',
  COMMUNITY = 'COMMUNITY',
  SETTINGS = 'SETTINGS',
  CV_FORM = 'CV_FORM',
  LM_FORM = 'LM_FORM'
}

export interface CVLMTemplate {
  id: string;
  name: string;
  thumbnail: string;
  tags: string[];
  isPremium: boolean;
  isFavorite: boolean;
  type: 'cv' | 'lm';
}

export interface CVEducation {
  id: string;
  school: string;
  degree: string;
  startDate: string;
  endDate: string;
  description: string;
}

export interface CVExperience {
  id: string;
  company: string;
  position: string;
  startDate: string;
  endDate: string;
  description: string;
}

export interface CVFormData {
  fullName: string;
  email: string;
  phonePrimary: string;
  phoneSecondary: string;
  address: string;
  birthYear: string;
  nationality: string;
  jobTitle: string;
  portfolioUrl: string;
  photoUrl?: string;
  educations: CVEducation[];
  experiences: CVExperience[];
  skillsTechnical: string;
  skillsTools: string;
  skillsLanguages: string;
  certifications: string;
  interestsHobbies: string;
  interestsVolunteering: string;
  references: string;
  draft: boolean;
  message?: string;
}

export interface CVVersion {
  id: string;
  userId?: string;
  userEmail?: string;
  profileType: string;
  name: string;
  data: CVFormData;
  createdAt: string;
  updatedAt: string;
  templateId: string;
  templateName: string;
}

export interface UserCV {
  id: string;
  title: string;
  templateId: string;
  lastModified: string;
  completion: number;
}

export interface CVRequest {
  id: string;
  templateName: string;
  date: string;
  status: string;
}

export interface CVLMUserProfile {
  name: string;
  email: string;
  phone: string;
  jobTitle: string;
  locationCity: string;
  locationCountry: string;
  linkedinUrl: string;
  portfolioUrl: string;
  websiteUrl: string;
  bio: string;
  openToWork: boolean;
  languages: string[];
  points: number;
  avatarUrl: string;
}

export interface LMFormData {
  fullName: string;
  email: string;
  phone: string;
  address: string;
  recipientName: string;
  recipientCompany: string;
  recipientAddress: string;
  date: string;
  subject: string;
  openingSalutation: string;
  content: string;
  closingSalutation: string;
  signature: string;
}

export interface LMVersion {
  id: string;
  userId?: string;
  userEmail?: string;
  name: string;
  data: LMFormData;
  createdAt: string;
  updatedAt: string;
  templateId: string;
  templateName: string;
}

export interface CVLMPromoSlide {
  id: string;
  title: string;
  description: string;
  badge: string;
  bgGradient: string;
  imagePath?: string;
  iconName: 'Sparkles' | 'Award' | 'Zap' | 'Briefcase' | 'FileText';
}

