import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Subscription, forkJoin, timer } from 'rxjs';
import { switchMap, take, takeWhile } from 'rxjs/operators';
import {
  DemoArtifact,
  DemoCatalogArtifact,
  DemoCatalogWorkflow,
  DemoCounters,
  DemoHistoryItem,
  DemoLifecycleState,
  DemoOrganizationSlug,
  DemoResearchContext,
  DemoSession,
  DemoStatus,
  DemoWorkflow,
} from './demo.models';
import { DemoService } from './demo.service';

interface OrganizationChoice {
  slug: DemoOrganizationSlug;
  name: string;
  description: string;
}

interface ResearchContextChoice {
  value: DemoResearchContext;
  label: string;
}

const MAX_FILE_BYTES = 10 * 1024 * 1024;
const ALLOWED_EXTENSIONS = new Set([
  'csv',
  'json',
  'md',
  'pdf',
  'png',
  'tif',
  'tiff',
  'txt',
  'yaml',
  'yml',
]);

@Component({
  selector: 'app-demo',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './demo.component.html',
  styleUrls: ['./demo.component.css'],
})
export class DemoComponent implements OnInit, OnDestroy {
  readonly organizations: OrganizationChoice[] = [
    {
      slug: 'neuroscience-gateway',
      name: 'Neuroscience Gateway',
      description: 'Explore reproducible neuroscience research provenance.',
    },
    {
      slug: 'citizen-science',
      name: 'Citizen Science',
      description: 'Explore community-generated research provenance.',
    },
  ];
  readonly researchContexts: ResearchContextChoice[] = [
    { value: 'RESEARCH_DATASET', label: 'Research dataset' },
    { value: 'REPRODUCIBLE_ANALYSIS', label: 'Reproducible analysis' },
    { value: 'SOFTWARE_RELEASE', label: 'Software release' },
  ];
  readonly allowedExtensions = Array.from(ALLOWED_EXTENSIONS).join(', ');

  status?: DemoStatus;
  counters?: DemoCounters;
  session: DemoSession | null = null;
  selectedOrganization: DemoOrganizationSlug | '' = '';
  catalogOrganization: DemoOrganizationSlug | 'all' = 'all';
  catalogArtifacts: DemoCatalogArtifact[] = [];
  catalogWorkflows: DemoCatalogWorkflow[] = [];
  createdArtifacts: DemoArtifact[] = [];
  createdWorkflows: DemoWorkflow[] = [];

  statusLoading = true;
  statusError = '';
  catalogLoading = true;
  catalogError = '';
  sessionLoading = false;
  sessionError = '';

  artifactContext: DemoResearchContext = 'RESEARCH_DATASET';
  artifactHash = '';
  artifactExtension = '';
  artifactSize = 0;
  artifactHashing = false;
  artifactSubmitting = false;
  artifactError = '';
  artifactHistory: DemoHistoryItem[] = [];
  artifactHistoryFor = '';
  artifactHistoryLoading = false;
  private selectedFile?: File;
  private pendingArtifactRequestId = '';

  workflowContext: DemoResearchContext = 'REPRODUCIBLE_ANALYSIS';
  selectedArtifactIds = new Set<string>();
  workflowSubmitting = false;
  workflowError = '';
  workflowHistoryFor = '';
  workflowHistory: DemoHistoryItem[] = [];
  workflowHistoryLoading = false;
  private pendingWorkflowRequestId = '';

  private readonly subscriptions = new Subscription();

  constructor(private readonly demo: DemoService) {}

