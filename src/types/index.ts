/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type UserRole = 'candidate' | 'recruiter' | 'admin';
export type ApprovalStatus = 'pending' | 'approved' | 'rejected';
export type JobStatus = 'active' | 'closed';
export type ApplicationStatus = 'pending' | 'viewed' | 'shortlisted' | 'rejected';

export interface UserProfile {
  uid: string;
  email: string;
  role: UserRole;
  status: ApprovalStatus;
  displayName: string;
  phone?: string;
  phoneSecondary?: string;
  photoUrl?: string | null;
  location?: string;
  
  // New Personal Info fields
  firstName?: string;
  lastName?: string;
  gender?: 'M' | 'F' | 'O';
  birthDate?: string;
  nationality?: string;
  city?: string;
  commune?: string;
  address?: string;

  // New Identity fields
  idDocumentUrl?: string;
  isVerified?: boolean;

  // Candidate fields - Professional
  jobTitle?: string;
  sector?: string;
  yearsOfExperience?: number;
  availableImmediately?: boolean;
  
  skills?: {
    name: string;
    level: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  }[];
  
  experiences?: {
    company: string;
    role: string;
    startDate: string;
    endDate?: string;
    current?: boolean;
    description: string;
  }[];
  
  education?: {
    school: string;
    degree: string;
    field: string;
    startDate: string;
    endDate?: string;
    current?: boolean;
  }[];

  languages?: {
    language: string;
    level: 'basic' | 'intermediate' | 'fluent' | 'native';
  }[];

  // Documents
  cvUrl?: string;
  cvName?: string;
  cvUpdatedAt?: any;
  documents?: {
    name: string;
    url: string;
    type: 'diploma' | 'certificate' | 'other';
  }[];

  // Preferences
  preferences?: {
    contractType?: string[];
    desiredSalary?: string;
    preferredCities?: string[];
    mobility?: boolean;
  };

  // Social
  social?: {
    linkedin?: string;
    github?: string;
    portfolio?: string;
  };

  // Profile status
  completionScore?: number;
  profileComplete?: boolean;
  profileViews?: number;

  // Recruiter fields
  companyName?: string;
  companyEmail?: string;
  registrationNumber?: string;
  companyDescription?: string;
  
  createdAt: any;
}

export interface Job {
  id: string;
  recruiterId: string;
  companyName: string;
  title: string;
  description: string;
  location: string;
  type: string;
  field: string;
  salary?: string;
  status: JobStatus;
  createdAt: any;
}

export interface Application {
  id: string;
  jobId: string;
  jobTitle: string;
  candidateId: string;
  recruiterId: string;
  status: ApplicationStatus;
  appliedAt: any;
  candidateProfile: Partial<UserProfile>;
}
