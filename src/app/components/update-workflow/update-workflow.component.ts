import { Component, OnInit } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { FormBuilder, FormGroup, FormArray, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { ToastrService } from 'ngx-toastr';
import { WorkflowService } from '../../services/workflow.service';
import { ArtifactService } from '../../artifacts/services/artifact.service';
import { Artifact } from '../../models/artifact.model';
import { Workflow, UpdateWorkflowDTO, GitHubRepository } from '../../models/workflow.model';
import { switchMap } from 'rxjs/operators';
import { of } from 'rxjs';
import { ClampInputLengthDirective } from '../../shared/clamp-input-length.directive';

@Component({
  selector: 'app-update-workflow',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule, ClampInputLengthDirective],
  templateUrl: './update-workflow.component.html',
  styleUrls: ['./update-workflow.component.css']
})
export class UpdateWorkflowComponent implements OnInit {
  workflowForm: FormGroup;
  isSubmitting = false;
  updateSuccess = false;
  workflow?: Workflow;

  // Artifact picker
  availableArtifacts: Artifact[] = [];
  filteredArtifacts: Artifact[] = [];
  selectedArtifacts: Artifact[] = [];
  artifactSearchQuery = '';
  showArtifactDropdown = false;

  // GitHub repo fetching state
  repoFetchingState: Map<number, { loading: boolean; error: string }> = new Map();
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
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly http: HttpClient
  ) {
    this.workflowForm = this.fb.group({
      title: [{ value: '', disabled: true }],
      description: [{ value: '', disabled: true }],
      keywords: ['', [Validators.maxLength(1000)]],
      submission_comment: ['', [Validators.required, Validators.minLength(20), Validators.maxLength(1000)]],
      githubRepositories: this.fb.array([]),
    });
  }

  ngOnInit(): void {
    this.artifactService.getArtifacts().subscribe(artifacts => {
      this.availableArtifacts = artifacts;
    });

    this.route.paramMap.pipe(
      switchMap(params => {
        const id = params.get('id');
        return id ? this.workflowService.getWorkflow(id) : of(null);
      })
    ).subscribe(detail => {
      if (!detail) return;
      this.workflow = detail;
      this.prefillForm(detail);
    });
  }

  private prefillForm(detail: Workflow): void {
    this.workflowForm.patchValue({
      title: detail.title,
      description: detail.description,
      keywords: detail.keywords?.join(', ') ?? '',
    });

    this.selectedArtifacts = (detail.artifacts || []).map(a => ({
      id: a.id,
      title: a.title,
      description: a.description,
    } as Artifact));

    this.repoForms.clear();
    for (const repo of detail.githubRepositories || []) {
      const repoGroup = this.fb.group({
        url: [repo.url, [Validators.required, Validators.pattern(/^https:\/\/github\.com\/[^/]+\/[^/]+/)]],
        description: [repo.description || ''],
        gitHash: [repo.gitHash || ''],
        contents: this.fb.array(
          (repo.contents || []).map(c => {
            const isDir = c.filename?.endsWith('/');
            return this.fb.group({
              filename: [c.filename, Validators.required],
              hash: [c.hash || '', isDir ? [] : Validators.required]
            });
          })
        ),
      });
      this.repoForms.push(repoGroup);
    }
  }

  get repoForms(): FormArray {
    return this.workflowForm.get('githubRepositories') as FormArray;
  }

  addRepository(): void {
    this.repoForms.push(this.fb.group({
      url: ['', [Validators.required, Validators.pattern(/^https:\/\/github\.com\/[^/]+\/[^/]+/)]],
      description: [''],
      gitHash: [''],
      contents: this.fb.array([]),
    }));
  }

  removeRepository(index: number): void {
    this.repoForms.removeAt(index);
    this.repoFetchingState.delete(index);
  }

  getContents(repoIndex: number): FormArray {
    return this.repoForms.at(repoIndex).get('contents') as FormArray;
  }

  addContent(repoIndex: number): void {
    this.getContents(repoIndex).push(this.fb.group({
      filename: ['', Validators.required],
      hash: ['', Validators.required],
    }));
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

    this.http.get<any>(apiBase).subscribe({
      next: (repoInfo) => {
        if (repoInfo.description && !repoGroup.get('description')?.value) {
          repoGroup.get('description')?.setValue(repoInfo.description);
        }
        this.http.get<any[]>(`${apiBase}/commits?per_page=1`).subscribe({
          next: (commits) => {
            if (commits?.length > 0 && !repoGroup.get('gitHash')?.value) {
              repoGroup.get('gitHash')?.setValue(commits[0].sha);
            }
          },
          error: () => {}
        });
        this.http.get<any[]>(`${apiBase}/contents/`).subscribe({
          next: (items) => {
            const contentsArray = this.getContents(repoIndex);
            if (contentsArray.length === 0 && items?.length > 0) {
              for (const item of items) {
                const isDir = item.type === 'dir';
                contentsArray.push(this.fb.group({
                  filename: [isDir ? item.name + '/' : item.name, Validators.required],
                  hash: [isDir ? '' : (item.sha || ''), isDir ? [] : Validators.required],
                }));
              }
            }
            this.repoFetchingState.set(repoIndex, { loading: false, error: '' });
          },
          error: () => {
            this.repoFetchingState.set(repoIndex, { loading: false, error: '' });
          }
        });
      },
      error: (err) => {
        const msg = err.status === 404 ? 'Repository not found or is private'
          : err.status === 403 ? 'GitHub API rate limit reached'
          : 'Could not fetch repository info';
        this.repoFetchingState.set(repoIndex, { loading: false, error: msg });
      }
    });
  }

  getRepoFetchState(index: number): { loading: boolean; error: string } {
    return this.repoFetchingState.get(index) || { loading: false, error: '' };
  }

  // Artifact picker
  onArtifactSearchFocus(): void {
    this.showArtifactDropdown = true;
    if (!this.artifactSearchQuery || this.artifactSearchQuery.trim().length < 2) {
      this.showRecentArtifacts();
    }
  }

  onArtifactSearchBlur(): void {
    setTimeout(() => { this.showArtifactDropdown = false; }, 200);
  }

  private showRecentArtifacts(): void {
    const selectedIds = new Set(this.selectedArtifacts.map(a => a.id));
    this.filteredArtifacts = this.availableArtifacts
      .filter(a => !selectedIds.has(a.id))
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
    const selectedIds = new Set(this.selectedArtifacts.map(a => a.id));
    this.filteredArtifacts = this.availableArtifacts
      .filter(a => !selectedIds.has(a.id) && a.title.toLowerCase().includes(lower))
      .slice(0, 10);
  }

  selectArtifact(artifact: Artifact): void {
    if (!this.selectedArtifacts.find(a => a.id === artifact.id)) {
      this.selectedArtifacts.push(artifact);
    }
    this.filteredArtifacts = [];
    this.artifactSearchQuery = '';
    this.showArtifactDropdown = false;
  }

  removeArtifact(id: string): void {
    this.selectedArtifacts = this.selectedArtifacts.filter(a => a.id !== id);
  }

  goBack(): void {
    this.location.back();
  }

  onSubmit(): void {
    if (!this.workflow || this.workflowForm.invalid || this.isSubmitting) return;
    this.isSubmitting = true;

    const formValues = this.workflowForm.getRawValue();

    const keywords = formValues.keywords
      ? formValues.keywords.split(',').map((k: string) => k.trim()).filter((k: string) => k.length > 0)
      : [];

    const githubRepositories: GitHubRepository[] = (formValues.githubRepositories || []).map((r: any) => ({
      url: r.url,
      description: r.description || '',
      gitHash: r.gitHash || '',
      contents: (r.contents || []).map((c: any) => ({ filename: c.filename, hash: c.hash })),
    }));

    const dto: UpdateWorkflowDTO = {
      keywords,
      githubRepositories,
      artifactIds: this.selectedArtifacts.map(a => a.id),
      submission_comment: formValues.submission_comment,
    };

    this.workflowService.updateWorkflow(this.workflow.id, dto).subscribe({
      next: () => {
        this.updateSuccess = true;
        this.toastr.success(
          'Workflow updated successfully!',
          'Success!',
          { timeOut: 5000 }
        );
        this.isSubmitting = false;
      },
      error: (err) => {
        this.toastr.error(err?.message || 'Failed to update workflow');
        this.isSubmitting = false;
      },
    });
  }
}
