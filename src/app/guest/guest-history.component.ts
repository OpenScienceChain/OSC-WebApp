import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { Observable, concatMap, last, take, takeWhile, timer } from 'rxjs';
import { DemoHistoryItem } from './demo.models';
import { DemoService } from './demo.service';
import { PublicCatalogService } from './public-catalog.service';
import { printFileHashes } from '../shared/print-file-hashes';
import { safeExternalUrl } from '../shared/safe-external-url';

@Component({
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <main id="main-content" class="record-page history-page">
      <div class="record-shell">
        <div class="history-intro" *ngIf="!selectedTxId">
          <header class="record-header">
            <p class="section-label">
              {{ type === 'artifact' ? 'Artifact' : 'Workflow' }} history
            </p>
            <h1>
              {{
                recordTitle ||
                  (type === 'artifact'
                    ? 'Artifact history'
                    : 'Workflow history')
              }}
            </h1>
            <p *ngIf="recordDescription" class="record-description pre-wrap">
              {{ recordDescription }}
            </p>
            <p class="history-id">
              <span>ID</span><code>{{ id }}</code>
            </p>
          </header>
          <div class="history-actions">
            <button type="button" class="secondary-action" (click)="load()">
              <i class="bi bi-arrow-clockwise" aria-hidden="true"></i>Refresh
              History
            </button>
            <a
              *ngIf="canEdit && type === 'artifact'"
              class="primary-action"
              [routerLink]="['/update-artifact', id]"
              >Update this Artifact</a
            >
            <a class="secondary-action" [routerLink]="['/', plural, id]">
              See
              {{ type === 'artifact' ? "Artifact's" : "Workflow's" }} Detail
            </a>
          </div>
        </div>
        <div *ngIf="isLoading" class="history-message" role="status">
          Loading history...
        </div>
        <div
          *ngIf="!isLoading && errorMessage"
          class="history-message is-error"
          role="alert"
        >
          {{ errorMessage }}
        </div>
        <div
          *ngIf="!isLoading && items.length === 0 && !errorMessage"
          class="history-message"
        >
          No public history found.
        </div>
        <ng-container *ngIf="selectedItem as item">
          <section
            class="artifact-snapshot"
            *ngIf="!isLoading && type === 'artifact'"
          >
            <a class="back-link" [routerLink]="['/', plural, id, 'history']">
              <i class="bi bi-arrow-left" aria-hidden="true"></i>Back to History
            </a>
            <header class="record-header">
              <div class="record-kicker">
                <span>Artifact Snapshot</span>
                <span class="history-tag" [ngClass]="badgeClass(item)">{{
                  badgeLabel(item)
                }}</span>
              </div>
              <h1>{{ item.snapshot?.title || recordTitle }}</h1>
              <h2 class="visually-hidden">Description</h2>
              <p class="record-description pre-wrap">
                {{ item.snapshot?.description || recordDescription }}
              </p>
            </header>
            <section
              class="ledger-confirmation"
              aria-labelledby="snapshot-ledger-heading"
            >
              <i class="bi bi-shield-check" aria-hidden="true"></i>
              <div class="ledger-summary">
                <p class="section-label">Blockchain provenance</p>
                <h2 id="snapshot-ledger-heading">
                  Recorded on the OSC permissioned blockchain
                </h2>
                <p>
                  This revision preserves the recorded metadata and file
                  fingerprint in the artifact's ledger history.
                </p>
              </div>
              <dl class="ledger-facts">
                <div>
                  <dt>Tx ID</dt>
                  <dd>
                    <code>{{ item.txId || item.transactionId }}</code>
                  </dd>
                </div>
                <div>
                  <dt>Timestamp</dt>
                  <dd>{{ item.timestamp | date: 'medium' }}</dd>
                </div>
                <div *ngIf="item.revision">
                  <dt>Revision</dt>
                  <dd>{{ item.revision }}</dd>
                </div>
              </dl>
            </section>
            <div class="record-layout">
              <section
                class="record-context"
                aria-labelledby="snapshot-context-heading"
              >
                <p class="section-label">Artifact metadata</p>
                <h2 id="snapshot-context-heading">
                  Metadata recorded in this revision
                </h2>
                <table class="detail-table">
                  <tbody>
                    <tr *ngIf="item.snapshot?.keywords?.length">
                      <th scope="row">Keywords</th>
                      <td>
                        <span
                          class="keyword-badge"
                          *ngFor="let keyword of item.snapshot?.keywords"
                          >{{ keyword }}</span
                        >
                      </td>
                    </tr>
                    <tr *ngIf="item.snapshot?.fundingAgencies?.length">
                      <th scope="row">Funding Agencies</th>
                      <td>{{ item.snapshot?.fundingAgencies?.join(', ') }}</td>
                    </tr>
                    <tr *ngIf="item.snapshot?.dois?.length">
                      <th scope="row">DOIs</th>
                      <td>{{ item.snapshot?.dois?.join(', ') }}</td>
                    </tr>
                    <tr *ngIf="item.snapshot?.submissionComment">
                      <th scope="row">Comment</th>
                      <td class="pre-wrap">
                        {{ item.snapshot?.submissionComment }}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </section>
              <aside
                class="record-identity"
                aria-labelledby="snapshot-identity-heading"
              >
                <p class="section-label">Record identity</p>
                <h2 id="snapshot-identity-heading">
                  Who registered this record
                </h2>
                <dl class="identity-list">
                  <div *ngIf="recordContributor">
                    <dt>Contributor</dt>
                    <dd class="contributor-detail">
                      <span class="contributor-name">{{
                        recordContributor
                      }}</span>
                    </dd>
                  </div>
                  <div>
                    <dt>ID</dt>
                    <dd>
                      <code>{{ id }}</code>
                    </dd>
                  </div>
                  <div>
                    <dt>Timestamp</dt>
                    <dd>{{ item.timestamp | date: 'medium' }}</dd>
                  </div>
                  <div *ngIf="item.revision">
                    <dt>Revision</dt>
                    <dd>{{ item.revision }}</dd>
                  </div>
                  <div>
                    <dt>State</dt>
                    <dd>
                      <span
                        class="history-tag"
                        [ngClass]="submissionClass(item)"
                        >{{ item.snapshot?.submissionState || 'SUCCESS' }}</span
                      >
                    </dd>
                  </div>
                </dl>
              </aside>
            </div>
            <section
              class="manifest-section"
              aria-labelledby="snapshot-manifest-heading"
            >
              <div class="manifest-heading">
                <h2 id="snapshot-manifest-heading">Manifest</h2>
              </div>
              <ng-container
                *ngIf="
                  item.snapshot?.manifest?.length;
                  else manifestRestrictedArtifact
                "
              >
                <p>
                  {{ item.snapshot?.manifest?.length }}
                  {{ item.snapshot?.manifest?.length === 1 ? 'file' : 'files' }}
                  total. Generated names protect the original local paths.
                </p>
                <div
                  class="table-responsive"
                  tabindex="0"
                  role="region"
                  aria-label="Snapshot file manifest"
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
                      <tr
                        *ngFor="
                          let file of item.snapshot?.manifest | slice: 0 : 10
                        "
                      >
                        <td>{{ file.filename }}</td>
                        <td>
                          <code>{{ file.hash }}</code>
                        </td>
                        <td>{{ file.algorithm }}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                <p *ngIf="(item.snapshot?.manifest?.length ?? 0) > 10">
                  and {{ (item.snapshot?.manifest?.length ?? 0) - 10 }} more
                  files
                </p>
                <div class="footprint" *ngIf="item.snapshot?.footprint">
                  <span>Footprint (SHA-256)</span
                  ><code>{{ item.snapshot?.footprint }}</code>
                </div>
              </ng-container>
              <ng-template #manifestRestrictedArtifact>
                <p>No public manifest was recorded in this snapshot.</p>
              </ng-template>
            </section>
            <div class="record-actions">
              <button
                *ngIf="item.snapshot?.manifest?.length"
                type="button"
                class="secondary-action"
                (click)="printManifest()"
              >
                <i class="bi bi-printer" aria-hidden="true"></i>Print file
                hashes
              </button>
              <a
                class="primary-action"
                [routerLink]="['/', plural, id, 'history']"
                ><i class="bi bi-clock-history" aria-hidden="true"></i>Go back
                to History</a
              >
              <a class="secondary-action" [routerLink]="['/', plural, id]"
                >See Artifact's Detail</a
              >
              <a
                *ngIf="canEdit"
                class="primary-action"
                [routerLink]="['/update-artifact', id]"
                >Update this Artifact</a
              >
            </div>
          </section>
          <section
            class="snapshot-detail"
            *ngIf="!isLoading && workflowSnapshot"
          >
            <div class="snapshot-intro">
              <p class="section-label">Ledger snapshot</p>
              <p>
                <strong
                  >{{
                    type === 'artifact' ? 'Artifact' : 'Workflow'
                  }}
                  ID</strong
                >
                {{ id }}
              </p>
              <p>
                <strong>Tx ID</strong>
                <code class="text-break">{{
                  item.txId || item.transactionId
                }}</code>
                <span class="history-tag" [ngClass]="badgeClass(item)">{{
                  badgeLabel(item)
                }}</span>
              </p>
              <p>
                <strong>Timestamp</strong> {{ item.timestamp | date: 'medium' }}
              </p>
              <div class="snapshot-actions">
                <a
                  class="secondary-action"
                  [routerLink]="['/', plural, id, 'history']"
                  >Go back to History</a
                >
                <a
                  *ngIf="canEdit && type === 'artifact'"
                  class="primary-action"
                  [routerLink]="['/update-artifact', id]"
                  >Update this Artifact</a
                >
                <a
                  *ngIf="canEdit && type === 'workflow'"
                  class="primary-action"
                  [routerLink]="['/update-workflow', id]"
                  >Manage Workflow</a
                >
                <a class="secondary-action" [routerLink]="['/', plural, id]"
                  >See
                  {{ type === 'artifact' ? "Artifact's" : "Workflow's" }}
                  Detail</a
                >
              </div>
            </div>
            <div class="snapshot-record">
              <h1>{{ item.snapshot?.title || recordTitle }}</h1>
              <div class="snapshot-layout">
                <section>
                  <h2>Description</h2>
                  <p class="pre-wrap">
                    {{ item.snapshot?.description || recordDescription }}
                  </p>
                </section>
                <aside>
                  <h2>Details</h2>
                  <dl class="identity-list">
                    <div *ngIf="recordContributor">
                      <dt>Contributor</dt>
                      <dd>{{ recordContributor }}</dd>
                    </div>
                    <div>
                      <dt>ID</dt>
                      <dd>
                        <code>{{ id }}</code>
                      </dd>
                    </div>
                    <div>
                      <dt>Timestamp</dt>
                      <dd>{{ item.timestamp | date: 'medium' }}</dd>
                    </div>
                    <div *ngIf="item.revision">
                      <dt>Revision</dt>
                      <dd>{{ item.revision }}</dd>
                    </div>
                    <div *ngIf="item.snapshot?.keywords?.length">
                      <dt>Keywords</dt>
                      <dd>
                        <span
                          class="snapshot-keyword"
                          *ngFor="let keyword of item.snapshot?.keywords"
                          >{{ keyword }}</span
                        >
                      </dd>
                    </div>
                    <div *ngIf="item.snapshot?.fundingAgencies?.length">
                      <dt>Funding Agencies</dt>
                      <dd>{{ item.snapshot?.fundingAgencies?.join(', ') }}</dd>
                    </div>
                    <div *ngIf="item.snapshot?.dois?.length">
                      <dt>DOIs</dt>
                      <dd>{{ item.snapshot?.dois?.join(', ') }}</dd>
                    </div>
                    <div *ngIf="item.snapshot?.submissionComment">
                      <dt>Comment</dt>
                      <dd class="pre-wrap">
                        {{ item.snapshot?.submissionComment }}
                      </dd>
                    </div>
                    <div>
                      <dt>State</dt>
                      <dd>
                        <span
                          class="history-tag"
                          [ngClass]="submissionClass(item)"
                          >{{
                            item.snapshot?.submissionState || 'SUCCESS'
                          }}</span
                        >
                      </dd>
                    </div>
                  </dl>
                </aside>
              </div>
              <section class="snapshot-manifest" *ngIf="type === 'artifact'">
                <div class="manifest-heading">
                  <h2>Manifest</h2>
                  <button
                    *ngIf="item.snapshot?.manifest?.length"
                    type="button"
                    class="secondary-action"
                    (click)="printManifest()"
                  >
                    Print file hashes
                  </button>
                </div>
                <ng-container
                  *ngIf="
                    item.snapshot?.manifest?.length;
                    else manifestRestricted
                  "
                >
                  <p>
                    {{ item.snapshot?.manifest?.length }}
                    {{
                      item.snapshot?.manifest?.length === 1 ? 'file' : 'files'
                    }}
                    total. Generated names protect the original local paths.
                  </p>
                  <div
                    class="table-responsive"
                    tabindex="0"
                    role="region"
                    aria-label="Snapshot file manifest"
                  >
                    <table class="table">
                      <thead>
                        <tr>
                          <th scope="col">Filename</th>
                          <th scope="col">Hash</th>
                          <th scope="col">Alg.</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr
                          *ngFor="
                            let file of item.snapshot?.manifest | slice: 0 : 10
                          "
                        >
                          <td>{{ file.filename }}</td>
                          <td>
                            <code class="text-break">{{ file.hash }}</code>
                          </td>
                          <td>{{ file.algorithm }}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                  <p *ngIf="(item.snapshot?.manifest?.length ?? 0) > 10">
                    and {{ (item.snapshot?.manifest?.length ?? 0) - 10 }} more
                    files
                  </p>
                  <p>
                    <strong>Footprint (SHA-256)</strong>
                    <code class="text-break">{{
                      item.snapshot?.footprint
                    }}</code>
                  </p>
                </ng-container>
                <ng-template #manifestRestricted
                  ><p>
                    No public manifest was recorded in this snapshot.
                  </p></ng-template
                >
              </section>
            </div>
          </section>
        </ng-container>
        <section
          class="history-list"
          *ngIf="!isLoading && !selectedTxId && visibleItems.length"
          aria-labelledby="events-heading"
        >
          <div class="history-toolbar">
            <div>
              <p class="section-label">Ledger events</p>
              <h2 id="events-heading">Revision history</h2>
            </div>
            <p class="pager-info">
              Showing {{ items.length }} public ledger
              {{ items.length === 1 ? 'event' : 'events' }}
            </p>
          </div>
          <ol class="history-events">
            <li class="history-card" *ngFor="let item of paginatedItems">
              <header class="history-card-header">
                <h3>{{ item.timestamp | date: 'medium' }}</h3>
                <div class="history-card-actions">
                  <span class="history-tag" [ngClass]="badgeClass(item)">{{
                    badgeLabel(item)
                  }}</span>
                  <a
                    *ngIf="
                      type === 'artifact' && (item.txId || item.transactionId)
                    "
                    class="permalink"
                    [routerLink]="[
                      '/',
                      plural,
                      id,
                      'history',
                      item.txId || item.transactionId,
                    ]"
                    [attr.aria-label]="
                      'View snapshot for revision ' +
                      (item.revision || 'unknown')
                    "
                    title="Open snapshot detail"
                    ><i class="bi bi-link-45deg" aria-hidden="true"></i
                  ></a>
                </div>
              </header>
              <div class="history-card-content">
                <section class="history-card-group">
                  <h4>Meta</h4>
                  <dl class="history-facts">
                    <div>
                      <dt>Revision</dt>
                      <dd>{{ item.revision || 'Not supplied' }}</dd>
                    </div>
                    <div *ngIf="item.snapshot?.title">
                      <dt>Title</dt>
                      <dd>{{ item.snapshot?.title }}</dd>
                    </div>
                    <div *ngIf="item.snapshot?.description">
                      <dt>Description</dt>
                      <dd class="pre-wrap">{{ item.snapshot?.description }}</dd>
                    </div>
                  </dl>
                </section>
                <section class="history-card-group">
                  <h4>Ledger event</h4>
                  <dl class="history-facts">
                    <div>
                      <dt>Transaction</dt>
                      <dd>
                        <code>{{
                          item.txId || item.transactionId || 'Not supplied'
                        }}</code>
                      </dd>
                    </div>
                    <div>
                      <dt>Position</dt>
                      <dd>
                        {{ items.indexOf(item) + 1 }} of
                        {{ items.length }} returned
                      </dd>
                    </div>
                  </dl>
                </section>
              </div>
              <section
                class="history-recorded"
                *ngIf="item.snapshot as snapshot"
              >
                <h4>Recorded metadata</h4>
                <p
                  *ngIf="!hasRecordedMetadata(snapshot)"
                  class="metadata-empty"
                >
                  No additional metadata recorded for this event.
                </p>
                <dl class="history-facts">
                  <div *ngIf="snapshot.keywords?.length">
                    <dt>Keywords</dt>
                    <dd>{{ snapshot.keywords?.join(', ') }}</dd>
                  </div>
                  <div *ngIf="snapshot.dois?.length">
                    <dt>DOIs</dt>
                    <dd>{{ snapshot.dois?.join(', ') }}</dd>
                  </div>
                  <div *ngIf="snapshot.fundingAgencies?.length">
                    <dt>Funding</dt>
                    <dd>{{ snapshot.fundingAgencies?.join(', ') }}</dd>
                  </div>
                  <div *ngIf="snapshot.submissionComment">
                    <dt>Revision comment</dt>
                    <dd class="pre-wrap">{{ snapshot.submissionComment }}</dd>
                  </div>
                  <div *ngIf="snapshot.acknowledgements">
                    <dt>Acknowledgements</dt>
                    <dd>{{ snapshot.acknowledgements }}</dd>
                  </div>
                  <div *ngIf="snapshot.links?.length">
                    <dt>Links</dt>
                    <dd>
                      <ng-container *ngFor="let link of snapshot.links">
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
                    </dd>
                  </div>
                </dl>
              </section>
            </li>
          </ol>
          <nav
            *ngIf="historyPageCount > 1"
            class="history-pagination"
            aria-label="History pages"
          >
            <button
              type="button"
              (click)="setHistoryPage(historyPage - 1)"
              [disabled]="historyPage === 1"
            >
              Previous
            </button>
            <span aria-live="polite"
              >Page {{ historyPage }} of {{ historyPageCount }}</span
            >
            <button
              type="button"
              (click)="setHistoryPage(historyPage + 1)"
              [disabled]="historyPage === historyPageCount"
            >
              Next
            </button>
          </nav>
        </section>
      </div>
    </main>
  `,
  styleUrls: [
    './guest-artifact-detail.component.css',
    './guest-history.component.css',
  ],
})
export class GuestHistoryComponent implements OnInit {
  readonly safeExternalUrl = safeExternalUrl;
  type: 'artifact' | 'workflow' = 'artifact';
  id = '';
  selectedTxId = '';
  recordTitle = '';
  recordDescription = '';
  recordContributor = '';
  canEdit = false;
  readonly pageSize = 6;
  historyPage = 1;
  items: DemoHistoryItem[] = [];
  total = 0;
  isLoading = true;
  errorMessage = '';
  constructor(
    private readonly route: ActivatedRoute,
    private readonly demo: DemoService,
    private readonly catalog: PublicCatalogService,
  ) {}
  ngOnInit(): void {
    this.type = this.route.snapshot.data['recordType'];
    this.id = this.route.snapshot.paramMap.get('id') || '';
    this.selectedTxId = this.route.snapshot.paramMap.get('txId') || '';
    this.load();
    const detail: Observable<{
      title: string;
      description: string;
      contributorAlias?: string;
    }> =
      this.type === 'artifact'
        ? this.catalog.artifact(this.id)
        : this.catalog.workflow(this.id);
    detail.subscribe({
      next: (record) => {
        this.recordTitle = record.title;
        this.recordDescription = record.description;
        this.recordContributor = record.contributorAlias || '';
      },
    });
    if (!this.demo.session) return;
    if (this.type === 'artifact') {
      this.demo.getMyArtifacts().subscribe({
        next: (items) => {
          this.canEdit = items.some(
            (item) => item.id === this.id && item.submissionState === 'SUCCESS',
          );
        },
      });
    } else {
      this.demo.getMyWorkflows().subscribe({
        next: (items) => {
          this.canEdit = items.some(
            (item) => item.id === this.id && item.submissionState === 'SUCCESS',
          );
        },
      });
    }
  }
  get plural(): string {
    return `${this.type}s`;
  }
  get workflowSnapshot(): boolean {
    return this.type === 'workflow';
  }
  get visibleItems(): DemoHistoryItem[] {
    return this.selectedTxId
      ? this.items.filter(
          (item) => (item.txId || item.transactionId) === this.selectedTxId,
        )
      : this.items;
  }
  get selectedItem(): DemoHistoryItem | undefined {
    return this.selectedTxId ? this.visibleItems[0] : undefined;
  }
  get historyPageCount(): number {
    return Math.ceil(this.items.length / this.pageSize);
  }
  get paginatedItems(): DemoHistoryItem[] {
    const start = (this.historyPage - 1) * this.pageSize;
    return this.visibleItems.slice(start, start + this.pageSize);
  }
  setHistoryPage(page: number): void {
    if (page < 1 || page > this.historyPageCount) return;
    this.historyPage = page;
  }
  hasRecordedMetadata(
    snapshot: NonNullable<DemoHistoryItem['snapshot']>,
  ): boolean {
    return !!(
      snapshot.keywords?.length ||
      snapshot.dois?.length ||
      snapshot.fundingAgencies?.length ||
      snapshot.submissionComment ||
      snapshot.acknowledgements ||
      snapshot.links?.length
    );
  }
  load(): void {
    this.isLoading = true;
    this.errorMessage = '';
    const request = timer(0, 1000).pipe(
      take(this.selectedTxId ? 5 : 1),
      concatMap(() => this.catalog.history(this.type, this.id)),
      takeWhile(
        (history) =>
          !!this.selectedTxId &&
          !(history.items || history.history || []).some(
            (item) => (item.txId || item.transactionId) === this.selectedTxId,
          ),
        true,
      ),
      last(),
    );
    request.subscribe({
      next: (history) => {
        this.items = history.items || history.history || [];
        this.total = history.count ?? history.total ?? this.items.length;
        this.historyPage = 1;
        if (this.selectedTxId && !this.visibleItems.length)
          this.errorMessage = 'Snapshot not found in public history.';
        this.isLoading = false;
      },
      error: () => {
        this.errorMessage = 'Public history is temporarily unavailable.';
        this.isLoading = false;
      },
    });
  }
  private latestRevision(): number {
    return Math.max(0, ...this.items.map((item) => item.revision || 0));
  }
  badgeLabel(item: DemoHistoryItem): string {
    if (item.isDelete) return 'Deleted';
    if (item.revision && item.revision === this.latestRevision())
      return 'Current State';
    if (item.revision === 1) return 'Initial State';
    return item.revision ? 'Snapshot' : 'Recorded';
  }
  badgeClass(item: DemoHistoryItem): string {
    if (item.isDelete) return 'tag-delete';
    if (item.revision && item.revision === this.latestRevision())
      return 'tag-current';
    if (item.revision === 1) return 'tag-initial';
    return 'tag-update';
  }
  submissionClass(item: DemoHistoryItem): string {
    if (item.snapshot?.submissionState === 'FAILED') return 'tag-delete';
    if (item.snapshot?.submissionState === 'PENDING') return 'tag-pending';
    return 'tag-current';
  }
  printManifest(): void {
    printFileHashes(this.selectedItem?.snapshot?.manifest ?? []);
  }
}
