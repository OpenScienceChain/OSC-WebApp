import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { forkJoin } from 'rxjs';
import {
  DemoArtifactEditRequest,
  DemoArtifactMetadata,
  DemoCatalogArtifact,
  DemoResearchContext,
  DemoStatus,
} from './demo.models';
import { DemoService } from './demo.service';
import { GuestSessionPanelComponent } from './guest-session-panel.component';

const MAX_FILE_BYTES = 10 * 1024 * 1024;
const ALLOWED_EXTENSIONS = new Set([
  'csv',
  'json',
  'md',
  'pdf',
  'png',
  'tif',
  'tiff',
  'txt',
  'yaml',
  'yml',
]);

@Component({
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    GuestSessionPanelComponent,
  ],
  templateUrl: './guest-artifact-form.component.html',
  styleUrls: ['./guest-artifact-form.component.css'],
})
export class GuestArtifactFormComponent implements OnInit {
  readonly isEdit: boolean;
  private readonly id: string;
  private baseline?: DemoCatalogArtifact;
  status?: DemoStatus;
  busy = false;
  hashing = false;
  error = '';
  requestId = '';
  title = '';
  description = '';
  keywords = '';
  links = '';
  dois = '';
  otherAgency = '';
  nsf = false;
  nih = false;
  noaa = false;
  nasa = false;
  acknowledgement = '';
  submissionComment = '';
  researchContext: DemoResearchContext = 'RESEARCH_DATASET';
  fingerprint = '';
  sizeBytes = 0;
  extension = '';

  constructor(
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    public readonly demo: DemoService,
  ) {
    this.id = route.snapshot.paramMap.get('id') || '';
    this.isEdit = !!this.id;
  }

  ngOnInit(): void {
    this.demo.getStatus().subscribe({
      next: (status) => (this.status = status),
      error: () => (this.error = 'Run status is unavailable.'),
    });
    if (this.isEdit && this.demo.session) this.loadEdit();
  }

  onSessionStarted(): void {
    if (this.isEdit) this.loadEdit();
  }

  private loadEdit(): void {
    forkJoin({
      mine: this.demo.getMyArtifacts(),
      detail: this.demo.getPublicArtifact(this.id),
    }).subscribe({
      next: ({ mine, detail }) => {
        if (
          !mine.some(
            (item) => item.id === this.id && item.submissionState === 'SUCCESS',
          )
        ) {
          this.error =
            'Only the session that owns this confirmed artifact may edit it.';
          return;
        }
        this.baseline = detail;
        this.title = detail.title;
        this.description = detail.description;
        this.keywords = (detail.keywords || []).join(', ');
        this.links = (detail.links || []).join(', ');
        this.dois = (detail.dois || []).join(', ');
        this.acknowledgement = detail.acknowledgements || '';
        this.otherAgency = (detail.fundingAgencies || []).join(', ');
      },
      error: () =>
        (this.error = 'This owned artifact could not be loaded for editing.'),
    });
  }

  get canSubmit(): boolean {
    return (
      !!this.demo.session &&
      this.status?.state === 'OPEN' &&
      !this.busy &&
      !this.hashing &&
      (this.isEdit ? !!this.baseline : !!this.fingerprint) &&
      (this.isEdit ||
        (this.title.trim().length >= 3 &&
          this.title.trim().length <= 200 &&
          this.description.trim().length >= 50 &&
          this.description.trim().length <= 3000)) &&
      this.submissionComment.trim().length >= 20 &&
      this.submissionComment.trim().length <= 1000 &&
      !this.metadataError()
    );
  }

  onChange(): void {
    this.requestId = '';
  }

