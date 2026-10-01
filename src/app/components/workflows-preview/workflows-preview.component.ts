import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { WorkflowCardComponent } from './workflow-card/workflow-card.component';
import { WorkflowListItem } from '../../models/workflow.model';
import { PublicCatalogService } from '../../guest/public-catalog.service';

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

  constructor(private readonly catalog: PublicCatalogService) {}

  ngOnInit(): void {
    this.loadWorkflows();
  }

  loadWorkflows(): void {
    this.isLoading = true;
    this.hasError = false;
    this.catalog.listWorkflows().subscribe({
      next: (workflows) => {
        this.workflows = [...workflows]
          .sort(
            (a, b) =>
              new Date(b.submittedAt).getTime() -
              new Date(a.submittedAt).getTime(),
          )
          .slice(0, 3);
        this.isLoading = false;
      },
      error: () => {
        this.hasError = true;
        this.isLoading = false;
      },
    });
  }
}
