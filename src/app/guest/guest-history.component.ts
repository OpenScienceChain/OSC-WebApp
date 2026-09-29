import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { Observable } from 'rxjs';
import { DemoHistoryItem } from './demo.models';
import { DemoService } from './demo.service';
import { printFileHashes } from '../shared/print-file-hashes';

@Component({
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <main id="main-content" class="container py-4">
      <h1 class="page-headline mb-3" *ngIf="!selectedTxId">
        {{ type === 'artifact' ? "Dive into your Artifact's Full History" : "Dive into your Workflow's Full History" }}
        <i class="bi bi-journal-text" aria-hidden="true"></i>
      </h1>
      <div class="mb-3 content-block" *ngIf="!selectedTxId">
        <p *ngIf="recordTitle" class="mb-1">
          <strong>Title:</strong> {{ recordTitle }}
        </p>
        <p *ngIf="recordDescription" class="mb-1">
          <strong>Description:</strong> {{ recordDescription }}
        </p>
        <p class="mb-1"><strong>ID:</strong> {{ id }}</p>
        <div class="mt-2 d-flex gap-2 flex-wrap">
          <button
            class="btn btn-outline-primary"
            type="button"
            (click)="load()"
          >
            Refresh History</button
          ><a
            *ngIf="canEdit && !selectedTxId && type === 'artifact'"
            class="btn btn-primary"
            [routerLink]="['/update-artifact', id]"
            >Update this Artifact</a
          ><a class="btn btn-outline-primary" [routerLink]="['/', plural, id]"
            >See
            {{ type === 'artifact' ? "Artifact's" : "Workflow's" }} Detail</a
          >
        </div>
      </div>
      <div *ngIf="isLoading" role="status">Loading history...</div>
      <div *ngIf="!isLoading && errorMessage" class="text-danger" role="alert">
        {{ errorMessage }}
      </div>
      <div
        *ngIf="!isLoading && items.length === 0 && !errorMessage"
        class="text-muted"
      >
        No public history found.
      </div>
      <ng-container *ngIf="selectedItem as item">
        <section class="snapshot-detail" *ngIf="!isLoading">
          <div class="snapshot-intro content-block">
            <p><strong>Artifact ID:</strong> {{ id }}</p>
            <p><strong>Tx ID:</strong> <code class="text-break">{{ item.txId || item.transactionId }}</code> <span class="badge" [ngClass]="badgeClass(item)">{{ badgeLabel(item) }}</span></p>
            <p><strong>Timestamp:</strong> {{ item.timestamp | date: 'medium' }}</p>
            <div class="snapshot-actions">
              <a class="btn btn-outline-primary" [routerLink]="['/', plural, id, 'history']">Go back to History</a>
              <a *ngIf="canEdit" class="btn btn-primary" [routerLink]="['/update-artifact', id]">Update this Artifact</a>
              <button *ngIf="!canEdit && type === 'artifact'" type="button" class="btn btn-primary" disabled title="Only the contributing session can update this artifact">Update this Artifact</button>
              <a class="btn btn-outline-primary" [routerLink]="['/', plural, id]">See Artifact's Detail</a>
            </div>
          </div>
          <div class="snapshot-record">
            <h1>{{ item.snapshot?.title || recordTitle }}</h1>
            <div class="snapshot-layout">
              <section>
                <h2>Description</h2>
                <p class="pre-wrap">{{ item.snapshot?.description || recordDescription }}</p>
              </section>
              <aside>
                <h2>Details</h2>
                <table class="table table-borderless snapshot-table"><tbody>
                  <tr><th scope="row">ID</th><td>{{ id }}</td></tr>
                  <tr><th scope="row">Timestamp</th><td>{{ item.timestamp | date: 'medium' }}</td></tr>
                  <tr *ngIf="item.revision"><th scope="row">Revision</th><td>{{ item.revision }}</td></tr>
                  <tr *ngIf="recordContributor"><th scope="row">Contributor</th><td>{{ recordContributor }}</td></tr>
                  <tr *ngIf="item.snapshot?.keywords?.length"><th scope="row">Keywords</th><td><span class="snapshot-keyword" *ngFor="let keyword of item.snapshot?.keywords">{{ keyword }}</span></td></tr>
                  <tr *ngIf="item.snapshot?.fundingAgencies?.length"><th scope="row">Funding Agencies</th><td>{{ item.snapshot?.fundingAgencies?.join(', ') }}</td></tr>
                  <tr *ngIf="item.snapshot?.dois?.length"><th scope="row">DOIs</th><td>{{ item.snapshot?.dois?.join(', ') }}</td></tr>
                  <tr *ngIf="item.snapshot?.submissionComment"><th scope="row">Comment</th><td class="pre-wrap">{{ item.snapshot?.submissionComment }}</td></tr>
                  <tr><th scope="row">State</th><td><span class="badge" [ngClass]="submissionClass(item)">{{ item.snapshot?.submissionState || 'SUCCESS' }}</span></td></tr>
                </tbody></table>
              </aside>
            </div>
            <section class="snapshot-manifest" *ngIf="type === 'artifact'">
              <div class="manifest-heading"><h2>Manifest</h2><button *ngIf="item.snapshot?.manifest?.length" type="button" class="btn btn-outline-primary" (click)="printManifest()">Print file hashes</button></div>
              <ng-container *ngIf="item.snapshot?.manifest?.length; else manifestRestricted">
                <p>{{ item.snapshot?.manifest?.length }} {{ item.snapshot?.manifest?.length === 1 ? 'file' : 'files' }} total. Generated names protect the original local paths.</p>
                <div class="table-responsive"><table class="table"><thead><tr><th>Filename</th><th>Hash</th><th>Alg.</th></tr></thead><tbody><tr *ngFor="let file of item.snapshot?.manifest"><td>{{ file.filename }}</td><td><code class="text-break">{{ file.hash }}</code></td><td>{{ file.algorithm }}</td></tr></tbody></table></div>
                <p><strong>Footprint (SHA-256)</strong> <code class="text-break">{{ item.snapshot?.footprint }}</code></p>
              </ng-container>
              <ng-template #manifestRestricted><p>No public manifest was recorded in this snapshot.</p></ng-template>
            </section>
          </div>
        </section>
      </ng-container>
      <div class="history-list" *ngIf="!isLoading && !selectedTxId && visibleItems.length">
        <div
          class="history-toolbar d-flex justify-content-between align-items-center mb-2"
        >
          <div class="pager-info">
            {{
              selectedTxId
                ? 'Selected ledger event'
                : 'Showing ' + items.length + ' public ledger events'
            }}
          </div>
        </div>
        <div
          class="history-card card shadow-sm mb-3"
          *ngFor="let item of visibleItems"
        >
          <div
            class="card-header d-flex justify-content-between align-items-center"
          >
            <div>
              <strong>{{ item.timestamp | date: 'medium' }}</strong>
            </div>
            <div class="history-card-actions">
              <span class="badge" [ngClass]="badgeClass(item)">{{
                badgeLabel(item)
              }}</span>
              <a
                *ngIf="
                  type === 'artifact' &&
                  !selectedTxId &&
                  (item.txId || item.transactionId)
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
                  'View snapshot for revision ' + (item.revision || 'unknown')
                "
                title="Open snapshot detail"
                ><i class="bi bi-link-45deg" aria-hidden="true"></i
              ></a>
            </div>
          </div>
          <div class="card-body">
            <div class="row g-3">
              <div class="col-md-6">
                <h2 class="section-title h6">Meta</h2>
                <p class="mb-1">
                  <strong>Revision:</strong>
                  {{ item.revision || 'Not supplied' }}
                </p>
                <p *ngIf="item.snapshot?.title" class="mb-1">
                  <strong>Title:</strong> {{ item.snapshot?.title }}
                </p>
                <p *ngIf="item.snapshot?.description" class="mb-1">
                  <strong>Description:</strong> {{ item.snapshot?.description }}
                </p>
              </div>
              <div class="col-md-6">
                <h2 class="section-title h6">Ledger event</h2>
                <p class="mb-1">
                  <strong>Transaction:</strong>
                  <code class="text-break">{{
                    item.txId || item.transactionId || 'Not supplied'
                  }}</code>
                </p>
                <p class="mb-1">
                  <strong>Position:</strong> {{ items.indexOf(item) + 1 }} of
                  {{ items.length }} returned
                </p>
              </div>
              <div class="col-12" *ngIf="item.snapshot as snapshot">
                <h2 class="section-title h6">Recorded metadata</h2>
                <p *ngIf="snapshot.keywords?.length">
                  <strong>Keywords:</strong> {{ snapshot.keywords?.join(', ') }}
                </p>
                <p *ngIf="snapshot.dois?.length">
                  <strong>DOIs:</strong> {{ snapshot.dois?.join(', ') }}
                </p>
                <p *ngIf="snapshot.fundingAgencies?.length">
                  <strong>Funding:</strong>
                  {{ snapshot.fundingAgencies?.join(', ') }}
                </p>
                <p *ngIf="snapshot.submissionComment">
                  <strong>Revision comment:</strong>
                  {{ snapshot.submissionComment }}
                </p>
                <p *ngIf="snapshot.acknowledgements">
                  <strong>Acknowledgements:</strong>
                  {{ snapshot.acknowledgements }}
                </p>
                <ul *ngIf="snapshot.links?.length">
                  <li *ngFor="let link of snapshot.links">
                    <a
                      [href]="link"
                      target="_blank"
                      rel="noopener noreferrer"
                      >{{ link }}</a
                    >
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  `,
  styleUrls: ['./guest-history.component.css'],
})
export class GuestHistoryComponent implements OnInit {
  type: 'artifact' | 'workflow' = 'artifact';
  id = '';
  selectedTxId = '';
  recordTitle = '';
  recordDescription = '';
  recordContributor = '';
  canEdit = false;
  items: DemoHistoryItem[] = [];
  total = 0;
  isLoading = true;
  errorMessage = '';
  constructor(
    private readonly route: ActivatedRoute,
    private readonly demo: DemoService,
  ) {}
  ngOnInit(): void {
    this.type = this.route.snapshot.data['recordType'];
    this.id = this.route.snapshot.paramMap.get('id') || '';
    this.selectedTxId = this.route.snapshot.paramMap.get('txId') || '';
    this.load();
    const detail: Observable<{ title: string; description: string; contributorAlias?: string }> =
      this.type === 'artifact'
        ? this.demo.getPublicArtifact(this.id)
        : this.demo.getPublicWorkflow(this.id);
    detail.subscribe({
      next: (record) => {
        this.recordTitle = record.title;
        this.recordDescription = record.description;
        this.recordContributor = record.contributorAlias || '';
      },
    });
    if (this.type === 'artifact' && this.demo.session) {
      this.demo.getMyArtifacts().subscribe({
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
  load(): void {
    this.isLoading = true;
    this.errorMessage = '';
    const request =
      this.type === 'artifact'
        ? this.demo.getPublicArtifactHistory(this.id)
        : this.demo.getPublicWorkflowHistory(this.id);
    request.subscribe({
      next: (history) => {
        this.items = history.items || history.history || [];
        this.total = history.count ?? history.total ?? this.items.length;
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
    if (item.snapshot?.submissionState === 'FAILED') return 'bg-danger';
    if (item.snapshot?.submissionState === 'PENDING') return 'bg-warning text-dark';
    return 'bg-success';
  }
  printManifest(): void { printFileHashes(this.selectedItem?.snapshot?.manifest ?? []); }
}
