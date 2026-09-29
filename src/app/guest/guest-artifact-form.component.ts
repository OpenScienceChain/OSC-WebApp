import { CommonModule } from '@angular/common';
import {
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  ViewChild,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { forkJoin, Subscription } from 'rxjs';
import { ToastrService } from 'ngx-toastr';
import {
  DemoArtifactEditRequest,
  DemoFileEntry,
  DemoArtifactMetadata,
  DemoCatalogArtifact,
  DemoResearchContext,
  DemoStatus,
} from './demo.models';
import { DemoService } from './demo.service';
import { ClampInputLengthDirective } from '../shared/clamp-input-length.directive';

const MAX_FILE_BYTES = 50 * 1024 * 1024;
const MAX_FILE_COUNT = 500;
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
  imports: [CommonModule, FormsModule, RouterModule, ClampInputLengthDirective],
  templateUrl: './guest-artifact-form.component.html',
  styleUrls: ['./guest-artifact-form.component.css'],
})
export class GuestArtifactFormComponent implements OnInit, OnDestroy {
  readonly isEdit: boolean;
  readonly id: string;
  baseline?: DemoCatalogArtifact;
  accessDenied = false;
  status?: DemoStatus;
  busy = false;
  hashing = false;
  error = '';
  fileError = '';
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
  researchContext: DemoResearchContext | '' = '';
  fingerprint = '';
  keepManifestUnchanged = false;
  sizeBytes = 0;
  extension = '';
  selectedFiles: (DemoFileEntry & { name: string })[] = [];
  @ViewChild('fileInput') fileInput?: ElementRef<HTMLInputElement>;
  @ViewChild('folderInput') folderInput?: ElementRef<HTMLInputElement>;
  touched = new Set<string>();
  lengthWarnings: Record<string, string> = {};
  private sessionSubscription?: Subscription;
  private activeAccount?: string;

  constructor(
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    public readonly demo: DemoService,
    private readonly toastr: ToastrService,
  ) {
    this.id = route.snapshot.paramMap.get('id') || '';
    this.isEdit = !!this.id;
  }

  ngOnInit(): void {
    this.demo.getStatus().subscribe({
      next: (status) => (this.status = status),
      error: () => (this.error = 'Run status is unavailable.'),
    });
    this.sessionSubscription = this.demo.sessionChanges$.subscribe(
      (session) => {
        if (session?.accountUsername === this.activeAccount) return;
        this.activeAccount = session?.accountUsername;
        if (this.isEdit && this.activeAccount) {
          this.accessDenied = false;
          this.loadEdit();
        } else if (this.isEdit) {
          this.baseline = undefined;
        }
      },
    );
  }

  ngOnDestroy(): void {
    this.sessionSubscription?.unsubscribe();
  }

