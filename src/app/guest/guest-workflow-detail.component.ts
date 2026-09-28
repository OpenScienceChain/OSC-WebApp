import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { DemoCatalogWorkflow } from './demo.models';
import { DemoService } from './demo.service';

@Component({
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <main id="main-content" class="record-page">
      <div class="record-shell">
        <a class="back-link" routerLink="/list-workflows"
          ><i class="bi bi-arrow-left" aria-hidden="true"></i>Back to
          workflows</a
        >
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
              <span>Scientific workflow</span
              ><span class="record-state" [class.is-confirmed]="confirmed">{{
                workflow.submissionState
              }}</span>
            </div>
            <h1>{{ workflow.title }}</h1>
            <p>{{ workflow.description }}</p>
          </header>
          <section
            class="ledger-confirmation"
            [class.is-pending]="!confirmed"
            aria-labelledby="workflow-ledger-heading"
          >
            <i class="bi bi-diagram-3" aria-hidden="true"></i>
            <div class="ledger-summary">
              <p class="section-label">Blockchain provenance</p>
              <h2 id="workflow-ledger-heading">
                {{
                  confirmed
                    ? 'Workflow relationships committed as a ledger event'
                    : 'Awaiting blockchain confirmation'
                }}
              </h2>
              <p>
                This event records which public artifacts were linked to the
                workflow.
              </p>
            </div>
            <dl class="ledger-facts" *ngIf="confirmed">
              <div>
                <dt>Transaction</dt>
                <dd>{{ workflow.blockchainTxId }}</dd>
              </div>
              <div>
                <dt>Submitted</dt>
                <dd>{{ workflow.submittedAt | date: 'medium' }}</dd>
              </div>
            </dl>
          </section>
          <div class="record-layout">
            <section aria-labelledby="workflow-context-heading">
              <p class="section-label">Workflow context</p>
              <h2 id="workflow-context-heading">Linked research outputs</h2>
              <ul>
                <li *ngFor="let id of workflow.artifactIds">
                  <a [routerLink]="['/artifacts', id]">Artifact {{ id }}</a>
                </li>
              </ul>
              <div *ngIf="workflow.keywords?.length">
                <h3>Keywords</h3>
                <p>{{ workflow.keywords?.join(', ') }}</p>
              </div>
              <div *ngIf="workflow.githubRepositories?.length">
                <h3>GitHub repositories</h3>
                <ul>
                  <li *ngFor="let repository of workflow.githubRepositories">
                    <a
                      [href]="repository.url"
                      target="_blank"
                      rel="noopener noreferrer"
                      >{{ repository.url }}</a
                    >
                    <span *ngIf="repository.description">
                      — {{ repository.description }}</span
                    >
                  </li>
                </ul>
              </div>
            </section>
            <aside
              class="record-identity"
              aria-labelledby="workflow-identity-heading"
            >
              <p class="section-label">Record identity</p>
              <h2 id="workflow-identity-heading">
                Who registered this workflow
              </h2>
              <dl>
                <div>
                  <dt>OSC ID</dt>
                  <dd>
                    <code>{{ workflow.id }}</code>
                  </dd>
                </div>
                <div>
                  <dt>Organization</dt>
                  <dd>{{ workflow.organization }}</dd>
                </div>
                <div>
                  <dt>Contributor</dt>
                  <dd>{{ workflow.contributorAlias }}</dd>
                </div>
                <div>
                  <dt>Submitted</dt>
                  <dd>{{ workflow.submittedAt | date: 'medium' }}</dd>
                </div>
              </dl>
            </aside>
          </div>
          <div class="record-actions">
            <a
              class="secondary-action"
              [routerLink]="['/workflows', workflow.id, 'history']"
              ><i class="bi bi-clock-history" aria-hidden="true"></i>View
              provenance history</a
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
  isLoading = true;
  errorMessage = '';
  private id = '';
  constructor(
    private readonly route: ActivatedRoute,
    private readonly demo: DemoService,
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
    this.demo.getPublicWorkflow(this.id).subscribe({
      next: (workflow) => {
        this.workflow = workflow;
        this.isLoading = false;
      },
      error: () => {
        this.errorMessage = 'This public workflow could not be loaded.';
        this.isLoading = false;
      },
    });
  }
}
