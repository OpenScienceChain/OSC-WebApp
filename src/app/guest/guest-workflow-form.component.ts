import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { forkJoin, Subscription } from 'rxjs';
import {
  DemoCatalogArtifact,
  DemoResearchContext,
  DemoStatus,
} from './demo.models';
import { DemoService } from './demo.service';
import { ClampInputLengthDirective } from '../shared/clamp-input-length.directive';
import { UxAnalyticsService } from '../analytics/ux-analytics.service';
import { FormAnalytics } from '../analytics/form-analytics';

interface WorkflowRepository {
  url: string;
  description: string;
  gitHash: string;
  contents: { filename: string; hash: string }[];
  fetching: boolean;
  fetchMessage: string;
}

@Component({
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, ClampInputLengthDirective],
  templateUrl: './guest-workflow-form.component.html',
  styleUrls: ['./guest-workflow-form.component.css'],
})
export class GuestWorkflowFormComponent implements OnInit, OnDestroy {
  readonly isEdit: boolean;
  readonly id: string;
  readonly formAnalytics: FormAnalytics;
  editReady = false;
  accessDenied = false;
  status?: DemoStatus;
  artifacts: DemoCatalogArtifact[] = [];
  selectedIds = new Set<string>();
  context: DemoResearchContext | '' = '';
  title = '';
  description = '';
  keywords = '';
  submissionComment = '';
  githubRepositories: WorkflowRepository[] = [];
  artifactSearch = '';
  showArtifactDropdown = false;
  touched = new Set<string>();
  submitted = false;
  requestId = '';
  error = '';
  busy = false;
  private sessionSubscription?: Subscription;
  private activeAccount?: string;

