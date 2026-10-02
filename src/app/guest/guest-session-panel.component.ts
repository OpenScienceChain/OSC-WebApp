import { CommonModule } from '@angular/common';
import { Component, EventEmitter, OnInit, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DemoOrganizationSlug, DemoStatus } from './demo.models';
import { DemoService } from './demo.service';

@Component({
  selector: 'app-guest-session-panel',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <section class="session-panel" aria-labelledby="session-heading">
      <h2 id="session-heading">Contribute as a guest</h2>
      <p>
        Choose the organization for this contribution. Your session is limited
        to that organization and expires within 30 minutes.
      </p>
      <p *ngIf="error" role="alert" class="text-danger">{{ error }}</p>
      <label for="session-organization">Organization</label>
      <select
        id="session-organization"
        [(ngModel)]="organization"
        [disabled]="busy"
      >
        <option value="neuroscience-gateway">Neuroscience Gateway</option>
        <option value="citizen-science">Citizen Science</option>
      </select>
      <button
        type="button"
        (click)="start()"
        [disabled]="busy || status?.state !== 'OPEN'"
      >
        {{ busy ? 'Starting...' : 'Start session' }}
      </button>
      <p *ngIf="status && status.state !== 'OPEN'" role="status">
        Contributions are unavailable while the current run is
        {{ status.state | lowercase }}.
      </p>
    </section>
  `,
  styles: [
    `
      .session-panel {
        width: min(80%, 1050px);
        margin: 0 auto 1.25rem;
        padding: 1rem;
        border: 1px solid #b7c7cf;
        background: #f3f8fa;
      }
      .session-panel h2 {
        font-size: 1.25rem;
        margin: 0 0 0.5rem;
      }
      .session-panel select {
        display: block;
        width: min(100%, 20rem);
        padding: 0.55rem;
        margin: 0.3rem 0 0.8rem;
      }
      .session-panel button {
        background: #086f69;
        color: #fff;
        border: 0;
        border-radius: 4px;
        padding: 0.6rem 1rem;
        font-weight: 700;
      }
      .session-panel button:disabled {
        opacity: 0.6;
      }
      @media (max-width: 600px) {
        .session-panel {
          width: calc(100% - 2rem);
        }
      }
    `,
  ],
})
export class GuestSessionPanelComponent implements OnInit {
  @Output() started = new EventEmitter<void>();
  organization: DemoOrganizationSlug = 'neuroscience-gateway';
  status?: DemoStatus;
  busy = false;
  error = '';

  constructor(private readonly demo: DemoService) {}

  ngOnInit(): void {
    this.demo.getStatus().subscribe({
      next: (status) => (this.status = status),
      error: () => (this.error = 'Contribution status is unavailable.'),
    });
  }

  start(): void {
    if (this.busy || this.status?.state !== 'OPEN') return;
    this.busy = true;
    this.error = '';
    this.demo.createSession(this.organization).subscribe({
      next: () => {
        this.busy = false;
        this.started.emit();
      },
      error: (response) => {
        this.busy = false;
        this.error =
          response.status === 429
            ? 'This browser has reached its session limit.'
            : 'A session could not be started. Please try again.';
      },
    });
  }
}
