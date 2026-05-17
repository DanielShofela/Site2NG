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
  photoUrl?: string;
  location?: string;
  // Candidate fields
  jobTitle?: string;
  skills?: string[];
  experiences?: {
    company: string;
    role: string;
    period: string;
    description: string;
  }[];
  education?: {
    school: string;
    degree: string;
    year: string;
  }[];
  cvUrl?: string;
  cvName?: string;
  cvUpdatedAt?: any;
  // Recruiter fields
  companyName?: string;
  companyEmail?: string;
  address?: string;
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
