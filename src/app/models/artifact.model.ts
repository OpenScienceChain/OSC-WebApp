export interface Artifact {
  id: string;
  title: string;
  description: string;
  keywords: string[];
  submittedAt: string;
  verified: boolean;
  submissionState?: string;
  lastTimeVerified: string | null;
  lastTimeUpdated: string | null;
  updatedAt?: string | null;
}
