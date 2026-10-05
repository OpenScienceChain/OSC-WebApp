import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { DemoCatalogArtifact, DemoCatalogWorkflow } from './demo.models';
import { DemoService } from './demo.service';
import { PublicCatalogService } from './public-catalog.service';
import { safeExternalUrl } from '../shared/safe-external-url';

@Component({
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <main id="main-content" class="record-page">
      <div class="record-shell">
        <div *ngIf="isLoading" class="state-panel" role="status">
          Loading workflow record...
        </div>
        <div
          *ngIf="!isLoading && errorMessage"
          class="state-panel state-error"
          role="alert"
        >
          <strong>Workflow unavailable</strong>
          <p>{{ errorMessage }}</p>
          <button type="button" (click)="loadWorkflow()">Try again</button>
        </div>
        <ng-container *ngIf="!isLoading && workflow">
          <header class="record-header">
            <div class="record-kicker">
              <span>Scientific Workflow</span
              ><span
                class="record-state"
                [class.is-confirmed]="confirmed"
                [class.is-failed]="workflow.submissionState === 'FAILED'"
                [class.is-pending]="workflow.submissionState === 'PENDING'"
                >{{ workflow.submissionState }}</span
              >
            </div>
            <h1>{{ workflow.title }}</h1>
            <h2 class="visually-hidden">Description</h2>
            <p class="record-description pre-wrap">
              {{ workflow.description }}
            </p>
          </header>
          <div
            *ngIf="workflow.submissionState === 'FAILED'"
            class="submission-notice is-failed"
            role="status"
          >
            <strong>Blockchain submission failed</strong>
            <p>
              {{
                workflow.failureReason ||
                  'Blockchain submission failed. No ledger confirmation was recorded.'
              }}
            </p>
          </div>
          <div
            *ngIf="workflow.submissionState === 'PENDING'"
            class="submission-notice is-pending"
            role="status"
          >
            <strong>Blockchain confirmation pending</strong>
            <p>This submission is still awaiting a ledger transaction.</p>
          </div>
          <section
            class="ledger-confirmation"
            [class.is-pending]="workflow.submissionState === 'PENDING'"
            [class.is-failed]="workflow.submissionState === 'FAILED'"
            aria-labelledby="ledger-heading"
          >
            <i
              class="bi"
              [class.bi-shield-check]="confirmed"
              [class.bi-hourglass-split]="
                workflow.submissionState === 'PENDING'
              "
              [class.bi-exclamation-triangle]="
                workflow.submissionState === 'FAILED'
              "
              aria-hidden="true"
            ></i>
            <div class="ledger-summary">
              <p class="section-label">Workflow provenance</p>
              <h2 id="ledger-heading">
                {{
                  confirmed
                    ? 'Recorded on the OSC permissioned blockchain'
                    : workflow.submissionState === 'FAILED'
                      ? 'No ledger confirmation was recorded'
                      : 'Ledger confirmation in progress'
                }}
              </h2>
              <p *ngIf="confirmed">
                The transaction connects this workflow, its linked artifacts,
                contributor, and organization to a tamper-evident history.
              </p>
            </div>
            <dl class="ledger-facts">
              <div>
                <dt>State</dt>
                <dd>{{ workflow.submissionState }}</dd>
              </div>
              <div *ngIf="confirmed">
                <dt>Blockchain TX</dt>
                <dd>
                  <code>{{ workflow.blockchainTxId }}</code>
                </dd>
              </div>
              <div *ngIf="!confirmed">
                <dt>Provenance</dt>
                <dd>
                  {{
                    workflow.submissionState === 'FAILED'
                      ? 'Not confirmed on the blockchain'
                      : 'Awaiting blockchain confirmation'
                  }}
                </dd>
              </div>
            </dl>
          </section>
          <div
            class="record-layout"
            [class.is-identity-only]="
              !workflow.keywords?.length && !workflow.submissionComment
            "
          >
            <section
              *ngIf="workflow.keywords?.length || workflow.submissionComment"
              class="record-context"
              aria-labelledby="context-heading"
            >
              <p class="section-label">Workflow metadata</p>
              <h2 id="context-heading">Metadata kept with the process</h2>
              <table class="detail-table">
                <tbody>
                  <tr *ngIf="workflow.keywords?.length">
                    <th scope="row">Keywords</th>
                    <td>
                      <span
                        class="keyword-badge"
                        *ngFor="let keyword of workflow.keywords"
                        >{{ keyword }}</span
                      >
                    </td>
                  </tr>
                  <tr *ngIf="workflow.submissionComment">
                    <th scope="row">Submission Comment</th>
                    <td class="pre-wrap">{{ workflow.submissionComment }}</td>
                  </tr>
                </tbody>
              </table>
            </section>
            <aside
              class="record-identity"
              aria-labelledby="workflow-details-heading"
            >
              <p class="section-label">Record identity</p>
              <h2 id="workflow-details-heading">
                Who registered this workflow
              </h2>
              <dl class="identity-list">
                <div>
                  <dt>Contributor</dt>
                  <dd>{{ workflow.contributorAlias }}</dd>
                </div>
                <div>
                  <dt>ID</dt>
                  <dd>
                    <code>{{ workflow.id }}</code>
                    <button
                      type="button"
                      class="copy-id"
                      [class.is-copied]="copied"
                      (click)="copyId()"
                      [title]="
                        copied ? 'Workflow ID copied' : 'Copy workflow ID'
                      "
                      [attr.aria-label]="
                        copied ? 'Workflow ID copied' : 'Copy workflow ID'
                      "
                    >
                      <i
                        [class]="copied ? 'bi bi-check-lg' : 'bi bi-clipboard'"
                        [class.copied]="copied"
                        aria-hidden="true"
                      ></i>
                    </button>
                    <span
                      *ngIf="copyMessage"
                      class="copy-feedback"
                      [class.is-error]="!copied"
                      aria-hidden="true"
                    >
                      <i *ngIf="copied" class="bi bi-check-circle-fill"></i>
                      {{ copied ? 'Copied' : 'Could not copy ID' }}
                    </span>
                    <span
                      class="visually-hidden"
                      role="status"
                      aria-live="polite"
                      >{{ copyMessage }}</span
                    >
                  </dd>
                </div>
                <div>
                  <dt>Organization</dt>
                  <dd>{{ workflow.organization }}</dd>
                </div>
                <div>
                  <dt>Submitted</dt>
                  <dd>{{ workflow.submittedAt | date: 'medium' }}</dd>
                </div>
              </dl>
            </aside>
          </div>
          <section
            class="linked-section"
            *ngIf="workflow.artifactIds.length"
            aria-labelledby="linked-heading"
          >
            <div class="section-heading-row">
              <div>
                <p class="section-label">Research inputs</p>
                <h2 id="linked-heading">Linked artifacts</h2>
              </div>
              <span>{{ workflow.artifactIds.length }} total</span>
            </div>
            <ol
              class="linked-records"
              [attr.start]="(artifactPage - 1) * pageSize + 1"
            >
              <li *ngFor="let id of paginatedArtifactIds; let index = index">
                <span class="linked-index" aria-hidden="true">{{
                  (artifactPage - 1) * pageSize + index + 1
                }}</span>
                <i class="bi bi-file-earmark-text" aria-hidden="true"></i>
                <div>
                  <a [routerLink]="['/artifacts', id]">{{
                    linkedArtifacts[id]?.title || 'Artifact ' + id
                  }}</a>
                  <p *ngIf="linkedArtifacts[id]?.description">
                    {{ linkedArtifacts[id].description }}
                  </p>
                </div>
                <i class="bi bi-arrow-up-right" aria-hidden="true"></i>
              </li>
            </ol>
            <nav
              *ngIf="artifactPageCount > 1"
              class="artifact-pagination"
              aria-label="Linked artifacts pages"
            >
              <button
                type="button"
                (click)="setArtifactPage(artifactPage - 1)"
                [disabled]="artifactPage === 1"
              >
                Previous
              </button>
              <span aria-live="polite"
                >Page {{ artifactPage }} of {{ artifactPageCount }}</span
              >
              <button
                type="button"
                (click)="setArtifactPage(artifactPage + 1)"
                [disabled]="artifactPage === artifactPageCount"
              >
                Next
              </button>
            </nav>
          </section>
          <section
            class="repository-section"
            *ngIf="workflow.githubRepositories?.length"
          >
            <p class="section-label">Source code</p>
            <h2>GitHub Repositories</h2>
            <div
              class="repository-record"
              *ngFor="let repository of workflow.githubRepositories"
            >
              <h3>
                <a
                  *ngIf="
                    safeExternalUrl(repository.url) as href;
                    else plainRepository
                  "
                  [href]="href"
                  target="_blank"
                  rel="noopener noreferrer"
                  >{{ repository.url }}</a
                >
                <ng-template #plainRepository
                  ><span>{{ repository.url }}</span></ng-template
                >
              </h3>
              <p *ngIf="repository.description">{{ repository.description }}</p>
              <p *ngIf="repository.gitHash">
                <strong>Commit:</strong> <code>{{ repository.gitHash }}</code>
              </p>
            </div>
          </section>
          <div class="record-actions">
            <a class="secondary-action" routerLink="/list-workflows"
              ><i class="bi bi-arrow-left" aria-hidden="true"></i>Back to
              Workflows</a
            >
            <a
              class="primary-action"
              [routerLink]="['/workflows', workflow.id, 'history']"
              ><i class="bi bi-clock-history" aria-hidden="true"></i>History</a
            >
            <a
              class="primary-action"
              [routerLink]="['/update-workflow', workflow.id]"
              ><i class="bi bi-pencil-square" aria-hidden="true"></i>Manage
              Workflow</a
            >
          </div>
          <p
            *ngIf="
              demo.session?.accountUsername &&
              (!confirmed || (ownershipChecked && !canEdit))
            "
            class="manage-restriction"
            role="status"
          >
            {{
              !confirmed
                ? 'Workflow management is available after ledger confirmation.'
                : ownershipCheckFailed
                  ? 'Workflow management could not be verified right now.'
                  : 'Only the contributing account can manage this workflow.'
            }}
          </p>
        </ng-container>
      </div>
    </main>
  `,
  styleUrls: [
    './guest-artifact-detail.component.css',
    './guest-workflow-detail.component.css',
  ],
})
export class GuestWorkflowDetailComponent implements OnInit, OnDestroy {
  readonly safeExternalUrl = safeExternalUrl;
  readonly pageSize = 6;
  workflow?: DemoCatalogWorkflow;
  linkedArtifacts: Record<string, DemoCatalogArtifact> = {};
  artifactPage = 1;
  isLoading = true;
  errorMessage = '';
  canEdit = false;
  ownershipChecked = false;
  ownershipCheckFailed = false;
  copied = false;
  copyMessage = '';
  private copyReset?: ReturnType<typeof setTimeout>;
  private loadedArtifactIds = new Set<string>();
  private id = '';
  constructor(
    private readonly route: ActivatedRoute,
    public readonly demo: DemoService,
    private readonly catalog: PublicCatalogService,
  ) {}
  ngOnInit(): void {
    this.id = this.route.snapshot.paramMap.get('id') || '';
    this.loadWorkflow();
  }
  ngOnDestroy(): void {
    clearTimeout(this.copyReset);
  }
  get confirmed(): boolean {
    return (
      this.workflow?.submissionState === 'SUCCESS' &&
      !!this.workflow.blockchainTxId
    );
  }
  get artifactPageCount(): number {
    return Math.ceil((this.workflow?.artifactIds.length ?? 0) / this.pageSize);
  }
  get paginatedArtifactIds(): string[] {
    const start = (this.artifactPage - 1) * this.pageSize;
    return this.workflow?.artifactIds.slice(start, start + this.pageSize) ?? [];
  }
  setArtifactPage(page: number): void {
    if (page < 1 || page > this.artifactPageCount) return;
    this.artifactPage = page;
    this.loadVisibleArtifacts();
  }
  private loadVisibleArtifacts(): void {
    for (const artifactId of this.paginatedArtifactIds) {
      if (this.loadedArtifactIds.has(artifactId)) continue;
      this.loadedArtifactIds.add(artifactId);
      this.catalog.artifact(artifactId).subscribe({
        next: (artifact) => (this.linkedArtifacts[artifactId] = artifact),
      });
    }
  }
  loadWorkflow(): void {
    this.isLoading = true;
    this.errorMessage = '';
    this.canEdit = false;
    this.ownershipChecked = false;
    this.ownershipCheckFailed = false;
    this.catalog.workflow(this.id).subscribe({
      next: (workflow) => {
        this.workflow = workflow;
        this.linkedArtifacts = {};
        this.loadedArtifactIds.clear();
        this.artifactPage = 1;
        this.loadVisibleArtifacts();
        this.isLoading = false;
        if (this.demo.session?.accountUsername && this.confirmed) {
          this.demo.getMyWorkflows().subscribe({
            next: (items) => {
              this.canEdit = items.some(
                (item) =>
                  item.id === this.id && item.submissionState === 'SUCCESS',
              );
              this.ownershipChecked = true;
            },
            error: () => {
              this.canEdit = false;
              this.ownershipCheckFailed = true;
              this.ownershipChecked = true;
            },
          });
        }
      },
      error: () => {
        this.errorMessage = 'This public workflow could not be loaded.';
        this.isLoading = false;
      },
    });
  }
  async copyId(): Promise<void> {
    try {
      await navigator.clipboard.writeText(this.id);
      this.copied = true;
      this.copyMessage = 'Workflow ID copied to clipboard.';
      clearTimeout(this.copyReset);
      this.copyReset = setTimeout(() => {
        this.copied = false;
        this.copyMessage = '';
      }, 4000);
    } catch {
      this.copied = false;
      this.copyMessage = 'Could not copy workflow ID.';
    }
  }
}
