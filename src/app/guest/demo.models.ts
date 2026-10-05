export type DemoLifecycleState =
  'SCHEDULED' | 'PREPARING' | 'OPEN' | 'READ_ONLY' | 'CLOSED';

export type DemoOrganizationSlug = 'neuroscience-gateway' | 'citizen-science';

export type DemoResearchContext =
  'REPRODUCIBLE_ANALYSIS' | 'RESEARCH_DATASET' | 'SOFTWARE_RELEASE' | 'OTHER';

export interface DemoStatus {
  state: DemoLifecycleState;
  message: string;
  opensAt: string;
  closesAt: string;
  interactionsAllowed: boolean;
}

export interface DemoCounters {
  anonymousBrowserSessions: number;
  acceptedArtifacts: number;
  confirmedArtifacts: number;
  acceptedWorkflows: number;
  confirmedWorkflows: number;
  provenanceHistoryViews: number;
}

export interface DemoSession {
  csrfToken: string;
  expiresAt: string;
  organization: DemoOrganizationSlug;
  contributorAlias: string;
  accountUsername?: string;
}

export interface DemoAccountCredentials {
  organization: DemoOrganizationSlug;
  username: string;
  pin: string;
}

export interface DemoWorkflowEditRequest {
  requestId: string;
  artifactIds: string[];
  keywords: string[];
  submissionComment: string;
  githubRepositories: DemoWorkflowRequest['githubRepositories'];
}

export interface DemoArtifactRequest {
  requestId: string;
  fingerprint: string;
  sizeBytes: number;
  extension: string;
  files?: DemoFileEntry[];
  researchContext: DemoResearchContext;
  title: string;
  description: string;
  submissionComment: string;
  keywords?: string[];
  links?: string[];
  dois?: string[];
  fundingAgencies?: string[];
  acknowledgements?: string;
}

export interface DemoArtifactEditRequest {
  requestId: string;
  submissionComment: string;
  keywords?: string[];
  links?: string[];
  dois?: string[];
  fundingAgencies?: string[];
  acknowledgements?: string;
  fingerprint?: string;
  sizeBytes?: number;
  extension?: string;
  files?: DemoFileEntry[];
}

export interface DemoFileEntry {
  hash: string;
  sizeBytes: number;
  extension: string;
}

export interface DemoManifestEntry {
  filename: string;
  hash: string;
  algorithm: string;
}

export interface DemoArtifactMetadata {
  keywords?: string[];
  links?: string[];
  dois?: string[];
  fundingAgencies?: string[];
  acknowledgements?: string;
  submissionComment?: string;
}

export interface DemoArtifact extends DemoArtifactMetadata {
  id: string;
  title: string;
  organization: string;
  contributorAlias: string;
  fingerprint: string;
  manifestName: string;
  manifest?: DemoManifestEntry[];
  verified: boolean;
  submissionState: string;
  blockchainTxId?: string | null;
  submissionError?: string | null;
  submittedAt: string;
  lastUpdatedAt?: string;
}

export interface DemoWorkflowRequest {
  requestId: string;
  artifactIds: string[];
  researchContext: DemoResearchContext;
  title: string;
  description: string;
  submissionComment: string;
  keywords: string[];
  githubRepositories: {
    url: string;
    description: string;
    gitHash?: string;
    contents: { filename: string; hash: string }[];
  }[];
}

export interface DemoWorkflow {
  id: string;
  title: string;
  description: string;
  keywords: string[];
  submissionComment: string;
  githubRepositories: DemoWorkflowRequest['githubRepositories'];
  organization: string;
  contributorAlias: string;
  artifactIds: string[];
  submissionState: string;
  blockchainTxId?: string | null;
  submissionError?: string | null;
  submittedAt: string;
}

export interface DemoCatalogArtifact extends DemoArtifactMetadata {
  id: string;
  title: string;
  description: string;
  organization: string;
  organizationSlug: string;
  contributorAlias: string;
  researchContext: string | null;
  verified: boolean;
  submissionState: string;
  failureReason?: string;
  submittedAt: string;
  lastUpdatedAt?: string;
  blockchainTxId?: string | null;
  peerId?: string | null;
  manifest?: DemoManifestEntry[];
  footprint?: string;
}

export interface DemoCatalogWorkflow {
  id: string;
  title: string;
  description: string;
  keywords?: string[];
  submissionComment?: string;
  githubRepositories?: { url: string; description: string; gitHash: string }[];
  organization: string;
  organizationSlug: string;
  contributorAlias: string;
  researchContext: string | null;
  artifactIds: string[];
  submissionState: string;
  failureReason?: string;
  submittedAt: string;
  blockchainTxId?: string | null;
}

export interface DemoHistoryItem {
  txId?: string;
  transactionId?: string;
  timestamp?: string;
  isDelete?: boolean;
  revision?: number;
  snapshot?: DemoArtifactMetadata & {
    submissionState?: 'PENDING' | 'FAILED' | 'SUCCESS';
    title?: string;
    description?: string;
    manifest?: DemoManifestEntry[];
    footprint?: string;
  };
  value?: Record<string, unknown>;
}

export interface DemoArtifactHistory {
  artifactId: string;
  items?: DemoHistoryItem[];
  history?: DemoHistoryItem[];
  total?: number;
  count?: number;
}
