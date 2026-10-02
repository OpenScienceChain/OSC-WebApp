import { Component, OnInit } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  FormArray,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { ToastrService } from 'ngx-toastr';
import { WorkflowService } from '../../services/workflow.service';
import { ArtifactService } from '../../artifacts/services/artifact.service';
import { Artifact } from '../../models/artifact.model';
import {
  CreateWorkflowDTO,
  GitHubRepository,
} from '../../models/workflow.model';
import { ClampInputLengthDirective } from '../../shared/clamp-input-length.directive';

@Component({
  selector: 'app-create-workflow',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    ClampInputLengthDirective,
  ],
  templateUrl: './create-workflow.component.html',
  styleUrls: ['./create-workflow.component.css'],
})
export class CreateWorkflowComponent implements OnInit {
  workflowForm: FormGroup;
  isSubmitting = false;
  lastCreatedId: string | null = null;

  // Artifact picker
  availableArtifacts: Artifact[] = [];
  filteredArtifacts: Artifact[] = [];
  selectedArtifacts: Artifact[] = [];
  artifactSearchQuery = '';
  showArtifactDropdown = false;
  artifactError = '';

  // GitHub repo fetching state per repo index
  repoFetchingState: Map<number, { loading: boolean; error: string }> =
    new Map();
  expandedRepoContents: Set<number> = new Set();

  toggleContentsExpand(repoIndex: number): void {
    if (this.expandedRepoContents.has(repoIndex)) {
      this.expandedRepoContents.delete(repoIndex);
    } else {
      this.expandedRepoContents.add(repoIndex);
    }
  }

  isContentsExpanded(repoIndex: number): boolean {
    return this.expandedRepoContents.has(repoIndex);
  }

  constructor(
    private readonly fb: FormBuilder,
    private readonly location: Location,
    private readonly workflowService: WorkflowService,
    private readonly artifactService: ArtifactService,
    private readonly toastr: ToastrService,
    private readonly router: Router,
    private readonly http: HttpClient,
  ) {
    this.workflowForm = this.fb.group({
      title: [
        '',
        [
          Validators.required,
          Validators.minLength(3),
          Validators.maxLength(200),
        ],
      ],
      description: [
        '',
        [
          Validators.required,
          Validators.minLength(50),
          Validators.maxLength(3000),
        ],
      ],
      keywords: ['', [Validators.maxLength(1000)]],
      submission_comment: [
        '',
        [
          Validators.required,
          Validators.minLength(20),
          Validators.maxLength(1000),
        ],
      ],
      githubRepositories: this.fb.array([]),
    });
  }

  ngOnInit(): void {
    this.artifactService.getArtifacts().subscribe((artifacts) => {
      this.availableArtifacts = artifacts;
      this.filteredArtifacts = [];
    });
  }

  get repoForms(): FormArray {
    return this.workflowForm.get('githubRepositories') as FormArray;
  }

  addRepository(): void {
    const repoGroup = this.fb.group({
      url: [
        '',
        [
          Validators.required,
          Validators.pattern(/^https:\/\/github\.com\/[^/]+\/[^/]+/),
        ],
      ],
      description: [''],
      gitHash: [''],
      contents: this.fb.array([]),
    });
    this.repoForms.push(repoGroup);
  }

  removeRepository(index: number): void {
    this.repoForms.removeAt(index);
    this.repoFetchingState.delete(index);
  }

  getContents(repoIndex: number): FormArray {
    return this.repoForms.at(repoIndex).get('contents') as FormArray;
  }

  addContent(repoIndex: number): void {
    const contentGroup = this.fb.group({
      filename: ['', Validators.required],
      hash: ['', Validators.required],
    });
    this.getContents(repoIndex).push(contentGroup);
  }

  removeContent(repoIndex: number, contentIndex: number): void {
    this.getContents(repoIndex).removeAt(contentIndex);
  }

  // GitHub auto-fetch
  parseGitHubUrl(url: string): { owner: string; repo: string } | null {
    const match = url.match(/^https:\/\/github\.com\/([^/]+)\/([^/]+)/);
    if (!match) return null;
    return { owner: match[1], repo: match[2].replace(/\.git$/, '') };
  }

