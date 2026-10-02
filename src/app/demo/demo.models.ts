export type DemoLifecycleState =
  'SCHEDULED' | 'PREPARING' | 'OPEN' | 'READ_ONLY' | 'CLOSED';

export type DemoOrganizationSlug = 'neuroscience-gateway' | 'citizen-science';

export type DemoResearchContext =
  'REPRODUCIBLE_ANALYSIS' | 'RESEARCH_DATASET' | 'SOFTWARE_RELEASE';

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
}

export interface DemoArtifactRequest {
  requestId: string;
  fingerprint: string;
  sizeBytes: number;
  extension: string;
  researchContext: DemoResearchContext;
}

export interface DemoArtifact {
  id: string;
  title: string;
  organization: string;
  contributorAlias: string;
  fingerprint: string;
  manifestName: string;
  verified: boolean;
  submissionState: string;
  blockchainTxId?: string | null;
  submissionError?: string | null;
  submittedAt: string;
}

export interface DemoWorkflowRequest {
  requestId: string;
  artifactIds: string[];
  researchContext: DemoResearchContext;
}

export interface DemoWorkflow {
  id: string;
  title: string;
  organization: string;
  contributorAlias: string;
  artifactIds: string[];
  submissionState: string;
  blockchainTxId?: string | null;
  submissionError?: string | null;
  submittedAt: string;
}

export interface DemoCatalogArtifact {
  id: string;
  title: string;
  description: string;
  organization: string;
  organizationSlug: DemoOrganizationSlug;
  contributorAlias: string;
  researchContext: string | null;
  verified: boolean;
  submissionState: string;
  submittedAt: string;
}

export interface DemoCatalogWorkflow {
  id: string;
  title: string;
  description: string;
  organization: string;
  organizationSlug: DemoOrganizationSlug;
  contributorAlias: string;
  researchContext: string | null;
  artifactIds: string[];
  submissionState: string;
  submittedAt: string;
}

export interface DemoHistoryItem {
  txId?: string;
  transactionId?: string;
  timestamp?: string;
  isDelete?: boolean;
  value?: Record<string, unknown>;
}

export interface DemoArtifactHistory {
  artifactId: string;
  items?: DemoHistoryItem[];
  history?: DemoHistoryItem[];
  total?: number;
}
