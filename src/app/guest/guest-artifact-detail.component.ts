import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { DemoCatalogArtifact } from './demo.models';
import { DemoService } from './demo.service';

@Component({
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <main id="main-content" class="record-page">
      <div class="record-shell">
        <a class="back-link" routerLink="/list-artifacts"
          ><i class="bi bi-arrow-left" aria-hidden="true"></i>Back to
          artifacts</a
        >
        <div *ngIf="isLoading" class="state-panel" role="status">
          Loading artifact record...
        </div>
        <div
          *ngIf="!isLoading && errorMessage"
          class="state-panel state-error"
          role="alert"
        >
          <strong>Artifact unavailable</strong>
          <p>{{ errorMessage }}</p>
          <button type="button" (click)="loadArtifact()">Try again</button>
        </div>
        <ng-container *ngIf="!isLoading && artifact">
          <header class="record-header">
            <div class="record-kicker">
              <span>Scientific artifact</span
              ><span class="record-state" [class.is-confirmed]="confirmed">{{
                artifact.submissionState
              }}</span>
            </div>
            <h1>{{ artifact.title }}</h1>
            <p>{{ artifact.description }}</p>
          </header>
          <section
            class="ledger-confirmation"
            [class.is-pending]="!confirmed"
            aria-labelledby="artifact-ledger-heading"
          >
            <i class="bi bi-shield-check" aria-hidden="true"></i>
            <div class="ledger-summary">
              <p class="section-label">Blockchain provenance</p>
              <h2 id="artifact-ledger-heading">
                {{
                  confirmed
                    ? 'Recorded on the OSC permissioned blockchain'
                    : 'Awaiting blockchain confirmation'
                }}
              </h2>
              <p>
                This record's public metadata is connected to an
                organization-scoped provenance history.
              </p>
            </div>
            <dl class="ledger-facts" *ngIf="confirmed">
              <div>
                <dt>Transaction</dt>
                <dd>{{ artifact.blockchainTxId }}</dd>
              </div>
              <div>
                <dt>Submitted</dt>
                <dd>{{ artifact.submittedAt | date: 'medium' }}</dd>
              </div>
            </dl>
          </section>
          <div class="record-layout">
            <section aria-labelledby="artifact-context-heading">
              <p class="section-label">Research context</p>
              <h2 id="artifact-context-heading">
                Metadata kept with the output
              </h2>
              <dl class="context-list">
                <div *ngIf="artifact.keywords?.length">
                  <dt>Keywords</dt>
                  <dd class="tag-list">
                    <span *ngFor="let keyword of artifact.keywords">{{
                      keyword
                    }}</span>
                  </dd>
                </div>
                <div *ngIf="artifact.fundingAgencies?.length">
                  <dt>Funding</dt>
                  <dd>{{ artifact.fundingAgencies?.join(', ') }}</dd>
                </div>
                <div *ngIf="artifact.dois?.length">
                  <dt>DOI</dt>
                  <dd>{{ artifact.dois?.join(', ') }}</dd>
                </div>
                <div *ngIf="artifact.links?.length">
                  <dt>Related links</dt>
                  <dd>
                    <a
                      *ngFor="let link of artifact.links"
                      [href]="link"
                      target="_blank"
                      rel="noopener noreferrer"
                      >{{ link }}</a
                    >
                  </dd>
                </div>
                <div *ngIf="artifact.submissionComment">
                  <dt>Submission note</dt>
                  <dd>{{ artifact.submissionComment }}</dd>
                </div>
                <div *ngIf="artifact.acknowledgements">
                  <dt>Acknowledgements</dt>
                  <dd>{{ artifact.acknowledgements }}</dd>
                </div>
              </dl>
            </section>
            <aside
              class="record-identity"
              aria-labelledby="artifact-identity-heading"
            >
              <p class="section-label">Record identity</p>
              <h2 id="artifact-identity-heading">Who registered this record</h2>
              <dl>
                <div>
                  <dt>OSC ID</dt>
                  <dd>
                    <code>{{ artifact.id }}</code>
                  </dd>
                </div>
                <div>
                  <dt>Organization</dt>
                  <dd>{{ artifact.organization }}</dd>
                </div>
                <div>
                  <dt>Contributor</dt>
                  <dd>{{ artifact.contributorAlias }}</dd>
                </div>
                <div>
                  <dt>Submitted</dt>
                  <dd>{{ artifact.submittedAt | date: 'medium' }}</dd>
                </div>
              </dl>
            </aside>
          </div>
          <div class="record-actions">
            <a
              class="secondary-action"
              [routerLink]="['/artifacts', artifact.id, 'history']"
              ><i class="bi bi-clock-history" aria-hidden="true"></i>View
              provenance history</a
            ><a
              *ngIf="canEdit"
              class="primary-action"
              [routerLink]="['/update-artifact', artifact.id]"
              ><i class="bi bi-pencil-square" aria-hidden="true"></i>Update
              artifact</a
            >
          </div>
        </ng-container>
      </div>
    </main>
  `,
  styleUrls: ['./guest-artifact-detail.component.css'],
})
export class GuestArtifactDetailComponent implements OnInit {
  artifact?: DemoCatalogArtifact;
  isLoading = true;
  errorMessage = '';
  canEdit = false;
  private id = '';

  constructor(
    private readonly route: ActivatedRoute,
    private readonly demo: DemoService,
  ) {}

  ngOnInit(): void {
    this.id = this.route.snapshot.paramMap.get('id') || '';
    this.loadArtifact();
  }

  get confirmed(): boolean {
    return (
      this.artifact?.submissionState === 'SUCCESS' &&
      !!this.artifact.blockchainTxId
    );
  }

  loadArtifact(): void {
    this.isLoading = true;
    this.errorMessage = '';
    this.demo.getPublicArtifact(this.id).subscribe({
      next: (artifact) => {
        this.artifact = artifact;
        this.isLoading = false;
        this.checkOwnership();
      },
      error: () => {
        this.isLoading = false;
        this.errorMessage = 'This public artifact could not be loaded.';
      },
    });
  }

  private checkOwnership(): void {
    if (!this.demo.session || !this.confirmed) return;
    this.demo.getMyArtifacts().subscribe({
      next: (items) =>
        (this.canEdit = items.some(
          (item) => item.id === this.id && item.submissionState === 'SUCCESS',
        )),
      error: () => (this.canEdit = false),
    });
  }
}