  constructor(
    public readonly demo: DemoService,
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly http: HttpClient,
    analytics: UxAnalyticsService,
  ) {
    const id = route.snapshot.paramMap.get('id') || '';
    const analyticsRoute = id ? '/update-workflow/:id' : '/create-workflow';
    this.formAnalytics = new FormAnalytics(analytics, analyticsRoute);
    this.id = id;
    this.isEdit = !!id;
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
        if (this.activeAccount) {
          this.accessDenied = false;
          this.loadArtifacts();
          if (this.isEdit) this.loadEdit();
        } else {
          this.artifacts = [];
          this.editReady = false;
        }
      },
    );
  }

  ngOnDestroy(): void {
    this.sessionSubscription?.unsubscribe();
  }

  private loadEdit(): void {
    forkJoin({
      mine: this.demo.getMyWorkflows(),
      detail: this.demo.getWorkflow(this.id),
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
        this.title = detail.title;
        this.description = detail.description;
        this.keywords = (detail.keywords || []).join(', ');
        this.submissionComment = detail.submissionComment || '';
        this.selectedIds = new Set(detail.artifactIds);
        this.githubRepositories = (detail.githubRepositories || []).map(
          (repository) => ({
            url: repository.url,
            description: repository.description || '',
            gitHash: repository.gitHash || '',
            contents: repository.contents || [],
            fetching: false,
            fetchMessage: '',
          }),
        );
        this.editReady = true;
      },
      error: () => (this.accessDenied = true),
    });
  }

  loadArtifacts(): void {
    const organization = this.demo.session?.organization;
    if (!organization || !this.demo.session?.accountUsername) return;
    this.demo.listArtifacts(organization).subscribe({
      next: (items) =>
        (this.artifacts = items.filter(
          (item) =>
            item.organizationSlug === organization &&
            item.submissionState === 'SUCCESS',
        )),
      error: () => (this.error = 'Organization artifacts are unavailable.'),
    });
  }

  get selectedArtifacts(): DemoCatalogArtifact[] {
    return this.artifacts.filter((artifact) =>
      this.selectedIds.has(artifact.id),
    );
  }

  get organizationName(): string {
    return this.demo.session?.organization === 'citizen-science'
      ? 'Citizen Science'
      : 'Neuroscience Gateway';
  }

  get matchingArtifacts(): DemoCatalogArtifact[] {
    const query = this.artifactSearch.trim().toLowerCase();
    return this.artifacts.filter(
      (artifact) =>
        !this.selectedIds.has(artifact.id) &&
        (!query || artifact.title.toLowerCase().includes(query)),
    );
  }

  get formValid(): boolean {
    const keywords = this.keywordList();
    return (
      this.title.trim().length >= 3 &&
      this.title.trim().length <= 200 &&
      this.description.trim().length >= 50 &&
      this.description.trim().length <= 3000 &&
      this.submissionComment.trim().length >= 20 &&
      this.submissionComment.trim().length <= 1000 &&
      keywords.length <= 10 &&
      keywords.every((keyword) => keyword.length <= 100) &&
      keywords.join('').length <= 960 &&
      this.githubRepositories.every((repository) =>
        this.repositoryValid(repository),
      ) &&
      this.selectedIds.size >= 1 &&
      this.selectedIds.size <= 3
    );
  }

  get canSubmit(): boolean {
    return (
      !!this.demo.session?.accountUsername &&
      this.status?.state === 'OPEN' &&
      (!this.isEdit || this.editReady) &&
      this.formValid &&
      !this.busy
    );
  }

  showError(field: string): boolean {
    return this.submitted || this.touched.has(field);
  }

  markTouched(field: string): void {
    this.formAnalytics.markTouched(
      field,
      this.touched,
      this.invalidField(field),
    );
  }

  onChange(): void {
    this.formAnalytics.start();
    this.requestId = '';
    this.error = '';
  }

  selectArtifact(id: string): void {
    if (this.selectedIds.size >= 3) return;
    this.selectedIds.add(id);
    this.artifactSearch = '';
    this.showArtifactDropdown = false;
    this.onChange();
  }

  removeArtifact(id: string): void {
    this.selectedIds.delete(id);
    this.onChange();
  }

  addRepository(): void {
    if (this.githubRepositories.length >= 3) return;
    this.githubRepositories.push({
      url: '',
      description: '',
      gitHash: '',
      contents: [],
      fetching: false,
      fetchMessage: '',
    });
    this.onChange();
  }

  removeRepository(index: number): void {
    this.githubRepositories.splice(index, 1);
    this.onChange();
  }

  addContent(repository: WorkflowRepository): void {
    if (repository.contents.length >= 10) return;
    repository.contents.push({ filename: '', hash: '' });
    this.onChange();
  }

  fetchRepository(repository: WorkflowRepository): void {
    const url = repository.url.trim();
    const match =
      /^https:\/\/github\.com\/([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+)\/?$/.exec(
        url,
      );
    if (!match) return;
    const api = `https://api.github.com/repos/${match[1]}/${match[2]}`;
    repository.fetching = true;
    repository.fetchMessage = '';
    this.http.get<{ description?: string | null }>(api).subscribe({
      next: (info) => {
        if (repository.url.trim() !== url) return;
        if (!repository.description.trim() && info.description) {
          repository.description = info.description.slice(0, 500);
          this.onChange();
        }
        this.http
          .get<{ sha: string }[]>(`${api}/commits?per_page=1`)
          .subscribe({
            next: (commits) => {
              if (repository.url.trim() !== url) return;
              const sha = commits[0]?.sha;
              if (
                !repository.gitHash.trim() &&
                sha &&
                /^[a-fA-F0-9]{40}$/.test(sha)
              ) {
                repository.gitHash = sha;
                this.onChange();
              }
              this.http
                .get<{ name: string; sha: string; type: string }[]>(
                  `${api}/contents/`,
                )
                .subscribe({
                  next: (items) => {
                    repository.fetching = false;
                    if (
                      repository.url.trim() !== url ||
                      repository.contents.length
                    )
                      return;
                    if (items.length > 10) {
                      repository.fetchMessage =
                        'More than 10 root entries; add the relevant files manually.';
                      return;
                    }
                    repository.contents = items
                      .filter((item) => item.name.length <= 160)
                      .map((item) => ({
                        filename:
                          item.type === 'dir' ? `${item.name}/` : item.name,
                        hash: item.type === 'dir' ? '' : item.sha || '',
                      }));
                    this.onChange();
                  },
                  error: () => {
                    repository.fetching = false;
                    repository.fetchMessage =
                      'Repository files could not be loaded; add them manually.';
                  },
                });
            },
            error: () => {
              repository.fetching = false;
              repository.fetchMessage =
                'Latest commit could not be loaded; enter it manually.';
            },
          });
      },
      error: (error) => {
        repository.fetching = false;
        repository.fetchMessage =
          error.status === 404
            ? 'Repository not found or private; enter details manually.'
            : error.status === 403
              ? 'GitHub rate limit reached; enter details manually.'
              : 'Repository details could not be loaded; enter them manually.';
      },
    });
  }

  private keywordList(): string[] {
    return this.keywords
      .split(',')
      .map((keyword) => keyword.trim())
      .filter(Boolean);
  }

  repositoryValid(repository: WorkflowRepository): boolean {
    return (
      /^https:\/\/github\.com\/[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+\/?$/.test(
        repository.url.trim(),
      ) &&
      repository.url.trim().length <= 400 &&
      repository.description.trim().length <= 500 &&
      (!repository.gitHash.trim() ||
        /^[a-fA-F0-9]{7,40}$/.test(repository.gitHash.trim())) &&
      repository.contents.every(
        (content) =>
          content.filename.trim().length >= 1 &&
          content.filename.trim().length <= 160 &&
          content.hash.trim().length <= 128,
      )
    );
  }

  submit(): void {
    this.formAnalytics.attempt();
    this.submitted = true;
    if (!this.canSubmit) {
      if (!this.formValid) this.formAnalytics.validationError();
      this.error =
        'Complete the required fields and select 1–3 confirmed artifacts.';
      return;
    }
    this.busy = true;
    this.error = '';
    const requestId = (this.requestId ||= crypto.randomUUID());
    const fields = {
      requestId,
      artifactIds: [...this.selectedIds],
      submissionComment: this.submissionComment.trim(),
      keywords: this.keywordList(),
      githubRepositories: this.githubRepositories.map((repository) => ({
        url: repository.url.trim(),
        description: repository.description.trim(),
        gitHash: repository.gitHash.trim() || undefined,
        contents: repository.contents.map((content) => ({
          filename: content.filename.trim(),
          hash: content.hash.trim(),
        })),
      })),
    };
    const operation = this.isEdit
      ? this.demo.updateWorkflow(this.id, fields)
      : this.demo.createWorkflow({
          ...fields,
          researchContext: this.context || 'OTHER',
          title: this.title.trim(),
          description: this.description.trim(),
        });
    operation.subscribe({
      next: (workflow) => {
        this.formAnalytics.accepted('WORKFLOW_SUBMITTED');
        this.busy = false;
        this.requestId = '';
        this.router.navigate(['/workflows', workflow.id]);
      },
      error: (error) => {
        this.busy = false;
        if (error.status === 401) {
          this.demo.clearSession();
          this.error = 'Your session expired. Sign in again to continue.';
        } else if (error.status === 403) {
          this.error =
            'Only the account that submitted this workflow can update it.';
        } else if (error.status === 409) {
          this.error =
            'This request conflicted. Check your workflow and linked artifacts before retrying.';
        } else if (error.status === 429) {
          this.error = 'Workflow contribution limit reached.';
        } else {
          this.error =
            'Workflow submission failed. Retry keeps the same request ID.';
        }
      },
    });
  }

  private invalidField(field: string): boolean {
    if (field === 'title')
      return this.title.trim().length < 3 || this.title.trim().length > 200;
    if (field === 'description')
      return (
        this.description.trim().length < 50 ||
        this.description.trim().length > 3000
      );
    if (field === 'comment')
      return (
        this.submissionComment.trim().length < 20 ||
        this.submissionComment.trim().length > 1000
      );
    const repository = this.githubRepositories[Number(field.slice(5))];
    return (
      field.startsWith('repo-') &&
      !!repository &&
      !this.repositoryValid(repository)
    );
  }
}