  ngOnInit(): void {
    this.session = this.demo.session;
    this.refreshStatus();
    this.refreshCounters();
    this.refreshCatalog();
    this.subscriptions.add(
      timer(30_000, 30_000).subscribe(() => {
        this.refreshStatus();
        this.refreshCounters();
        this.refreshCatalog();
      }),
    );
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  get interactionsAllowed(): boolean {
    return this.status?.state === 'OPEN' && Boolean(this.session);
  }

  get selectedOrganizationName(): string {
    return (
      this.organizations.find(
        (organization) => organization.slug === this.session?.organization,
      )?.name || ''
    );
  }

  get ownArtifactOptions(): Array<{
    id: string;
    title: string;
    state: string;
  }> {
    const options = new Map<
      string,
      { id: string; title: string; state: string }
    >();
    for (const artifact of this.catalogArtifacts) {
      if (
        artifact.contributorAlias === this.session?.contributorAlias &&
        artifact.organizationSlug === this.session.organization
      ) {
        options.set(artifact.id, {
          id: artifact.id,
          title: artifact.title,
          state: artifact.submissionState,
        });
      }
    }
    for (const artifact of this.createdArtifacts) {
      options.set(artifact.id, {
        id: artifact.id,
        title: artifact.title,
        state: artifact.submissionState,
      });
    }
    return Array.from(options.values());
  }

  trackArtifactOption(_index: number, artifact: { id: string }): string {
    return artifact.id;
  }

  get artifactReady(): boolean {
    return Boolean(
      this.interactionsAllowed &&
      this.artifactHash &&
      this.artifactExtension &&
      this.artifactSize &&
      !this.artifactHashing &&
      !this.artifactSubmitting,
    );
  }

  get workflowReady(): boolean {
    return (
      this.interactionsAllowed &&
      this.selectedArtifactIds.size >= 1 &&
      this.selectedArtifactIds.size <= 3 &&
      !this.workflowSubmitting
    );
  }

  selectOrganization(slug: DemoOrganizationSlug): void {
    if (this.session) return;
    this.selectedOrganization = slug;
    this.sessionError = '';
  }

  startSession(): void {
    if (!this.selectedOrganization || this.status?.state !== 'OPEN') return;
    this.sessionLoading = true;
    this.sessionError = '';
    this.demo.createSession(this.selectedOrganization).subscribe({
      next: (session) => {
        this.session = session;
        this.sessionLoading = false;
        this.refreshCounters();
        this.refreshCatalog();
      },
      error: (error) => {
        this.sessionLoading = false;
        this.sessionError = this.errorMessage(
          error,
          'The guest session could not be started. Please try again.',
        );
        this.refreshStatus();
      },
    });
  }

  refreshSession(): void {
    if (!this.session || this.status?.state !== 'OPEN') return;
    this.sessionLoading = true;
    this.sessionError = '';
    this.demo.refreshSession().subscribe({
      next: (session) => {
        this.session = session;
        this.sessionLoading = false;
      },
      error: (error) => {
        this.sessionLoading = false;
        this.handleSessionError(error);
      },
    });
  }

  async onFileSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    this.resetArtifactSelection();
    if (!file) return;

    const extension = file.name.split('.').pop()?.toLowerCase() || '';
    if (file.size < 1 || file.size > MAX_FILE_BYTES) {
      this.artifactError = 'Choose a non-empty file no larger than 10 MiB.';
      input.value = '';
      return;
    }
    if (!ALLOWED_EXTENSIONS.has(extension)) {
      this.artifactError = `Choose one of these file types: ${this.allowedExtensions}.`;
      input.value = '';
      return;
    }

    this.selectedFile = file;
    this.artifactExtension = extension;
    this.artifactSize = file.size;
    this.artifactHashing = true;
    try {
      const bytes = await file.arrayBuffer();
      const digest = await crypto.subtle.digest('SHA-256', bytes);
      if (this.selectedFile !== file) return;
      this.artifactHash = Array.from(new Uint8Array(digest), (value) =>
        value.toString(16).padStart(2, '0'),
      ).join('');
    } catch {
      this.artifactError =
        'This browser could not compute SHA-256 for the selected file.';
      this.selectedFile = undefined;
    } finally {
      this.artifactHashing = false;
    }
  }

  submitArtifact(): void {
    if (!this.artifactReady) return;
    this.artifactSubmitting = true;
    this.artifactError = '';
    this.pendingArtifactRequestId ||= crypto.randomUUID();
    this.demo
      .createArtifact({
        requestId: this.pendingArtifactRequestId,
        fingerprint: this.artifactHash,
        sizeBytes: this.artifactSize,
        extension: this.artifactExtension,
        researchContext: this.artifactContext,
      })
      .subscribe({
        next: (artifact) => {
          this.artifactSubmitting = false;
          this.pendingArtifactRequestId = '';
          this.updateArtifact(artifact);
          this.pollArtifact(artifact.id);
          this.refreshCounters();
          this.refreshCatalog();
        },
        error: (error) => {
          this.artifactSubmitting = false;
          this.artifactError = this.errorMessage(
            error,
            'The fingerprint could not be submitted. Retrying will reuse the same request ID.',
          );
          this.handleUnauthorized(error);
          this.refreshStatus();
        },
      });
  }

