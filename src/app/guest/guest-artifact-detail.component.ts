import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { DemoCatalogArtifact } from './demo.models';
import { DemoService } from './demo.service';
import { PublicCatalogService } from './public-catalog.service';
import { printFileHashes } from '../shared/print-file-hashes';

@Component({
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <main id="main-content" class="record-page">
      <div class="record-shell">
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
              <span>Scientific Artifact</span
              ><span
                *ngIf="!confirmed"
                class="record-state"
                [class.is-failed]="artifact.submissionState === 'FAILED'"
                [class.is-pending]="artifact.submissionState === 'PENDING'"
                >{{ artifact.submissionState }}</span
              >
            </div>
            <h1>{{ artifact.title }}</h1>
          </header>
          <div
            *ngIf="artifact.submissionState === 'FAILED'"
            class="submission-notice is-failed"
            role="status"
          >
            <strong>Blockchain submission failed</strong>
            <p>
              {{
                artifact.failureReason ||
                  'Blockchain submission failed. No ledger confirmation was recorded.'
              }}
            </p>
          </div>
          <div
            *ngIf="artifact.submissionState === 'PENDING'"
            class="submission-notice is-pending"
            role="status"
          >
            <strong>Blockchain confirmation pending</strong>
            <p>This submission is still awaiting a ledger transaction.</p>
          </div>
          <div class="record-layout artifact-body">
            <section
              class="description-col"
              aria-labelledby="artifact-description-heading"
            >
              <h2 id="artifact-description-heading">Description</h2>
              <p class="pre-wrap">{{ artifact.description }}</p>
            </section>
            <aside
              class="record-identity details-col"
              aria-labelledby="artifact-details-heading"
            >
              <h2 id="artifact-details-heading">Details</h2>
              <table class="table table-borderless detail-table">
                <tbody>
                  <tr>
                    <th scope="row">ID</th>
                    <td>
                      <code>{{ artifact.id }}</code>
                      <button
                        type="button"
                        class="copy-id"
                        (click)="copyId()"
                        [title]="
                          copied ? 'Artifact ID copied' : 'Copy artifact ID'
                        "
                        [attr.aria-label]="
                          copied ? 'Artifact ID copied' : 'Copy artifact ID'
                        "
                      >
                        <i
                          [class]="
                            copied ? 'bi bi-check-lg' : 'bi bi-clipboard'
                          "
                          [class.copied]="copied"
                          aria-hidden="true"
                        ></i>
                      </button>
                      <span
                        class="visually-hidden"
                        role="status"
                        aria-live="polite"
                        >{{ copyMessage }}</span
                      >
                    </td>
                  </tr>
                  <tr>
                    <th scope="row">Organization</th>
                    <td>{{ artifact.organization }}</td>
                  </tr>
                  <tr>
                    <th scope="row">Submitted</th>
                    <td>{{ artifact.submittedAt | date: 'medium' }}</td>
                  </tr>
                  <tr *ngIf="artifact.lastUpdatedAt">
                    <th scope="row">Last Updated</th>
                    <td>{{ artifact.lastUpdatedAt | date: 'medium' }}</td>
                  </tr>
                  <tr>
                    <th scope="row">Contributor</th>
                    <td>{{ artifact.contributorAlias }}</td>
                  </tr>
                  <tr *ngIf="artifact.keywords?.length">
                    <th scope="row">Keywords</th>
                    <td>
                      <span
                        class="keyword-badge"
                        *ngFor="let keyword of artifact.keywords"
                        >{{ keyword }}</span
                      >
                    </td>
                  </tr>
                  <tr *ngIf="artifact.links?.length">
                    <th scope="row">Links</th>
                    <td>
                      <a
                        *ngFor="let link of artifact.links"
                        [href]="link"
                        target="_blank"
                        rel="noopener noreferrer"
                        >{{ link }}</a
                      >
                    </td>
                  </tr>
                  <tr>
                    <th scope="row">Funding Agencies</th>
                    <td>
                      {{
                        artifact.fundingAgencies?.join(', ') || 'Not recorded'
                      }}
                    </td>
                  </tr>
                  <tr>
                    <th scope="row">DOIs</th>
                    <td>{{ artifact.dois?.join(', ') || 'Not recorded' }}</td>
                  </tr>
                  <tr *ngIf="artifact.submissionComment">
                    <th scope="row">Comment</th>
                    <td class="pre-wrap">{{ artifact.submissionComment }}</td>
                  </tr>
                  <tr>
                    <th scope="row">State</th>
                    <td>
                      <span
                        class="record-state"
                        [class.is-confirmed]="confirmed"
                        [class.is-failed]="
                          artifact.submissionState === 'FAILED'
                        "
                        [class.is-pending]="
                          artifact.submissionState === 'PENDING'
                        "
                        >{{ artifact.submissionState }}</span
                      >
                    </td>
                  </tr>
                  <tr *ngIf="confirmed">
                    <th scope="row">Blockchain TX</th>
                    <td>
                      <code>{{ artifact.blockchainTxId }}</code>
                    </td>
                  </tr>
                  <tr *ngIf="!confirmed">
                    <th scope="row">Provenance</th>
                    <td>
                      {{
                        artifact.submissionState === 'FAILED'
                          ? 'Not confirmed on the blockchain'
                          : 'Awaiting blockchain confirmation'
                      }}
                    </td>
                  </tr>
                  <tr *ngIf="artifact.acknowledgements">
                    <th scope="row">Acknowledgements</th>
                    <td>{{ artifact.acknowledgements }}</td>
                  </tr>
                </tbody>
              </table>
            </aside>
          </div>
          <section class="manifest-section" aria-labelledby="manifest-heading">
            <div class="manifest-heading">
              <h2 id="manifest-heading">Manifest</h2>
            </div>
            <ng-container
              *ngIf="artifact.manifest?.length; else unavailableManifest"
            >
              <p>
                {{ artifact.manifest?.length }}
                {{ artifact.manifest?.length === 1 ? 'file' : 'files' }} total.
                Generated names protect the original local paths.
              </p>
              <div
                class="table-responsive"
                tabindex="0"
                role="region"
                aria-label="Artifact file manifest"
              >
                <table>
                  <thead>
                    <tr>
                      <th scope="col">Filename</th>
                      <th scope="col">Hash</th>
                      <th scope="col">Alg.</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr *ngFor="let file of artifact.manifest | slice: 0 : 10">
                      <td>{{ file.filename }}</td>
                      <td>
                        <code>{{ file.hash }}</code>
                      </td>
                      <td>{{ file.algorithm }}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <p *ngIf="(artifact.manifest?.length ?? 0) > 10">
                and {{ (artifact.manifest?.length ?? 0) - 10 }} more files
              </p>
              <div class="footprint" *ngIf="artifact.footprint">
                <span>Footprint (SHA-256)</span
                ><code>{{ artifact.footprint }}</code>
              </div>
            </ng-container>
            <ng-template #unavailableManifest
              ><p class="manifest-empty">
                No confirmed public manifest is available for this artifact.
              </p></ng-template
            >
          </section>
          <div class="record-actions">
            <button
              *ngIf="artifact.manifest?.length"
              type="button"
              class="secondary-action"
              (click)="printManifest()"
            >
              <i class="bi bi-printer" aria-hidden="true"></i>Print file hashes
            </button>
            <a
              class="primary-action"
              [routerLink]="['/artifacts', artifact.id, 'history']"
              ><i class="bi bi-clock-history" aria-hidden="true"></i>History</a
            ><a
              *ngIf="canEdit"
              class="primary-action"
              [routerLink]="['/update-artifact', artifact.id]"
              ><i class="bi bi-pencil-square" aria-hidden="true"></i>Update
              Artifact</a
            >
            <a
              *ngIf="!canEdit && !demo.session"
              class="secondary-action"
              routerLink="/auth/sign-in"
              >Sign in to update</a
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
  copied = false;
  copyMessage = '';
  private copyReset?: ReturnType<typeof setTimeout>;
  private id = '';

  constructor(
    private readonly route: ActivatedRoute,
    public readonly demo: DemoService,
    private readonly catalog: PublicCatalogService,
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
    this.canEdit = false;
    this.catalog.artifact(this.id).subscribe({
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
      next: (items) => {
        this.canEdit = items.some(
          (item) => item.id === this.id && item.submissionState === 'SUCCESS',
        );
      },
      error: () => (this.canEdit = false),
    });
  }

  async copyId(): Promise<void> {
    try {
      await navigator.clipboard.writeText(this.id);
      this.copied = true;
      this.copyMessage = 'Artifact ID copied to clipboard.';
      clearTimeout(this.copyReset);
      this.copyReset = setTimeout(() => {
        this.copied = false;
        this.copyMessage = '';
      }, 2500);
    } catch {
      this.copied = false;
      this.copyMessage = 'Could not copy artifact ID.';
    }
  }
  printManifest(): void {
    printFileHashes(this.artifact?.manifest ?? []);
  }
}
