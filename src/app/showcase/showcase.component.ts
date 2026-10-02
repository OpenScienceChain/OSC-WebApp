import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { RouterModule } from '@angular/router';
import {
  ShowcaseArtifact,
  ShowcaseCatalog,
  ShowcaseHistory,
} from './showcase.models';
import { ShowcaseService } from './showcase.service';
import { safeExternalUrl } from '../shared/safe-external-url';

@Component({
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './showcase.component.html',
  styleUrl: './showcase.component.css',
})
export class ShowcaseComponent implements OnInit {
  readonly safeExternalUrl = safeExternalUrl;
  examples: ShowcaseCatalog[] = [];
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
    this.showcase.examples().subscribe({
      next: ({ examples }) => {
        this.examples = examples;
        this.loading = false;
        if (examples.length) this.selectExample(examples[0]);
      },
      error: () => {
        this.loading = false;
        this.error = 'The research examples are temporarily unavailable.';
      },
    });
  }

  selectExample(example: ShowcaseCatalog): void {
    this.catalog = example;
    this.selected = this.orderedArtifacts[0] || null;
    this.artifactHistory = null;
    this.workflowHistory = null;
    this.historyError = '';
    this.workflowHistoryError = '';
    this.showHistory = false;
    this.workflowHistoryVisible = false;
  }

  select(artifact: ShowcaseArtifact): void {
    this.selected = artifact;
    this.artifactHistory = null;
    this.historyError = '';
    this.showHistory = false;
  }

  get fileCount(): number {
    return (
      this.catalog?.artifacts.reduce(
        (total, item) => total + item.manifest.length,
        0,
      ) || 0
    );
  }

  get maxArtifactFiles(): number {
    return Math.max(
      1,
      ...(this.catalog?.artifacts.map((item) => item.manifest.length) || []),
    );
  }

  get orderedArtifacts(): ShowcaseArtifact[] {
    return [...(this.catalog?.artifacts || [])].sort((left, right) => {
      if (this.catalog?.key === 'magnetic-arch') {
        const configurationOrder = ['S0', 'S1', 'D0', 'DA', 'DB'];
        const codeIndex = (artifact: ShowcaseArtifact) => {
          const index = configurationOrder.findIndex((code) =>
            artifact.title.startsWith(`${code} `),
          );
          return index === -1 ? configurationOrder.length : index;
        };
        return codeIndex(left) - codeIndex(right);
      }
      const priority = (artifact: ShowcaseArtifact) =>
        artifact.manifest.length > 0 &&
        artifact.manifest.every((file) =>
          file.filename.toLowerCase().endsWith('.txt'),
        )
          ? 1
          : 0;
      return (
        priority(left) - priority(right) ||
        left.title.localeCompare(right.title)
      );
    });
  }

  barWidth(item: ShowcaseArtifact): string {
    return `${Math.max(8, (item.manifest.length / this.maxArtifactFiles) * 100)}%`;
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
    const key = this.catalog?.key;
    if (!key) return;
    this.showcase.exampleHistory(key, 'artifacts', selectedId).subscribe({
      next: (history) => {
        if (this.catalog?.key === key && this.selected?.id === selectedId)
          this.artifactHistory = history;
        this.historyLoading = false;
      },
      error: () => {
        this.historyLoading = false;
        if (this.catalog?.key === key && this.selected?.id === selectedId) {
          this.historyError = 'Fabric history is unavailable. Try again later.';
        }
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
    const key = this.catalog?.key;
    const workflowId = this.workflow.id;
    if (!key) return;
    this.showcase.exampleHistory(key, 'workflows', workflowId).subscribe({
      next: (history) => {
        if (this.catalog?.key === key && this.workflow?.id === workflowId)
          this.workflowHistory = history;
        this.workflowHistoryLoading = false;
      },
      error: () => {
        this.workflowHistoryLoading = false;
        if (this.catalog?.key === key && this.workflow?.id === workflowId) {
          this.workflowHistoryError = 'Fabric workflow history is unavailable.';
        }
      },
    });
  }

  trackByExample(_index: number, example: ShowcaseCatalog): string {
    return example.key;
  }

  trackByArtifact(_index: number, artifact: ShowcaseArtifact): string {
    return artifact.id;
  }

  trackByFile(_index: number, measurement: { filename: string }): string {
    return measurement.filename;
  }
}
