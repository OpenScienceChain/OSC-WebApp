import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { ActivatedRoute } from '@angular/router';
import {
  DemoCatalogArtifact,
  DemoCatalogWorkflow,
  DemoOrganizationSlug,
  DemoSession,
  DemoStatus,
} from './demo.models';
import { DemoService } from './demo.service';

@Component({
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  template: `
    <main
      id="main-content"
      class="catalog-page"
      aria-labelledby="guest-heading"
    >
      <header class="page-header">
        <p class="eyebrow">Open Science Chain catalog</p>
        <h1 id="guest-heading">
          {{
            catalogType === 'artifacts'
              ? 'Artifacts'
              : catalogType === 'workflows'
                ? 'Workflows'
                : 'Browse research records'
          }}
        </h1>
        <p>
          {{
            catalogType === 'all'
              ? 'Explore public artifacts and workflows, or start a bounded guest session to contribute.'
              : catalogType === 'artifacts'
                ? 'Discover datasets, software, publications, and their provenance.'
                : 'Explore documented processes and the research artifacts they connect.'
          }}
        </p>
      </header>

      <section
        class="guest-session"
        aria-labelledby="guest-session-heading"
        *ngIf="catalogType === 'all'"
      >
        <h2 id="guest-session-heading">Guest contribution</h2>
        <p *ngIf="status">
          Current run: {{ status.state | titlecase }}. {{ status.message }}
        </p>
        <p *ngIf="!status && statusError" role="alert">{{ statusError }}</p>
        <ng-container *ngIf="session; else sessionForm">
          <p role="status">
            Session active for {{ organizationLabel(session.organization) }} as
            {{ session.contributorAlias }}. Expires
            {{ session.expiresAt | date: 'medium' }}.
          </p>
          <div class="guest-actions">
            <a class="search-button" routerLink="/contribute">Add an artifact</a
            ><a class="search-button" routerLink="/create-workflow"
              >Add a workflow</a
            ><button type="button" (click)="refreshSession()" [disabled]="busy">
              Refresh session
            </button>
          </div>
        </ng-container>
        <ng-template #sessionForm>
          <label for="guest-organization">Organization</label>
          <select
            id="guest-organization"
            class="search-operator"
            [(ngModel)]="organization"
          >
            <option value="neuroscience-gateway">Neuroscience Gateway</option>
            <option value="citizen-science">Citizen Science</option>
          </select>
          <button
            type="button"
            class="search-button"
            (click)="startSession()"
            [disabled]="status?.state !== 'OPEN' || busy"
          >
            Start guest session
          </button>
          <p>
            This session can write only for the selected organization and lasts
            at most 30 minutes.
          </p>
        </ng-template>
        <p *ngIf="sessionError" class="text-danger" role="alert">
          {{ sessionError }}
        </p>
      </section>

      <section
        class="results"
        aria-labelledby="artifact-results-heading"
        *ngIf="catalogType !== 'workflows'"
      >
        <div class="results-heading">
          <h2 id="artifact-results-heading">Artifacts</h2>
          <p>{{ artifacts.length }} public records</p>
        </div>
        <p *ngIf="catalogError" role="alert">{{ catalogError }}</p>
        <div class="artifacts-grid">
          <article class="catalog-card" *ngFor="let artifact of artifacts">
            <header>
              <span class="record-type">Artifact</span>
              <h3>{{ artifact.title }}</h3>
            </header>
            <div class="card-body">
              <p class="description">{{ artifact.description }}</p>
              <dl>
                <div>
                  <dt>Organization</dt>
                  <dd>{{ artifact.organization }}</dd>
                </div>
                <div>
                  <dt>Ledger</dt>
                  <dd>{{ artifact.submissionState }}</dd>
                </div>
              </dl>
              <div class="card-actions">
                <a [routerLink]="['/artifacts', artifact.id]">View artifact</a
                ><a [routerLink]="['/artifacts', artifact.id, 'history']"
                  >History</a
                >
              </div>
            </div>
          </article>
        </div>
      </section>
      <section
        class="results"
        aria-labelledby="workflow-results-heading"
        *ngIf="catalogType !== 'artifacts'"
      >
        <div class="results-heading">
          <h2 id="workflow-results-heading">Workflows</h2>
          <p>{{ workflows.length }} public records</p>
        </div>
        <div class="artifacts-grid">
          <article class="catalog-card" *ngFor="let workflow of workflows">
            <header>
              <span class="record-type">Workflow</span>
              <h3>{{ workflow.title }}</h3>
            </header>
            <div class="card-body">
              <p class="description">{{ workflow.description }}</p>
              <dl>
                <div>
                  <dt>Organization</dt>
                  <dd>{{ workflow.organization }}</dd>
                </div>
                <div>
                  <dt>Ledger</dt>
                  <dd>{{ workflow.submissionState }}</dd>
                </div>
              </dl>
              <div class="card-actions">
                <a [routerLink]="['/workflows', workflow.id]">View workflow</a>
              </div>
            </div>
          </article>
        </div>
      </section>
    </main>
  `,
  styleUrls: ['./guest-start.component.css', './guest-catalog-card.css'],
  styles: [
    `
      .guest-session {
        padding: 28px 0;
        border-bottom: 1px solid var(--osc-line);
      }
      .guest-session h2 {
        color: var(--osc-navy);
        font-size: 26px;
      }
      .guest-session select {
        max-width: 270px;
        margin-right: 12px;
      }
      .guest-actions {
        display: flex;
        flex-wrap: wrap;
        gap: 12px;
        margin-bottom: 12px;
      }
      .guest-actions a {
        text-decoration: none;
      }
      .guest-actions button {
        border: 1px solid var(--osc-navy);
        border-radius: 4px;
        padding: 9px 16px;
        background: white;
        color: var(--osc-navy);
        font-weight: 700;
      }
    `,
  ],
})
export class GuestStartComponent implements OnInit {
  catalogType: 'all' | 'artifacts' | 'workflows' = 'all';
  status?: DemoStatus;
  statusError = '';
  catalogError = '';
  sessionError = '';
  busy = false;
  session: DemoSession | null = null;
  organization: DemoOrganizationSlug = 'neuroscience-gateway';
  artifacts: DemoCatalogArtifact[] = [];
  workflows: DemoCatalogWorkflow[] = [];

