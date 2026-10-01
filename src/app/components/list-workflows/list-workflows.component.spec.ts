import { TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { of } from 'rxjs';
import { AuthService } from '../../auth/auth.service';
import { WorkflowListItem } from '../../models/workflow.model';
import { PublicCatalogService } from '../../guest/public-catalog.service';
import { ListWorkflowsComponent } from './list-workflows.component';

describe('ListWorkflowsComponent', () => {
  const workflows: WorkflowListItem[] = Array.from({ length: 7 }, (_, index) => ({
    id: `workflow-${index + 1}`,
    title: `Workflow ${index + 1}`,
    description: `Description ${index + 1}`,
    keywords: [],
    submissionState: 'SUCCESS',
    submittedAt: new Date('2026-09-28T12:00:00Z'),
    updatedAt: new Date('2026-09-28T12:00:00Z'),
  }));

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ListWorkflowsComponent, RouterTestingModule],
      providers: [
        { provide: AuthService, useValue: { isAuthenticated: () => true } },
        { provide: PublicCatalogService, useValue: { listWorkflows: () => of(workflows) } },
      ],
    }).compileComponents();
  });

  it('shows six workflows on the first page and the remainder on the second', () => {
    const fixture = TestBed.createComponent(ListWorkflowsComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;

    expect(component.totalPages).toBe(2);
    expect(component.paginatedWorkflows.length).toBe(6);
    expect(fixture.nativeElement.querySelectorAll('app-workflow-card').length).toBe(6);

    const pageTwo = fixture.nativeElement.querySelector('[aria-label="Page 2"]');
    pageTwo.click();
    fixture.detectChanges();

    expect(component.currentPage).toBe(2);
    expect(component.paginatedWorkflows.map((item) => item.id)).toEqual([
      'workflow-7',
    ]);
    expect(fixture.nativeElement.querySelectorAll('app-workflow-card').length).toBe(1);
    expect(pageTwo.getAttribute('aria-current')).toBe('page');
  });

  it('does not navigate outside the available page range', () => {
    const fixture = TestBed.createComponent(ListWorkflowsComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;

    component.onPageChange(0);
    component.onPageChange(3);
    component.onPageChange('...');

    expect(component.currentPage).toBe(1);
    expect(component.paginatedWorkflows.length).toBe(6);
  });
});
