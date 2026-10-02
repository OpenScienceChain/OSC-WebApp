import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ArtifactCardComponent } from './artifact-card/artifact-card.component';
import { Artifact } from '../../models/artifact.model';
import { PublicCatalogService } from '../../guest/public-catalog.service';
import { RouterModule } from '@angular/router';

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

  constructor(private readonly catalog: PublicCatalogService) {}

  ngOnInit(): void {
    this.loadArtifacts();
  }

  loadArtifacts(): void {
    this.isLoading = true;
    this.hasError = false;
    this.catalog.listArtifacts().subscribe({
      next: (artifacts) => {
        this.artifacts = [...artifacts]
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
