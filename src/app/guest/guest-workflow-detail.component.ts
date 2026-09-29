import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { DemoCatalogArtifact, DemoCatalogWorkflow } from './demo.models';
import { DemoService } from './demo.service';

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
          <div class="record-layout workflow-body">
            <section
              class="description-col"
              aria-labelledby="workflow-description-heading"
            >
              <h2 id="workflow-description-heading">Description</h2>
              <p class="pre-wrap">{{ workflow.description }}</p>
            </section>
            <aside
              class="record-identity details-col"
              aria-labelledby="workflow-details-heading"
            >
              <h2 id="workflow-details-heading">Details</h2>
              <table class="table table-borderless detail-table">
                <tbody>
                  <tr>
                    <th scope="row">ID</th>
                    <td>
                      <code>{{ workflow.id }}</code>
                    </td>
                  </tr>
                  <tr>
                    <th scope="row">Organization</th>
                    <td>{{ workflow.organization }}</td>
                  </tr>
                  <tr>
                    <th scope="row">Submitter</th>
                    <td>{{ workflow.contributorAlias }}</td>
                  </tr>
                  <tr>
                    <th scope="row">Submitted</th>
                    <td>{{ workflow.submittedAt | date: 'medium' }}</td>
                  </tr>
                  <tr>
                    <th scope="row">State</th>
                    <td>
                      <span
                        class="record-state"
                        [class.is-confirmed]="confirmed"
                        [class.is-failed]="
                          workflow.submissionState === 'FAILED'
                        "
                        [class.is-pending]="
                          workflow.submissionState === 'PENDING'
                        "
                        >{{ workflow.submissionState }}</span
                      >
                    </td>
                  </tr>
                  <tr *ngIf="confirmed">
                    <th scope="row">Blockchain TX</th>
                    <td>
                      <code>{{ workflow.blockchainTxId }}</code>
                    </td>
                  </tr>
                  <tr *ngIf="!confirmed">
                    <th scope="row">Provenance</th>
                    <td>
                      {{
                        workflow.submissionState === 'FAILED'
                          ? 'Not confirmed on the blockchain'
                          : 'Awaiting blockchain confirmation'
                      }}
                    </td>
                  </tr>
                </tbody>
              </table>
            </aside>
          </div>
          <section *ngIf="workflow.keywords?.length" class="record-section">
            <h2><i class="bi bi-tags" aria-hidden="true"></i> Keywords</h2>
            <span
              class="keyword-badge"
              *ngFor="let keyword of workflow.keywords"
              >{{ keyword }}</span
            >
          </section>
          <section *ngIf="workflow.submissionComment" class="record-section">
            <h2>Submission Comment</h2>
            <p class="pre-wrap">{{ workflow.submissionComment }}</p>
          </section>
          <section class="record-section" *ngIf="workflow.artifactIds.length">
            <h2>
              <i class="bi bi-database" aria-hidden="true"></i> Linked Artifacts
            </h2>
            <div
              class="linked-artifact"
              *ngFor="let id of workflow.artifactIds"
            >
              <h3>
                <a [routerLink]="['/artifacts', id]">{{
                  linkedArtifacts[id]
                    ? linkedArtifacts[id].title
                    : 'Artifact ' + id
                }}</a>
              </h3>
              <p *ngIf="linkedArtifacts[id] && linkedArtifacts[id].description">
                <strong>Description:</strong>
                {{ linkedArtifacts[id].description }}
              </p>
            </div>
          </section>
          <section
            class="record-section"
            *ngIf="workflow.githubRepositories?.length"
          >
            <h2>
              <i class="bi bi-github" aria-hidden="true"></i> GitHub
              Repositories
            </h2>
            <div
              class="linked-artifact"
              *ngFor="let repository of workflow.githubRepositories"
            >
              <h3>
                <a
                  [href]="repository.url"
                  target="_blank"
                  rel="noopener noreferrer"
                  >{{ repository.url }}</a
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
              *ngIf="canEdit"
              class="primary-action"
              [routerLink]="['/update-workflow', workflow.id]"
              ><i class="bi bi-pencil-square" aria-hidden="true"></i>Manage
              Workflow</a
            >
            <a
              *ngIf="!canEdit && !demo.session"
              class="secondary-action"
              routerLink="/auth/sign-in"
              >Sign in to manage</a
            >
          </div>
        </ng-container>
      </div>
    </main>
  `,
  styleUrls: ['./guest-workflow-detail.component.css'],
})
export class GuestWorkflowDetailComponent implements OnInit {
  workflow?: DemoCatalogWorkflow;
  linkedArtifacts: Record<string, DemoCatalogArtifact> = {};
  isLoading = true;
  errorMessage = '';
  canEdit = false;
  private id = '';
  constructor(
    private readonly route: ActivatedRoute,
    public readonly demo: DemoService,
  ) {}
  ngOnInit(): void {
    this.id = this.route.snapshot.paramMap.get('id') || '';
    this.loadWorkflow();
  }
  get confirmed(): boolean {
    return (
      this.workflow?.submissionState === 'SUCCESS' &&
      !!this.workflow.blockchainTxId
    );
  }
  loadWorkflow(): void {
    this.isLoading = true;
    this.errorMessage = '';
    this.canEdit = false;
    this.demo.getPublicWorkflow(this.id).subscribe({
      next: (workflow) => {
        this.workflow = workflow;
        this.linkedArtifacts = {};
        for (const artifactId of workflow.artifactIds) {
          this.demo.getPublicArtifact(artifactId).subscribe({
            next: (artifact) => (this.linkedArtifacts[artifactId] = artifact),
          });
        }
        this.isLoading = false;
        if (this.demo.session && this.confirmed) {
          this.demo.getMyWorkflows().subscribe({
            next: (items) =>
              (this.canEdit = items.some(
                (item) =>
                  item.id === this.id && item.submissionState === 'SUCCESS',
              )),
            error: () => (this.canEdit = false),
          });
        }
      },
      error: () => {
        this.errorMessage = 'This public workflow could not be loaded.';
        this.isLoading = false;
      },
    });
  }
}
