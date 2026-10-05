import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { DemoCatalogArtifact } from './demo.models';
import { DemoService } from './demo.service';
import { PublicCatalogService } from './public-catalog.service';
import { printFileHashes } from '../shared/print-file-hashes';
import { safeExternalUrl } from '../shared/safe-external-url';

@Component({
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <main id="main-content" class="record-page">
      <div class="record-shell">
        <a class="back-link" routerLink="/list-artifacts">
          <i class="bi bi-arrow-left" aria-hidden="true"></i>Back to Artifacts
        </a>
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
              <span>Scientific Artifact</span>
              <span
                class="record-state"
                [class.is-confirmed]="confirmed"
                [class.is-failed]="artifact.submissionState === 'FAILED'"
                [class.is-pending]="artifact.submissionState === 'PENDING'"
                >{{ artifact.submissionState }}</span
              >
            </div>
            <h1>{{ artifact.title }}</h1>
            <h2 class="visually-hidden">Description</h2>
            <p class="record-description pre-wrap">
              {{ artifact.description }}
            </p>
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
          <section
            class="ledger-confirmation"
            [class.is-pending]="artifact.submissionState === 'PENDING'"
            [class.is-failed]="artifact.submissionState === 'FAILED'"
            aria-labelledby="ledger-heading"
          >
            <i
              class="bi"
              [class.bi-shield-check]="confirmed"
              [class.bi-hourglass-split]="
                artifact.submissionState === 'PENDING'
              "
              [class.bi-exclamation-triangle]="
                artifact.submissionState === 'FAILED'
              "
              aria-hidden="true"
            ></i>
            <div class="ledger-summary">
              <p class="section-label">Blockchain provenance</p>
              <h2 id="ledger-heading">
                {{
                  confirmed
                    ? 'Recorded on the OSC permissioned blockchain'
                    : artifact.submissionState === 'FAILED'
                      ? 'No ledger confirmation was recorded'
                      : 'Ledger confirmation in progress'
                }}
              </h2>
              <p *ngIf="confirmed">
                The transaction connects this metadata, file fingerprint,
                contributor, organization, and revision to a tamper-evident
                history.
              </p>
            </div>
            <dl class="ledger-facts">
              <div>
                <dt>State</dt>
                <dd>{{ artifact.submissionState }}</dd>
              </div>
              <div *ngIf="confirmed">
                <dt>Blockchain TX</dt>
                <dd>
                  <code>{{ artifact.blockchainTxId }}</code>
                </dd>
              </div>
              <div *ngIf="confirmed">
                <dt>Committing peer</dt>
                <dd>{{ artifact.peerId || 'Not recorded' }}</dd>
              </div>
              <div *ngIf="!confirmed">
                <dt>Provenance</dt>
                <dd>
                  {{
                    artifact.submissionState === 'FAILED'
                      ? 'Not confirmed on the blockchain'
                      : 'Awaiting blockchain confirmation'
                  }}
                </dd>
              </div>
            </dl>
          </section>
          <div class="record-layout">
            <section class="record-context" aria-labelledby="context-heading">
              <p class="section-label">Artifact metadata</p>
              <h2 id="context-heading">Metadata kept with the output</h2>
              <table class="detail-table">
                <tbody>
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
                      <ng-container *ngFor="let link of artifact.links">
                        <a
                          *ngIf="safeExternalUrl(link) as href; else plainLink"
                          [href]="href"
                          target="_blank"
                          rel="noopener noreferrer"
                          >{{ link }}</a
                        >
                        <ng-template #plainLink
                          ><span>{{ link }}</span></ng-template
                        >
                      </ng-container>
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
                  <tr *ngIf="artifact.acknowledgements">
                    <th scope="row">Acknowledgements</th>
                    <td>{{ artifact.acknowledgements }}</td>
                  </tr>
                </tbody>
              </table>
            </section>
            <aside
              class="record-identity"
              aria-labelledby="artifact-details-heading"
            >
              <p class="section-label">Record identity</p>
              <h2 id="artifact-details-heading">Who registered this record</h2>
              <dl class="identity-list">
                <div>
                  <dt>Contributor</dt>
                  <dd class="contributor-detail">
                    <span class="contributor-name">{{
                      artifact.contributorAlias
                    }}</span>
                    <span class="contributor-organization">{{
                      artifact.organization
                    }}</span>
                  </dd>
                </div>
                <div>
                  <dt>ID</dt>
                  <dd>
                    <code>{{ artifact.id }}</code>
                    <button
                      type="button"
                      class="copy-id"
                      [class.is-copied]="copied"
                      (click)="copyId()"
                      [title]="
                        copied ? 'Artifact ID copied' : 'Copy artifact ID'
                      "
                      [attr.aria-label]="
                        copied ? 'Artifact ID copied' : 'Copy artifact ID'
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
                  <dd>{{ artifact.organization }}</dd>
                </div>
                <div>
                  <dt>Submitted</dt>
                  <dd>{{ artifact.submittedAt | date: 'medium' }}</dd>
                </div>
                <div *ngIf="artifact.lastUpdatedAt">
                  <dt>Last Updated</dt>
                  <dd>{{ artifact.lastUpdatedAt | date: 'medium' }}</dd>
                </div>
              </dl>
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
            >
            <a
              class="primary-action"
              [routerLink]="['/update-artifact', artifact.id]"
              ><i class="bi bi-pencil-square" aria-hidden="true"></i>Manage
              Artifact</a
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
                ? 'Artifact management is available after ledger confirmation.'
                : ownershipCheckFailed
                  ? 'Artifact management could not be verified right now.'
                  : 'Only the contributing account can manage this artifact.'
            }}
          </p>
        </ng-container>
      </div>
    </main>
  `,
  styleUrls: ['./guest-artifact-detail.component.css'],
})
export class GuestArtifactDetailComponent implements OnInit {
  readonly safeExternalUrl = safeExternalUrl;
  artifact?: DemoCatalogArtifact;
  isLoading = true;
  errorMessage = '';
  canEdit = false;
  ownershipChecked = false;
  ownershipCheckFailed = false;
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
    this.ownershipChecked = false;
    this.ownershipCheckFailed = false;
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
    if (!this.demo.session?.accountUsername || !this.confirmed) return;
    this.demo.getMyArtifacts().subscribe({
      next: (items) => {
        this.canEdit = items.some(
          (item) => item.id === this.id && item.submissionState === 'SUCCESS',
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

  async copyId(): Promise<void> {
    try {
      await navigator.clipboard.writeText(this.id);
      this.copied = true;
      this.copyMessage = 'Artifact ID copied to clipboard.';
      clearTimeout(this.copyReset);
      this.copyReset = setTimeout(() => {
        this.copied = false;
        this.copyMessage = '';
      }, 4000);
    } catch {
      this.copied = false;
      this.copyMessage = 'Could not copy artifact ID.';
    }
  }
  printManifest(): void {
    printFileHashes(this.artifact?.manifest ?? []);
  }
}
