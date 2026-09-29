import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { RouterModule } from '@angular/router';
import {
  ShowcaseArtifact,
  ShowcaseCatalog,
  ShowcaseHistory,
} from './showcase.models';
import { ShowcaseService } from './showcase.service';

@Component({
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './showcase.component.html',
  styleUrl: './showcase.component.css',
})
export class ShowcaseComponent implements OnInit {
  catalog: ShowcaseCatalog | null = null;
  selected: ShowcaseArtifact | null = null;
  artifactHistory: ShowcaseHistory | null = null;
  workflowHistory: ShowcaseHistory | null = null;
  loading = true;
  historyLoading = false;
  workflowHistoryLoading = false;
  error = '';
  historyError = '';
  workflowHistoryError = '';
  showHistory = false;
  workflowHistoryVisible = false;

  constructor(private readonly showcase: ShowcaseService) {}

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading = true;
    this.error = '';
    this.showcase.catalog().subscribe({
      next: (catalog) => {
        this.catalog = catalog;
        this.loading = false;
        if (catalog.artifacts.length) this.select(catalog.artifacts[0]);
      },
      error: () => {
        this.loading = false;
        this.error = 'The research example is temporarily unavailable.';
      },
    });
  }

  select(artifact: ShowcaseArtifact): void {
    this.selected = artifact;
    this.artifactHistory = null;
    this.historyError = '';
    this.showHistory = false;
  }

  get measurementCount(): number {
    return (
      this.catalog?.artifacts.reduce(
        (total, item) => total + item.manifest.length,
        0,
      ) || 0
    );
  }

  get workflow() {
    return this.catalog?.workflows[0] || null;
  }

  toggleHistory(): void {
    this.showHistory = !this.showHistory;
    if (
      !this.showHistory ||
      !this.selected?.blockchainTxId ||
      this.artifactHistory
    )
      return;
    this.historyLoading = true;
    this.historyError = '';
    const selectedId = this.selected.id;
    this.showcase.history('artifacts', selectedId).subscribe({
      next: (history) => {
        if (this.selected?.id === selectedId) this.artifactHistory = history;
        this.historyLoading = false;
      },
      error: () => {
        this.historyLoading = false;
        this.historyError = 'Fabric history is unavailable. Try again later.';
      },
    });
  }

  showWorkflowHistory(): void {
    this.workflowHistoryVisible = !this.workflowHistoryVisible;
    if (
      !this.workflowHistoryVisible ||
      !this.workflow?.blockchainTxId ||
      this.workflowHistory
    )
      return;
    this.workflowHistoryLoading = true;
    this.showcase.history('workflows', this.workflow.id).subscribe({
      next: (history) => {
        this.workflowHistory = history;
        this.workflowHistoryLoading = false;
      },
      error: () => {
        this.workflowHistoryLoading = false;
        this.workflowHistoryError = 'Fabric workflow history is unavailable.';
      },
    });
  }

  trackByArtifact(_index: number, artifact: ShowcaseArtifact): string {
    return artifact.id;
  }

  trackByFile(_index: number, measurement: { filename: string }): string {
    return measurement.filename;
  }
}
