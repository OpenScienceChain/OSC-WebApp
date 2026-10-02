import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Artifact } from '../../../models/artifact.model';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-artifact-card',
  templateUrl: './artifact-card.component.html',
  styleUrls: ['./artifact-card.component.css'],
  standalone: true,
  imports: [CommonModule, RouterModule],
})
export class ArtifactCardComponent {
  @Input() artifact!: Artifact;
}
