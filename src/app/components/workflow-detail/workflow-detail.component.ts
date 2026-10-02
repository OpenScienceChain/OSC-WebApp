import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { Workflow } from '../../models/workflow.model';
import { WorkflowService } from '../../services/workflow.service';

@Component({
  selector: 'app-workflow-detail',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './workflow-detail.component.html',
  styleUrls: ['./workflow-detail.component.css'],
})
export class WorkflowDetailComponent implements OnInit {
  workflow?: Workflow;
  isLoading = true;
  errorMessage = '';
  workflowId = '';
  expandedRepos = new Set<number>();
  idCopied = false;

  constructor(
    private readonly route: ActivatedRoute,
    private readonly workflowService: WorkflowService,
  ) {}

  ngOnInit(): void {
    this.workflowId = this.route.snapshot.paramMap.get('id') ?? '';
    this.loadWorkflow();
  }

  loadWorkflow(): void {
    this.isLoading = true;
    this.errorMessage = '';
    this.workflow = undefined;

    if (!this.workflowId) {
      this.isLoading = false;
      this.errorMessage = 'This workflow record does not have a valid ID.';
      return;
    }

    this.workflowService.getWorkflow(this.workflowId).subscribe({
      next: (workflow) => {
        this.workflow = workflow || undefined;
        this.isLoading = false;
        if (!workflow) {
          this.errorMessage = 'This workflow record could not be found.';
        }
      },
      error: () => {
        this.isLoading = false;
        this.errorMessage =
          'We could not load this workflow record. The catalog may be temporarily unavailable.';
      },
    });
  }

  toggleContents(repoIndex: number): void {
    if (this.expandedRepos.has(repoIndex)) {
      this.expandedRepos.delete(repoIndex);
    } else {
      this.expandedRepos.add(repoIndex);
    }
  }

  isExpanded(repoIndex: number): boolean {
    return this.expandedRepos.has(repoIndex);
  }

  isFolder(filename: string): boolean {
    return filename.endsWith('/');
  }

  copyId(): void {
    if (!this.workflow) return;
    navigator.clipboard.writeText(this.recordId()).then(() => {
      this.idCopied = true;
      setTimeout(() => (this.idCopied = false), 2000);
    });
  }

  recordId(): string {
    if (!this.workflow) return '';
    return this.workflow.id.startsWith('workflow-')
      ? `osc-is-${this.workflow.id}`
      : `osc-is-workflow-${this.workflow.id}`;
  }
}
