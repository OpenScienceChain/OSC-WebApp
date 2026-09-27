import { Component, Injector, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { WorkflowCardComponent } from './workflow-card/workflow-card.component';
import { WorkflowListItem } from '../../models/workflow.model';
import { WorkflowService } from '../../services/workflow.service';
import { map } from 'rxjs/operators';
import { DemoService } from '../../guest/demo.service';
import { AuthService } from '../../auth/auth.service';

@Component({
  selector: 'app-workflows-preview',
  templateUrl: './workflows-preview.component.html',
  styleUrls: ['./workflows-preview.component.css'],
  standalone: true,
  imports: [CommonModule, RouterModule, WorkflowCardComponent],
})
export class WorkflowsPreviewComponent implements OnInit {
  workflows: WorkflowListItem[] = [];
  isLoading = true;
  hasError = false;

  constructor(
    private readonly workflowService: WorkflowService,
    private readonly injector: Injector,
  ) {}

  ngOnInit(): void {
    this.loadWorkflows();
  }

  loadWorkflows(): void {
    this.isLoading = true;
    this.hasError = false;
    if (!this.injector.get(AuthService).isAuthenticated()) {
      this.injector
        .get(DemoService)
        .listWorkflows()
        .subscribe({
          next: (items) => {
            this.workflows = items.slice(0, 3).map((item) => ({
              id: item.id,
              title: item.title,
              description: item.description,
              keywords: [],
              submissionState: item.submissionState,
              submittedAt: new Date(item.submittedAt),
              updatedAt: new Date(item.submittedAt),
            }));
            this.isLoading = false;
          },
          error: () => {
            this.hasError = true;
            this.isLoading = false;
          },
        });
      return;
    }
    this.workflowService
      .getWorkflows()
      .pipe(map((workflows) => workflows.slice(0, 3)))
      .subscribe({
        next: (workflows) => {
          this.workflows = workflows;
          this.isLoading = false;
        },
        error: () => {
          this.hasError = true;
          this.isLoading = false;
        },
      });
  }
}
