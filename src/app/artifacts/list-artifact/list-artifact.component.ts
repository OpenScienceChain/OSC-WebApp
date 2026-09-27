import { Component, Injector, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ArtifactService } from '../services/artifact.service';
import { Artifact } from '../../models/artifact.model';
import { ArtifactCardComponent } from '../../components/artifacts-preview/artifact-card/artifact-card.component';
import { FormsModule } from '@angular/forms';
import { map } from 'rxjs/operators';
import { Observable } from 'rxjs';
import { AuthService } from '../../auth/auth.service';
import { DemoService } from '../../guest/demo.service';

@Component({
  selector: 'app-list-artifact',
  standalone: true,
  imports: [CommonModule, ArtifactCardComponent, FormsModule],
  templateUrl: './list-artifact.component.html',
  styleUrls: ['./list-artifact.component.css'],
})
export class ListArtifactComponent implements OnInit {
  isLoading = true;
  errorMessage = '';
  allArtifacts: Artifact[] = [];
  filteredArtifacts: Artifact[] = [];
  paginatedArtifacts: Artifact[] = [];
  titleSearchTerm = '';
  keywordSearchTerm = '';
  searchOperator = 'OR';

  // Pagination
  currentPage = 1;
  itemsPerPage = 6;

  constructor(
    private readonly artifactService: ArtifactService,
    private readonly injector: Injector,
  ) {}

  ngOnInit(): void {
    this.loadArtifacts();
  }

  loadArtifacts(): void {
    this.isLoading = true;
    this.errorMessage = '';
    const source: Observable<Artifact[]> = this.injector
      .get(AuthService)
      .isAuthenticated()
      ? this.artifactService.getArtifacts()
      : this.injector
          .get(DemoService)
          .listArtifacts()
          .pipe(
            map((items) =>
              items.map((item) => ({
                id: item.id,
                title: item.title,
                description: item.description,
                keywords: item.keywords || [],
                submittedAt: item.submittedAt,
                verified: false,
                submissionState: item.submissionState,
                lastTimeVerified: null,
                lastTimeUpdated: null,
              })),
            ),
          );
    source.subscribe({
      next: (artifacts) => {
        this.allArtifacts = artifacts;
        this.filteredArtifacts = artifacts;
        this.isLoading = false;
        this.refreshView();
      },
      error: () => {
        this.isLoading = false;
        this.errorMessage =
          'Artifacts are temporarily unavailable. Check your connection and try again.';
      },
    });
  }

  onSearch(): void {
    const titleTerm = this.titleSearchTerm.toLowerCase().trim();
    const searchKeywords = this.keywordSearchTerm
      .split(',')
      .map((k) => k.trim().toLowerCase())
      .filter(Boolean);

    const keywordTermIsPresent = searchKeywords.length > 0;

    if (!titleTerm && !keywordTermIsPresent) {
      this.filteredArtifacts = this.allArtifacts;
    } else {
      this.filteredArtifacts = this.allArtifacts.filter((artifact) => {
        const titleMatch = titleTerm
          ? artifact.title.toLowerCase().includes(titleTerm)
          : false;

        const artifactKeywordsLower = artifact.keywords
          ? artifact.keywords.map((k) => k.toLowerCase())
          : [];
        const keywordMatch =
          keywordTermIsPresent && artifact.keywords
            ? searchKeywords.every((searchKeyword) =>
                artifactKeywordsLower.includes(searchKeyword),
              )
            : false;

        if (titleTerm && keywordTermIsPresent) {
          if (this.searchOperator === 'AND') {
            return titleMatch && keywordMatch;
          }
          return titleMatch || keywordMatch;
        } else if (titleTerm) {
          return titleMatch;
        } else {
          return keywordMatch;
        }
      });
    }

    this.currentPage = 1;
    this.refreshView();
  }

  onPageChange(page: number | string): void {
    if (typeof page === 'number') {
      this.currentPage = page;
      this.refreshView();
    }
  }

  refreshView(): void {
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    this.paginatedArtifacts = this.filteredArtifacts.slice(
      startIndex,
      startIndex + this.itemsPerPage,
    );
  }

  get totalPages(): number {
    return Math.ceil(this.filteredArtifacts.length / this.itemsPerPage);
  }

  getPages(): (number | string)[] {
    const total = this.totalPages;
    const current = this.currentPage;
    const delta = 2;
    const left = current - delta;
    const right = current + delta + 1;
    const result: (number | string)[] = [];
    const range: number[] = [];

    if (total <= 1) {
      return [];
    }

    for (let i = 1; i <= total; i++) {
      if (i === 1 || i === total || (i >= left && i < right)) {
        range.push(i);
      }
    }

    let l: number | null = null;
    for (const i of range) {
      if (l) {
        if (i - l === 2) {
          result.push(l + 1);
        } else if (i - l > 2) {
          result.push('...');
        }
      }
      result.push(i);
      l = i;
    }
    return result;
  }
}