  onRepoUrlBlur(repoIndex: number): void {
    const repoGroup = this.repoForms.at(repoIndex);
    const url = repoGroup.get('url')?.value?.trim();
    if (!url) return;

    const parsed = this.parseGitHubUrl(url);
    if (!parsed) return;

    this.repoFetchingState.set(repoIndex, { loading: true, error: '' });

    const apiBase = `https://api.github.com/repos/${parsed.owner}/${parsed.repo}`;

    // Fetch repo info (description)
    this.http.get<any>(apiBase).subscribe({
      next: (repoInfo) => {
        if (repoInfo.description && !repoGroup.get('description')?.value) {
          repoGroup.get('description')?.setValue(repoInfo.description);
        }
        // Fetch latest commit
        this.http.get<any[]>(`${apiBase}/commits?per_page=1`).subscribe({
          next: (commits) => {
            if (commits?.length > 0 && !repoGroup.get('gitHash')?.value) {
              repoGroup.get('gitHash')?.setValue(commits[0].sha);
            }
          },
          error: () => {}, // non-critical
        });
        // Fetch root contents (files + directories)
        this.http.get<any[]>(`${apiBase}/contents/`).subscribe({
          next: (items) => {
            const contentsArray = this.getContents(repoIndex);
            if (contentsArray.length === 0 && items?.length > 0) {
              for (const item of items) {
                const isDir = item.type === 'dir';
                contentsArray.push(
                  this.fb.group({
                    filename: [
                      isDir ? item.name + '/' : item.name,
                      Validators.required,
                    ],
                    hash: [
                      isDir ? '' : item.sha || '',
                      isDir ? [] : Validators.required,
                    ],
                  }),
                );
              }
            }
            this.repoFetchingState.set(repoIndex, {
              loading: false,
              error: '',
            });
          },
          error: () => {
            this.repoFetchingState.set(repoIndex, {
              loading: false,
              error: '',
            });
          },
        });
      },
      error: (err) => {
        const msg =
          err.status === 404
            ? 'Repository not found or is private'
            : err.status === 403
              ? 'GitHub API rate limit reached'
              : 'Could not fetch repository info';
        this.repoFetchingState.set(repoIndex, { loading: false, error: msg });
      },
    });
  }

  getRepoFetchState(index: number): { loading: boolean; error: string } {
    return this.repoFetchingState.get(index) || { loading: false, error: '' };
  }

  // Artifact picker methods
  onArtifactSearchFocus(): void {
    this.showArtifactDropdown = true;
    if (
      !this.artifactSearchQuery ||
      this.artifactSearchQuery.trim().length < 2
    ) {
      this.showRecentArtifacts();
    }
  }

  onArtifactSearchBlur(): void {
    // Delay to allow click on dropdown items
    setTimeout(() => {
      this.showArtifactDropdown = false;
    }, 200);
  }

  private showRecentArtifacts(): void {
    const selectedIds = new Set(this.selectedArtifacts.map((a) => a.id));
    this.filteredArtifacts = this.availableArtifacts
      .filter((a) => !selectedIds.has(a.id))
      .slice(0, 3);
  }

  onArtifactSearch(query: string): void {
    this.artifactSearchQuery = query;
    this.showArtifactDropdown = true;
    if (!query || query.trim().length < 2) {
      this.showRecentArtifacts();
      return;
    }
    const lower = query.toLowerCase();
    const selectedIds = new Set(this.selectedArtifacts.map((a) => a.id));
    this.filteredArtifacts = this.availableArtifacts
      .filter(
        (a) => !selectedIds.has(a.id) && a.title.toLowerCase().includes(lower),
      )
      .slice(0, 10);
  }

  selectArtifact(artifact: Artifact): void {
    if (!this.selectedArtifacts.find((a) => a.id === artifact.id)) {
      this.selectedArtifacts.push(artifact);
    }
    this.filteredArtifacts = [];
    this.artifactSearchQuery = '';
    this.artifactError = '';
    this.showArtifactDropdown = false;
  }

  removeArtifact(id: string): void {
    this.selectedArtifacts = this.selectedArtifacts.filter((a) => a.id !== id);
  }

  goBack(): void {
    this.location.back();
  }

  onSubmit(): void {
    // UI-side: at least one artifact required
    if (this.selectedArtifacts.length === 0) {
      this.artifactError =
        'At least one artifact must be linked to the workflow.';
      return;
    }

    if (this.workflowForm.invalid || this.isSubmitting) return;
    this.isSubmitting = true;

    const formValues = this.workflowForm.value;

    const keywords = formValues.keywords
      ? formValues.keywords
          .split(',')
          .map((k: string) => k.trim())
          .filter((k: string) => k.length > 0)
      : [];

    const githubRepositories: GitHubRepository[] = (
      formValues.githubRepositories || []
    ).map((r: any) => ({
      url: r.url,
      description: r.description || '',
      gitHash: r.gitHash || '',
      contents: (r.contents || []).map((c: any) => ({
        filename: c.filename,
        hash: c.hash,
      })),
    }));

    const dto: CreateWorkflowDTO = {
      title: formValues.title,
      description: formValues.description,
      keywords,
      githubRepositories,
      artifactIds: this.selectedArtifacts.map((a) => a.id),
      submission_comment: formValues.submission_comment,
    };

    this.workflowService.createWorkflow(dto).subscribe({
      next: (res: any) => {
        this.lastCreatedId = res.id;
        this.toastr.success(
          'Your workflow has been successfully submitted!',
          'Success!',
          { timeOut: 5000 },
        );
        this.isSubmitting = false;
      },
      error: (err) => {
        this.toastr.error(err?.message || 'Failed to create workflow');
        this.isSubmitting = false;
      },
    });
  }
}
