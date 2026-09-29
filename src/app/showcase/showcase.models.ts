export interface ShowcaseMeasurement {
  filename: string;
  hash: string;
  algorithm: 'sha256';
  probe: 'RPA' | 'FC';
  angleDegrees: number | null;
}

export interface ShowcaseSource {
  title: string;
  doi: string;
  url: string;
  creators: string[];
  collected: string;
  licenseNote: string;
}

export interface ShowcaseArtifact {
  id: string;
  title: string;
  description: string;
  organizationSlug: string;
  submissionState: 'PENDING' | 'FAILED' | 'SUCCESS';
  submittedAt: string;
  updatedAt: string | null;
  blockchainTxId: string | null;
  footprint: string | null;
  manifest: ShowcaseMeasurement[];
  keywords: string[];
  links: string[];
  dois: string[];
  submissionComment: string;
}

export interface ShowcaseWorkflow {
  id: string;
  title: string;
  description: string;
  organizationSlug: string;
  submissionState: 'PENDING' | 'FAILED' | 'SUCCESS';
  blockchainTxId: string | null;
  artifactIds: string[];
  submittedAt: string;
  updatedAt: string | null;
}

export interface ShowcaseCatalog {
  organization: string;
  source: ShowcaseSource;
  ready: boolean;
  artifacts: ShowcaseArtifact[];
  workflows: ShowcaseWorkflow[];
}

export interface ShowcaseHistory {
  items: {
    txId: string;
    timestamp: string;
    revision?: number;
    snapshot: {
      footprint?: string;
      manifest?: ShowcaseMeasurement[];
      artifactIds?: string[];
    };
  }[];
  count: number;
  hasMore: boolean;
}
