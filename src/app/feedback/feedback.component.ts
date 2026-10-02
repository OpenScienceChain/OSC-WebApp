import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';

type AutomationInterest = 'YES' | 'MAYBE' | 'NO' | 'UNSURE';

@Component({
  selector: 'app-feedback',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './feedback.component.html',
  styleUrls: ['./feedback.component.css'],
})
export class FeedbackComponent implements OnInit {
  visualRating: number | null = null;
  automationInterest: AutomationInterest | '' = '';
  overallComment = '';
  submitting = false;
  submitted = false;
  error = '';

  ngOnInit(): void {
    void fetch(this.url('/view'), {
      method: 'POST',
      credentials: 'omit',
    }).catch(() => undefined);
  }

  get valid(): boolean {
    const ratingValid =
      this.visualRating === null ||
      (Number.isInteger(this.visualRating) &&
        this.visualRating >= 1 &&
        this.visualRating <= 5);
    return (
      ratingValid &&
      this.overallComment.length <= 300 &&
      (this.visualRating !== null ||
        !!this.automationInterest ||
        !!this.overallComment.trim())
    );
  }

  async submit(): Promise<void> {
    if (!this.valid || this.submitting || this.submitted) return;
    const comment = this.overallComment.trim();
    const body = {
      ...(this.visualRating !== null
        ? { visualRating: this.visualRating }
        : {}),
      ...(this.automationInterest
        ? { automationInterest: this.automationInterest }
        : {}),
      ...(comment ? { overallComment: comment } : {}),
    };
    this.submitting = true;
    this.error = '';
    try {
      const response = await fetch(this.url(''), {
        method: 'POST',
        credentials: 'omit',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!response.ok) throw new Error('Feedback request failed');
      const result = (await response.json()) as { accepted?: boolean };
      if (result.accepted !== true) {
        this.error = 'Feedback was not confirmed. Please try again.';
        return;
      }
      this.submitted = true;
    } catch {
      this.error = 'Feedback could not be submitted. Please try again.';
    } finally {
      this.submitting = false;
    }
  }

  private url(path: string): string {
    return `/api/v1/demo/ux-feedback${path}`;
  }
}