  async onFileSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    this.onChange();
    this.fingerprint = '';
    this.sizeBytes = 0;
    this.extension = '';
    if (!file) return;
    const extension = file.name.split('.').pop()?.toLowerCase() || '';
    if (
      file.size < 1 ||
      file.size > MAX_FILE_BYTES ||
      !ALLOWED_EXTENSIONS.has(extension)
    ) {
      this.error = 'Choose one non-empty supported file no larger than 10 MiB.';
      input.value = '';
      return;
    }
    this.error = '';
    this.hashing = true;
    try {
      const digest = await crypto.subtle.digest(
        'SHA-256',
        await file.arrayBuffer(),
      );
      if (input.files?.[0] !== file) return;
      this.fingerprint = Array.from(new Uint8Array(digest), (byte) =>
        byte.toString(16).padStart(2, '0'),
      ).join('');
      this.sizeBytes = file.size;
      this.extension = extension;
    } catch {
      this.error = 'This browser could not compute the file fingerprint.';
    } finally {
      this.hashing = false;
    }
  }

  submit(): void {
    if (!this.demo.session) {
      this.error = 'Start a guest session before contributing.';
      return;
    }
    if (!this.canSubmit) {
      this.error =
        this.metadataError() ||
        'Complete the required fields and select a supported file.';
      return;
    }
    const requestId = (this.requestId ||= crypto.randomUUID());
    const comment = this.submissionComment.trim();
    const metadata = this.metadata();
    this.busy = true;
    this.error = '';
    if (this.isEdit) {
      const changes = this.editChanges(metadata);
      if (!Object.keys(changes).length) {
        this.error =
          'Change at least one editable field or choose a replacement file.';
        this.busy = false;
        return;
      }
      const request: DemoArtifactEditRequest = {
        requestId,
        submissionComment: comment,
        ...changes,
      };
      this.demo.updateArtifact(this.id, request).subscribe({
        next: (artifact) => this.finish(artifact.id),
        error: (error) => this.fail(error),
      });
    } else {
      this.demo
        .createArtifact({
          requestId,
          title: this.title.trim(),
          description: this.description.trim(),
          submissionComment: comment,
          researchContext: this.researchContext,
          fingerprint: this.fingerprint,
          sizeBytes: this.sizeBytes,
          extension: this.extension,
          ...metadata,
        })
        .subscribe({
          next: (artifact) => this.finish(artifact.id),
          error: (error) => this.fail(error),
        });
    }
  }

  private finish(id: string): void {
    this.busy = false;
    this.requestId = '';
    this.router.navigate(['/artifacts', id]);
  }

  private fail(error: { status?: number }): void {
    this.busy = false;
    if (error.status === 401) {
      this.demo.clearSession();
      this.error = 'Guest session expired. Start a new session.';
    } else if (error.status === 403)
      this.error = 'This session cannot edit that artifact.';
    else if (error.status === 409)
      this.error = 'A revision is pending or the request conflicted.';
    else if (error.status === 429)
      this.error = 'Guest contribution or revision limit reached.';
    else this.error = 'Submission failed. Retry keeps the same request ID.';
  }

  private list(text: string): string[] {
    return text
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean);
  }

  private agencies(): string[] {
    return [
      ...(this.nsf ? ['NSF'] : []),
      ...(this.nih ? ['NIH'] : []),
      ...(this.noaa ? ['NOAA'] : []),
      ...(this.nasa ? ['NASA'] : []),
      ...this.list(this.otherAgency),
    ];
  }

  private metadata(): DemoArtifactMetadata {
    const keywords = this.list(this.keywords);
    const links = this.list(this.links);
    const dois = this.list(this.dois);
    const fundingAgencies = this.agencies();
    return {
      ...(keywords.length ? { keywords } : {}),
      ...(links.length ? { links } : {}),
      ...(dois.length ? { dois } : {}),
      ...(fundingAgencies.length ? { fundingAgencies } : {}),
      ...(this.acknowledgement.trim()
        ? { acknowledgements: this.acknowledgement.trim() }
        : {}),
    };
  }

  private editChanges(
    metadata: DemoArtifactMetadata,
  ): Partial<DemoArtifactEditRequest> {
    const baseline = this.baseline;
    if (!baseline) return {};
    const changes: Partial<DemoArtifactEditRequest> = {};
    for (const key of [
      'keywords',
      'links',
      'dois',
      'fundingAgencies',
    ] as const) {
      const value = metadata[key] || [];
      if (JSON.stringify(value) !== JSON.stringify(baseline[key] || []))
        changes[key] = value;
    }
    const acknowledgement = this.acknowledgement.trim();
    if (acknowledgement !== (baseline.acknowledgements || ''))
      changes.acknowledgements = acknowledgement;
    if (this.fingerprint) {
      changes.fingerprint = this.fingerprint;
      changes.sizeBytes = this.sizeBytes;
      changes.extension = this.extension;
    }
    return changes;
  }

  metadataError(): string {
    const checks: Array<[string[], number, number, string]> = [
      [this.list(this.keywords), 10, 100, 'keywords'],
      [this.list(this.links), 5, 400, 'links'],
      [this.list(this.dois), 5, 100, 'DOIs'],
      [this.agencies(), 5, 100, 'funding agencies'],
    ];
    for (const [items, count, length, name] of checks)
      if (items.length > count || items.some((item) => item.length > length))
        return `Use at most ${count} ${name}, each no longer than ${length} characters.`;
    if (
      this.list(this.links).some((link) => {
        try {
          return new URL(link).protocol !== 'https:';
        } catch {
          return true;
        }
      })
    )
      return 'Related links must be HTTPS URLs.';
    if (
      this.list(this.dois).some(
        (doi) => !/^10\.\d{4,9}\/[-_.;()/:A-Za-z0-9]+$/.test(doi),
      )
    )
      return 'Enter each DOI as 10.xxxx/suffix.';
    if (this.acknowledgement.trim().length > 1000)
      return 'Acknowledgement must be at most 1000 characters.';
    return '';
  }
}