  get organizationName(): string {
    return this.demo.session?.organization === 'citizen-science'
      ? 'Citizen Science'
      : 'Neuroscience Gateway';
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
          this.accessDenied = true;
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
      error: () => (this.accessDenied = true),
    });
  }

  get canSubmit(): boolean {
    return (
      !!this.demo.session?.accountUsername &&
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
      !this.metadataError() &&
      (!this.isEdit ||
        (this.keepManifestUnchanged
          ? Object.keys(this.editChanges(this.metadata())).length > 0
          : !!this.fingerprint &&
            (this.fingerprint !== this.baseline?.footprint ||
              Object.keys(this.editChanges(this.metadata())).some(
                (key) =>
                  !['fingerprint', 'sizeBytes', 'extension', 'files'].includes(
                    key,
                  ),
              ))))
    );
  }

  onManifestChoice(): void {
    this.resetFiles();
  }

  onChange(field?: string): void {
    this.requestId = '';
    this.error = '';
    if (field) delete this.lengthWarnings[field];
  }

  onLengthLimit(field: string, max: number): void {
    if (this.lengthWarnings[field]) return;
    const label =
      (
        {
          title: 'Title',
          description: 'Description',
          keywords: 'Keywords',
          links: 'Links',
          dois: 'DOIs',
          otherAgency: 'Other agencies',
          acknowledgement: 'Acknowledgment',
          submissionComment: 'Submission comment',
        } as Record<string, string>
      )[field] || field;
    const message = `${label} cannot exceed ${max} characters.`;
    this.lengthWarnings[field] = message;
    this.touched.add(field);
    this.toastr.warning(message, 'Length limit');
  }

  markTouched(field: string): void {
    this.touched.add(field);
  }

  fieldError(field: string): string {
    if (this.lengthWarnings[field]) return this.lengthWarnings[field];
    const raw =
      this[
        field as
          'keywords' | 'links' | 'dois' | 'otherAgency' | 'acknowledgement'
      ];
    const items = field === 'otherAgency' ? this.agencies() : this.list(raw);
    if (field === 'acknowledgement') {
      return raw.trim().length > 1000
        ? 'Acknowledgment cannot exceed 1000 characters.'
        : '';
    }
    if (raw && raw.split(',').some((item) => !item.trim()))
      return 'Separate entries with commas; remove empty entries.';
    const limits: Record<string, [number, number, string]> = {
      keywords: [10, 100, 'keywords'],
      links: [5, 400, 'links'],
      dois: [5, 100, 'DOIs'],
      otherAgency: [5, 100, 'funding agencies'],
    };
    const [count, length, label] = limits[field];
    if (
      items.length > count ||
      items.some(
        (item) =>
          (field === 'links' ? this.normalizedLink(item) : item).length >
          length,
      )
    )
      return `Use at most ${count} ${label}, each no longer than ${length} characters.`;
    if (
      field === 'links' &&
      items.some((link) => {
        try {
          const url = new URL(this.normalizedLink(link));
          return (
            url.protocol !== 'https:' ||
            !url.hostname.includes('.') ||
            !!url.username ||
            !!url.password
          );
        } catch {
          return true;
        }
      })
    )
      return 'Enter valid HTTPS website links, separated by commas. HTTP is not supported.';
    if (
      field === 'dois' &&
      items.some((doi) => !/^10\.\d{4,9}\/[-_.;()/:A-Za-z0-9]+$/.test(doi))
    )
      return 'Enter each DOI as 10.xxxx/suffix.';
    return '';
  }

  selectFile(): void {
    this.fileInput?.nativeElement.click();
  }
  selectFolder(): void {
    this.folderInput?.nativeElement.click();
  }

  async onFileSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    await this.processFiles(Array.from(input.files || []));
    input.value = '';
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
  }
  async onDrop(event: DragEvent): Promise<void> {
    event.preventDefault();
    if (this.keepManifestUnchanged) return;
    await this.processFiles(Array.from(event.dataTransfer?.files || []));
  }

  resetFiles(): void {
    this.onChange();
    this.fileError = '';
    this.fingerprint = '';
    this.sizeBytes = 0;
    this.extension = '';
    this.selectedFiles = [];
  }

  private async processFiles(files: File[]): Promise<void> {
    this.resetFiles();
    if (!files.length) return;
    const total = files.reduce((sum, file) => sum + file.size, 0);
    const unsupported = files.find(
      (file) =>
        !ALLOWED_EXTENSIONS.has(
          file.name.split('.').pop()?.toLowerCase() || '',
        ),
    );
    if (
      files.length > MAX_FILE_COUNT ||
      total > MAX_FILE_BYTES ||
      files.some((file) => file.size < 1) ||
      unsupported
    ) {
      this.fileError =
        files.length > MAX_FILE_COUNT
          ? 'Choose at most 500 files.'
          : total > MAX_FILE_BYTES
            ? 'The selected files exceed the 50 MiB total limit.'
            : files.some((file) => file.size < 1)
              ? 'Empty files cannot be registered.'
              : `Unsupported file type: ${unsupported?.name.split('.').pop() || 'unknown'}.`;
      this.toastr.warning(this.fileError, 'File not accepted');
      return;
    }
    this.hashing = true;
    try {
      const sorted = [...files].sort((a, b) =>
        (a.webkitRelativePath || a.name).localeCompare(
          b.webkitRelativePath || b.name,
          'en',
        ),
      );
      const entries = [] as (DemoFileEntry & { name: string })[];
      for (const file of sorted)
        entries.push({
          name: file.webkitRelativePath || file.name,
          hash: await this.sha256(await file.arrayBuffer()),
          sizeBytes: file.size,
          extension: file.name.split('.').pop()!.toLowerCase(),
        });
      this.selectedFiles = entries;
      this.sizeBytes = total;
      this.extension = entries.length > 1 ? 'bundle' : entries[0].extension;
      this.fingerprint =
        entries.length === 1
          ? entries[0].hash
          : await this.sha256(
              new TextEncoder().encode(
                entries
                  .map(
                    (file, index) =>
                      `${index + 1}\t${file.extension}\t${file.hash}\t${file.sizeBytes}`,
                  )
                  .join('\n'),
              ),
            );
    } catch {
      this.fileError = 'This browser could not compute the file fingerprint.';
      this.toastr.error(this.fileError, 'File processing failed');
    } finally {
      this.hashing = false;
    }
  }

  private async sha256(bytes: BufferSource): Promise<string> {
    const digest = await crypto.subtle.digest('SHA-256', bytes);
    return Array.from(new Uint8Array(digest), (byte) =>
      byte.toString(16).padStart(2, '0'),
    ).join('');
  }

  private fileEntries(): DemoFileEntry[] | undefined {
    return this.selectedFiles.length > 1
      ? this.selectedFiles.map(({ hash, sizeBytes, extension }) => ({
          hash,
          sizeBytes,
          extension,
        }))
      : undefined;
  }

  submit(): void {
    if (!this.demo.session?.accountUsername) {
      this.error = 'Sign in to your contributor account before submitting.';
      return;
    }
    if (!this.canSubmit) {
      this.error =
        this.metadataError() ||
        'Complete the required fields and select a supported file.';
      this.toastr.warning(this.error, 'Check the form');
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
          researchContext: this.researchContext || 'OTHER',
          fingerprint: this.fingerprint,
          sizeBytes: this.sizeBytes,
          extension: this.extension,
          ...(this.fileEntries() ? { files: this.fileEntries() } : {}),
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
    this.toastr.success(
      this.isEdit ? 'Artifact revision submitted.' : 'Artifact submitted.',
      'Accepted',
    );
    this.router.navigate(['/artifacts', id]);
  }

  private fail(error: { status?: number }): void {
    this.busy = false;
    if (error.status === 401) {
      this.demo.clearSession();
      this.error = 'Your session expired. Sign in again to continue.';
    } else if (error.status === 403)
      this.error =
        'Only the account that submitted this artifact can update it.';
    else if (error.status === 409)
      this.error = 'A revision is pending or the request conflicted.';
    else if (error.status === 429)
      this.error = 'The contribution or revision limit has been reached.';
    else this.error = 'Submission failed. Retry keeps the same request ID.';
    this.toastr.error(this.error, 'Submission failed');
  }

  private list(text: string): string[] {
    return text
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean);
  }

  private normalizedLink(link: string): string {
    return /^[a-z][a-z\d+.-]*:\/\//i.test(link) ? link : `https://${link}`;
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
    const links = this.list(this.links).map((link) =>
      this.normalizedLink(link),
    );
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
    if (!this.keepManifestUnchanged && this.fingerprint) {
      changes.fingerprint = this.fingerprint;
      changes.sizeBytes = this.sizeBytes;
      changes.extension = this.extension;
      if (this.fileEntries()) changes.files = this.fileEntries();
    }
    return changes;
  }

  metadataError(): string {
    for (const field of [
      'keywords',
      'links',
      'dois',
      'otherAgency',
      'acknowledgement',
    ]) {
      const error = this.fieldError(field);
      if (error) return error;
    }
    return '';
  }
}
