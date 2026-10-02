import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';
import { ArtifactsPreviewComponent } from '../components/artifacts-preview/artifacts-preview.component';
import { WorkflowsPreviewComponent } from '../components/workflows-preview/workflows-preview.component';
import { DemoService } from '../guest/demo.service';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    ArtifactsPreviewComponent,
    WorkflowsPreviewComponent,
  ],
  templateUrl: './home.component.html',
  styleUrl: './home.component.css',
})
export class HomeComponent {
  constructor(public readonly demo: DemoService) {}
}
