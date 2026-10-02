import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
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

  constructor(private readonly http: HttpClient) {}

  ngOnInit(): void {
    this.http
      .post(this.url('/view'), null)
      .subscribe({ error: () => undefined });
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

  submit(): void {
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
    this.http.post<{ accepted: boolean }>(this.url(''), body).subscribe({
      next: (result) => {
        this.submitting = false;
        if (result.accepted !== true) {
          this.error = 'Feedback was not confirmed. Please try again.';
          return;
        }
        this.submitted = true;
      },
      error: () => {
        this.submitting = false;
        this.error = 'Feedback could not be submitted. Please try again.';
      },
    });
  }

  private url(path: string): string {
    return `/api/v1/demo/ux-feedback${path}`;
  }
}
