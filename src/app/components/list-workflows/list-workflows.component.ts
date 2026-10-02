import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { WorkflowCardComponent } from '../workflows-preview/workflow-card/workflow-card.component';
import { WorkflowListItem } from '../../models/workflow.model';
import { PublicCatalogService } from '../../guest/public-catalog.service';

@Component({
  selector: 'app-list-workflows',
  standalone: true,
  imports: [CommonModule, WorkflowCardComponent],
  templateUrl: './list-workflows.component.html',
  styleUrls: ['./list-workflows.component.css'],
})
export class ListWorkflowsComponent implements OnInit {
  workflows: WorkflowListItem[] = [];
  paginatedWorkflows: WorkflowListItem[] = [];
  isLoading = true;
  errorMessage = '';
  currentPage = 1;
  readonly itemsPerPage = 6;

  constructor(private readonly catalog: PublicCatalogService) {}

  ngOnInit(): void {
    this.loadWorkflows();
  }

  loadWorkflows(): void {
    this.isLoading = true;
    this.errorMessage = '';
    this.catalog.listWorkflows().subscribe({
      next: (workflows) => {
        this.workflows = [...workflows].sort(
          (a, b) =>
            new Date(b.submittedAt).getTime() -
            new Date(a.submittedAt).getTime(),
        );
        this.currentPage = 1;
        this.refreshView();
        this.isLoading = false;
      },
      error: () => {
        this.isLoading = false;
        this.errorMessage =
          'Workflows are temporarily unavailable. Check your connection and try again.';
      },
    });
  }

  onPageChange(page: number | string): void {
    if (typeof page !== 'number' || page < 1 || page > this.totalPages) return;
    this.currentPage = page;
    this.refreshView();
  }

  private refreshView(): void {
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    this.paginatedWorkflows = this.workflows.slice(
      startIndex,
      startIndex + this.itemsPerPage,
    );
  }

  get totalPages(): number {
    return Math.ceil(this.workflows.length / this.itemsPerPage);
  }

  getPages(): (number | string)[] {
    const total = this.totalPages;
    const left = this.currentPage - 2;
    const right = this.currentPage + 3;
    const result: (number | string)[] = [];
    const range: number[] = [];

    if (total <= 1) return [];

    for (let i = 1; i <= total; i++) {
      if (i === 1 || i === total || (i >= left && i < right)) range.push(i);
    }

    let previous: number | null = null;
    for (const page of range) {
      if (previous !== null) {
        if (page - previous === 2) result.push(previous + 1);
        else if (page - previous > 2) result.push('...');
      }
      result.push(page);
      previous = page;
    }
    return result;
  }
}