  constructor(
    private readonly demo: DemoService,
    private readonly route: ActivatedRoute,
  ) {}

  ngOnInit(): void {
    this.catalogType = this.route.snapshot.data['catalogType'] || 'all';
    this.session = this.demo.session;
    this.demo.getStatus().subscribe({
      next: (status) => (this.status = status),
      error: () => (this.statusError = 'Run status is unavailable.'),
    });
    this.demo.listArtifacts().subscribe({
      next: (items) => (this.artifacts = items),
      error: () => (this.catalogError = 'Artifact catalog is unavailable.'),
    });
    this.demo.listWorkflows().subscribe({
      next: (items) => (this.workflows = items),
      error: () => (this.catalogError = 'Workflow catalog is unavailable.'),
    });
  }

  organizationLabel(slug: DemoOrganizationSlug): string {
    return slug === 'neuroscience-gateway'
      ? 'Neuroscience Gateway'
      : 'Citizen Science';
  }

  startSession(): void {
    if (this.busy || this.status?.state !== 'OPEN') return;
    this.busy = true;
    this.sessionError = '';
    this.demo.createSession(this.organization).subscribe({
      next: (session) => {
        this.session = session;
        this.busy = false;
      },
      error: (error) => {
        this.busy = false;
        this.sessionError =
          error.status === 429
            ? 'This browser has reached its session limit.'
            : 'Could not start a guest session.';
      },
    });
  }

  refreshSession(): void {
    if (this.busy || !this.session) return;
    this.busy = true;
    this.demo.refreshSession().subscribe({
      next: (session) => {
        this.session = session;
        this.busy = false;
      },
      error: (error) => {
        this.busy = false;
        if (error.status === 401) {
          this.demo.clearSession();
          this.session = null;
        }
        this.sessionError = 'Session could not be refreshed.';
      },
    });
  }
}
