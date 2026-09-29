import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { WorkflowListItem } from '../../../models/workflow.model';

@Component({
  selector: 'app-workflow-card',
  templateUrl: './workflow-card.component.html',
  styleUrls: ['./workflow-card.component.css'],
  standalone: true,
  imports: [CommonModule, RouterModule],
})
export class WorkflowCardComponent {
  @Input() workflow!: WorkflowListItem;
  @Input() showManage = false;
}