  toggleArtifact(id: string, checked: boolean): void {
    this.workflowError = '';
    if (checked) {
      if (this.selectedArtifactIds.size >= 3) {
        this.workflowError = 'A workflow may link at most three artifacts.';
        return;
      }
      this.selectedArtifactIds.add(id);
    } else {
      this.selectedArtifactIds.delete(id);
    }
  }

  submitWorkflow(): void {
    if (!this.workflowReady) return;
    this.workflowSubmitting = true;
    this.workflowError = '';
    this.pendingWorkflowRequestId ||= crypto.randomUUID();
    this.demo
      .createWorkflow({
        requestId: this.pendingWorkflowRequestId,
        artifactIds: Array.from(this.selectedArtifactIds),
        researchContext: this.workflowContext,
      })
      .subscribe({
        next: (workflow) => {
          this.workflowSubmitting = false;
          this.pendingWorkflowRequestId = '';
          this.updateWorkflow(workflow);
          this.pollWorkflow(workflow.id);
          this.refreshCounters();
          this.refreshCatalog();
        },
        error: (error) => {
          this.workflowSubmitting = false;
          this.workflowError = this.errorMessage(
            error,
            'The workflow could not be submitted. Retrying will reuse the same request ID.',
          );
          this.handleUnauthorized(error);
          this.refreshStatus();
        },
      });
  }

  loadArtifactHistory(artifact: DemoArtifact): void {
    this.artifactHistoryLoading = true;
    this.artifactHistoryFor = artifact.id;
    this.artifactHistory = [];
    this.demo.getArtifactHistory(artifact.id).subscribe({
      next: (history) => {
        this.artifactHistory = history.items || history.history || [];
        this.artifactHistoryLoading = false;
        this.refreshCounters();
      },
      error: (error) => {
        this.artifactHistoryLoading = false;
        this.artifactError = this.errorMessage(
          error,
          'Provenance history is temporarily unavailable.',
        );
        this.handleUnauthorized(error);
      },
    });
  }

  viewWorkflowHistory(workflow: DemoWorkflow): void {
    this.workflowHistoryFor = workflow.id;
    this.workflowHistory = [];
    this.workflowHistoryLoading = true;
    this.demo.getWorkflowHistory(workflow.id).subscribe({
      next: (history) => {
        this.workflowHistory = history.items || history.history || [];
        this.workflowHistoryLoading = false;
        this.refreshCounters();
      },
      error: (error) => {
        this.workflowHistoryLoading = false;
        this.workflowError = this.errorMessage(
          error,
          'Workflow history is temporarily unavailable.',
        );
        this.handleUnauthorized(error);
      },
    });
  }

  setCatalogOrganization(value: DemoOrganizationSlug | 'all'): void {
    this.catalogOrganization = value;
    this.refreshCatalog();
  }

  stateDescription(state?: DemoLifecycleState): string {
    const descriptions: Record<DemoLifecycleState, string> = {
      SCHEDULED:
        'The stable status page is available; contributions have not opened.',
      PREPARING:
        'The temporary environment is starting and completing safety checks.',
      OPEN: 'Guest sessions and bounded contributions are available now.',
      READ_ONLY:
        'New writes are paused; public records and status remain available.',
      CLOSED:
        'The expensive runtime is off; this status page remains available.',
    };
    return state ? descriptions[state] : '';
  }

