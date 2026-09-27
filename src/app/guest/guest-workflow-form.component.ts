import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { DemoArtifact, DemoResearchContext, DemoStatus } from './demo.models';
import { DemoService } from './demo.service';
import { GuestSessionPanelComponent } from './guest-session-panel.component';

@Component({
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    GuestSessionPanelComponent,
  ],
  template: `
    <main id="main-content" class="create-workflow-container">
      <header class="header">
        <h1>Contribute Workflow</h1>
        <div class="header-divider"></div>
      </header>
      <app-guest-session-panel
        *ngIf="!demo.session"
        (started)="loadArtifacts()"
      ></app-guest-session-panel>
      <p *ngIf="demo.session" class="guest-form-note">
        Link confirmed artifacts from your {{ demo.session.organization }} guest
        session.
      </p>
      <p *ngIf="error" class="guest-form-note text-danger" role="alert">
        {{ error }}
      </p>
      <form class="workflow-form" (ngSubmit)="submit()">
        <div class="form-grid">
          <div class="left-column">
            <div class="form-group">
              <label for="workflow-context" class="field-label"
                >Research context</label
              ><select
                id="workflow-context"
                name="context"
                class="form-control"
                [(ngModel)]="context"
                (ngModelChange)="requestId = ''"
              >
                <option value="REPRODUCIBLE_ANALYSIS">
                  Reproducible analysis
                </option>
                <option value="RESEARCH_DATASET">Research dataset</option>
                <option value="SOFTWARE_RELEASE">Software release</option>
              </select>
            </div>
            <p>
              The guest workflow title and description are generated from the
              selected records by the service.
            </p>
          </div>
          <div class="right-column">
            <div class="form-group">
              <div class="field-label" id="linked-artifacts-label">
                Linked Artifacts
              </div>
              <p id="artifact-help">
                Select 1–3 confirmed artifacts created in this session.
              </p>
              <div
                class="selected-artifacts mt-2"
                role="group"
                aria-labelledby="linked-artifacts-label"
                aria-describedby="artifact-help"
              >
                <label class="artifact-chip" *ngFor="let artifact of artifacts"
                  ><input
                    type="checkbox"
                    [checked]="selectedIds.has(artifact.id)"
                    (change)="toggle(artifact.id, $any($event.target).checked)"
                    [disabled]="
                      !selectedIds.has(artifact.id) && selectedIds.size >= 3
                    "
                  />
                  {{ artifact.title }}</label
                >
              </div>
              <p *ngIf="!artifacts.length">
                No confirmed owned artifacts are available yet.
              </p>
            </div>
          </div>
        </div>
        <div class="form-navigation">
          <a class="btn btn-secondary" routerLink="/list-workflows"
            >Cancel and Go Back</a
          ><button
            class="btn btn-primary"
            type="submit"
            [disabled]="!canSubmit"
          >
            {{ busy ? 'Submitting...' : 'Submit workflow' }}
          </button>
        </div>
      </form>
    </main>
  `,
  styleUrls: ['./guest-workflow-form.component.css'],
  styles: [
    `
      .guest-form-note {
        width: min(80%, 1050px);
        margin: 0 auto 1rem;
      }
      .artifact-chip {
        display: flex;
        align-items: center;
        gap: 0.6rem;
        padding: 0.6rem;
        border: 1px solid #b7c7cf;
        border-radius: 6px;
        margin: 0.4rem 0;
      }
      .artifact-chip input {
        width: 1.2rem;
        height: 1.2rem;
      }
    `,
  ],
})
export class GuestWorkflowFormComponent implements OnInit {
  status?: DemoStatus;
  artifacts: DemoArtifact[] = [];
  selectedIds = new Set<string>();
  context: DemoResearchContext = 'REPRODUCIBLE_ANALYSIS';
  requestId = '';
  error = '';
  busy = false;
  constructor(
    public readonly demo: DemoService,
    private readonly router: Router,
  ) {}
  ngOnInit(): void {
    this.demo.getStatus().subscribe({
      next: (status) => (this.status = status),
      error: () => (this.error = 'Run status is unavailable.'),
    });
    if (this.demo.session) this.loadArtifacts();
  }
  loadArtifacts(): void {
    this.demo.getMyArtifacts().subscribe({
      next: (items) =>
        (this.artifacts = items.filter(
          (item) => item.submissionState === 'SUCCESS',
        )),
      error: () => (this.error = 'Owned artifacts are unavailable.'),
    });
  }
  get canSubmit(): boolean {
    return (
      !!this.demo.session &&
      this.status?.state === 'OPEN' &&
      this.selectedIds.size >= 1 &&
      this.selectedIds.size <= 3 &&
      !this.busy
    );
  }
  toggle(id: string, checked: boolean): void {
    this.requestId = '';
    if (checked && this.selectedIds.size < 3) this.selectedIds.add(id);
    else if (!checked) this.selectedIds.delete(id);
  }
  submit(): void {
    if (!this.canSubmit) {
      this.error = 'Start a session and select 1–3 confirmed artifacts.';
      return;
    }
    this.busy = true;
    this.error = '';
    this.demo
      .createWorkflow({
        requestId: (this.requestId ||= crypto.randomUUID()),
        artifactIds: [...this.selectedIds],
        researchContext: this.context,
      })
      .subscribe({
        next: (workflow) => {
          this.busy = false;
          this.requestId = '';
          this.router.navigate(['/workflows', workflow.id]);
        },
        error: (error) => {
          this.busy = false;
          if (error.status === 401) {
            this.demo.clearSession();
            this.error = 'Guest session expired. Start a new session.';
          } else if (error.status === 409)
            this.error =
              'This request conflicted. Check the selected artifacts before retrying.';
          else if (error.status === 429)
            this.error = 'Workflow contribution limit reached.';
          else
            this.error =
              'Workflow submission failed. Retry keeps the same request ID.';
        },
      });
  }
}
