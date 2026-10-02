export interface ArtifactDetail {
  id: string;
  title: string;
  description: string;
  keywords: string[];
  links: string[];
  dois: string[];
  fundingAgencies: string[];
  acknowledgements: string;
  submission_comment?: string | null;
  footprint: string;
  manifest: Array<{
    hash: string;
    filename: string;
    algorithm: string;
  }>;
  verified: boolean;
  lastTimeVerified: string | null;
  lastTimeUpdated?: string | null;
  submissionState: string;
  submitterEmail: string;
  submitterUsername: string;
  submittedAt: string;
  updatedAt?: string | null;
  blockchainTxId: string | null;
  peerId: string | null;
  submissionError: string | null;
  organization: {
    name: string;
  };
}
