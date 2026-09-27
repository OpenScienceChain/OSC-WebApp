import { Component, Injector, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { WorkflowCardComponent } from '../workflows-preview/workflow-card/workflow-card.component';
import { WorkflowListItem } from '../../models/workflow.model';
import { WorkflowService } from '../../services/workflow.service';
import { map } from 'rxjs/operators';
import { Observable } from 'rxjs';
import { AuthService } from '../../auth/auth.service';
import { DemoService } from '../../guest/demo.service';

@Component({
  selector: 'app-list-workflows',
  standalone: true,
  imports: [CommonModule, WorkflowCardComponent],
  templateUrl: './list-workflows.component.html',
  styleUrls: ['./list-workflows.component.css'],
})
export class ListWorkflowsComponent implements OnInit {
  workflows: WorkflowListItem[] = [];
  isLoading = true;
  errorMessage = '';

  constructor(
    private readonly workflowService: WorkflowService,
    private readonly injector: Injector,
  ) {}

  ngOnInit(): void {
    this.loadWorkflows();
  }

  loadWorkflows(): void {
    this.isLoading = true;
    this.errorMessage = '';
    const source: Observable<WorkflowListItem[]> = this.injector
      .get(AuthService)
      .isAuthenticated()
      ? this.workflowService.getWorkflows()
      : this.injector
          .get(DemoService)
          .listWorkflows()
          .pipe(
            map((items) =>
              items.map((item) => ({
                id: item.id,
                title: item.title,
                description: item.description,
                keywords: [],
                submissionState: item.submissionState,
                submittedAt: new Date(item.submittedAt),
                updatedAt: new Date(item.submittedAt),
              })),
            ),
          );
    source.subscribe({
      next: (workflows) => {
        this.workflows = workflows;
        this.isLoading = false;
      },
      error: () => {
        this.isLoading = false;
        this.errorMessage =
          'Workflows are temporarily unavailable. Check your connection and try again.';
      },
    });
  }
}