  formatBytes(bytes: number): string {
    if (bytes < 1024) return `${bytes} bytes`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KiB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MiB`;
  }

  historyTransaction(item: DemoHistoryItem): string {
    return item.txId || item.transactionId || 'Pending ledger transaction';
  }

  refreshStatus(): void {
    this.demo.getStatus().subscribe({
      next: (status) => {
        this.status = status;
        this.statusLoading = false;
        this.statusError = '';
      },
      error: () => {
        this.statusLoading = false;
        this.statusError =
          'Live status is temporarily unavailable. The static conference page remains safe to use.';
      },
    });
  }

  private refreshCounters(): void {
    this.demo.getCounters().subscribe({
      next: (counters) => (this.counters = counters),
      error: () => undefined,
    });
  }

  private refreshCatalog(): void {
    this.catalogLoading = true;
    this.catalogError = '';
    const organization =
      this.catalogOrganization === 'all' ? undefined : this.catalogOrganization;
    forkJoin({
      artifacts: this.demo.listArtifacts(organization),
      workflows: this.demo.listWorkflows(organization),
    }).subscribe({
      next: ({ artifacts, workflows }) => {
        this.catalogArtifacts = artifacts;
        this.catalogWorkflows = workflows;
        this.catalogLoading = false;
      },
      error: () => {
        this.catalogLoading = false;
        this.catalogError =
          'Public demonstration records are temporarily unavailable.';
      },
    });
  }

  private pollArtifact(id: string): void {
    const poll = timer(2_000, 2_000)
      .pipe(
        switchMap(() => this.demo.getArtifact(id)),
        takeWhile(
          (artifact) => !this.isTerminal(artifact.submissionState),
          true,
        ),
        take(150),
      )
      .subscribe({
        next: (artifact) => {
          this.updateArtifact(artifact);
          if (this.isTerminal(artifact.submissionState)) {
            this.refreshCounters();
            this.refreshCatalog();
          }
        },
        error: (error) => {
          this.artifactError = this.errorMessage(
            error,
            'Confirmation polling paused. You can still inspect the accepted record.',
          );
          this.handleUnauthorized(error);
        },
      });
    this.subscriptions.add(poll);
  }

  private pollWorkflow(id: string): void {
    const poll = timer(2_000, 2_000)
      .pipe(
        switchMap(() => this.demo.getWorkflow(id)),
        takeWhile(
          (workflow) => !this.isTerminal(workflow.submissionState),
          true,
        ),
        take(150),
      )
      .subscribe({
        next: (workflow) => {
          this.updateWorkflow(workflow);
          if (this.isTerminal(workflow.submissionState)) {
            this.refreshCounters();
            this.refreshCatalog();
          }
        },
        error: (error) => {
          this.workflowError = this.errorMessage(
            error,
            'Confirmation polling paused. You can still inspect the accepted record.',
          );
          this.handleUnauthorized(error);
        },
      });
    this.subscriptions.add(poll);
  }

  private isTerminal(state: string): boolean {
    return state === 'SUCCESS' || state === 'FAILED';
  }

  private updateArtifact(artifact: DemoArtifact): void {
    const index = this.createdArtifacts.findIndex(
      (item) => item.id === artifact.id,
    );
    if (index === -1) {
      this.createdArtifacts = [artifact, ...this.createdArtifacts];
    } else {
      this.createdArtifacts = this.createdArtifacts.map((item, itemIndex) =>
        itemIndex === index ? artifact : item,
      );
    }
  }

  private updateWorkflow(workflow: DemoWorkflow): void {
    const index = this.createdWorkflows.findIndex(
      (item) => item.id === workflow.id,
    );
    if (index === -1) {
      this.createdWorkflows = [workflow, ...this.createdWorkflows];
    } else {
      this.createdWorkflows = this.createdWorkflows.map((item, itemIndex) =>
        itemIndex === index ? workflow : item,
      );
    }
  }

  private resetArtifactSelection(): void {
    this.selectedFile = undefined;
    this.artifactHash = '';
    this.artifactExtension = '';
    this.artifactSize = 0;
    this.artifactError = '';
    this.pendingArtifactRequestId = '';
  }

  private handleSessionError(error: any): void {
    this.sessionError = this.errorMessage(
      error,
      'The guest session could not be refreshed.',
    );
    this.handleUnauthorized(error);
  }

  private handleUnauthorized(error: any): void {
    if (error?.status === 401) {
      this.demo.clearSession();
      this.session = null;
      this.selectedOrganization = '';
      this.sessionError =
        'The short-lived guest session expired. Start a new session while the demonstration is open.';
    }
  }

  private errorMessage(error: any, fallback: string): string {
    if (error?.status === 429) {
      return 'This guest session has reached its contribution limit.';
    }
    if (error?.status === 503) {
      return 'New contributions are paused. Public records remain available.';
    }
    if (error?.status === 403) {
      return 'This operation is outside the guest session capability.';
    }
    if (error?.status === 409) {
      return 'This request conflicts with an earlier request or was already submitted.';
    }
    return fallback;
  }
}
