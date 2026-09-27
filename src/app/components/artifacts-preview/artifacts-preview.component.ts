import { Component, Injector, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ArtifactCardComponent } from './artifact-card/artifact-card.component';
import { Artifact } from '../../models/artifact.model';
import { ArtifactService } from '../../artifacts/services/artifact.service';
import { map } from 'rxjs/operators';
import { RouterModule } from '@angular/router';
import { DemoService } from '../../guest/demo.service';
import { AuthService } from '../../auth/auth.service';

@Component({
  selector: 'app-artifacts-preview',
  templateUrl: './artifacts-preview.component.html',
  styleUrls: ['./artifacts-preview.component.css'],
  standalone: true,
  imports: [CommonModule, ArtifactCardComponent, RouterModule],
})
export class ArtifactsPreviewComponent implements OnInit {
  artifacts: Artifact[] = [];
  isLoading = true;
  hasError = false;

  constructor(
    private readonly artifactService: ArtifactService,
    private readonly injector: Injector,
  ) {}

  ngOnInit(): void {
    this.loadArtifacts();
  }

  loadArtifacts(): void {
    this.isLoading = true;
    this.hasError = false;
    if (!this.injector.get(AuthService).isAuthenticated()) {
      this.injector
        .get(DemoService)
        .listArtifacts()
        .subscribe({
          next: (items) => {
            this.artifacts = items.slice(0, 3).map((item) => ({
              id: item.id,
              title: item.title,
              description: item.description,
              keywords: item.keywords || [],
              submittedAt: item.submittedAt,
              verified: false,
              lastTimeVerified: null,
              lastTimeUpdated: null,
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
    this.artifactService
      .getArtifacts()
      .pipe(map((artifacts) => artifacts.slice(0, 3)))
      .subscribe({
        next: (artifacts) => {
          this.artifacts = artifacts;
          this.isLoading = false;
        },
        error: () => {
          this.hasError = true;
          this.isLoading = false;
        },
      });
  }
}
