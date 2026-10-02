import { UxAnalyticsService } from './ux-analytics.service';

export class FormAnalytics {
  private started = false;
  private validationReported = false;

  constructor(
    private readonly analytics: UxAnalyticsService,
    private readonly route: string,
  ) {}

  start(): void {
    if (this.started) return;
    this.started = true;
    this.analytics.track('FORM_START', this.route);
  }

  markTouched(field: string, touched: Set<string>, invalid: boolean): void {
    this.start();
    if (!touched.has(field) && invalid) this.validationError();
    touched.add(field);
  }

  validationError(): void {
    if (this.validationReported) return;
    this.validationReported = true;
    this.analytics.track('VALIDATION_ERROR', this.route);
  }

  attempt(): void {
    this.start();
    this.analytics.track('SUBMISSION_ATTEMPT', this.route);
  }

  accepted(kind: 'ARTIFACT_SUBMITTED' | 'WORKFLOW_SUBMITTED'): void {
    this.analytics.track(kind, this.route);
  }
}
