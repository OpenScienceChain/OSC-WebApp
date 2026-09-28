import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { Observable } from 'rxjs';
import { DemoHistoryItem } from './demo.models';
import { DemoService } from './demo.service';

@Component({
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <main id="main-content" class="container py-4">
      <h1 class="page-headline mb-3">
        {{ type === 'artifact' ? 'Artifact' : 'Workflow' }}
        {{ selectedTxId ? 'snapshot' : 'history' }}
      </h1>
      <div class="mb-3 content-block">
        <p *ngIf="recordTitle"><strong>Title:</strong> {{ recordTitle }}</p>
        <p><strong>ID:</strong> {{ id }}</p>
        <div class="mt-2 d-flex gap-2 flex-wrap">
          <a
            *ngIf="selectedTxId"
            class="btn btn-outline-primary"
            [routerLink]="['/', plural, id, 'history']"
            >All history</a
          >
          <button
            class="btn btn-outline-primary"
            type="button"
            (click)="load()"
          >
            Refresh history</button
          ><a class="btn btn-outline-primary" [routerLink]="['/', plural, id]"
            >See record detail</a
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
      <div class="history-list" *ngIf="!isLoading && visibleItems.length">
        <div
          class="history-toolbar d-flex justify-content-between align-items-center mb-2"
        >
          <div class="pager-info">
            {{
              selectedTxId
                ? 'Selected ledger event'
                : total + ' public ledger events'
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
            <div>
              <span class="badge" [ngClass]="badgeClass(item)">{{
                badgeLabel(item)
              }}</span>
              <a
                *ngIf="
                  type === 'artifact' &&
                  !selectedTxId &&
                  (item.txId || item.transactionId)
                "
                class="snapshot-link"
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
                >View snapshot</a
              >
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
    const detail: Observable<{ title: string }> =
      this.type === 'artifact'
        ? this.demo.getPublicArtifact(this.id)
        : this.demo.getPublicWorkflow(this.id);
    detail.subscribe({ next: (record) => (this.recordTitle = record.title) });
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
}
