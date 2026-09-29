import { ComponentFixture, TestBed } from '@angular/core/testing';
import { WorkflowCardComponent } from './workflow-card.component';
import { WorkflowListItem } from '../../../models/workflow.model';
import { By } from '@angular/platform-browser';
import { CommonModule } from '@angular/common';
import { RouterTestingModule } from '@angular/router/testing';

describe('WorkflowCardComponent', () => {
  let component: WorkflowCardComponent;
  let fixture: ComponentFixture<WorkflowCardComponent>;

  const testWorkflow: WorkflowListItem = {
    id: '1',
    title: 'Test Workflow',
    description: 'This is a test description for the workflow',
    keywords: ['test', 'workflow'],
    submissionState: 'PENDING',
    submittedAt: new Date('2023-01-15'),
    updatedAt: null as any,
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CommonModule, RouterTestingModule, WorkflowCardComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(WorkflowCardComponent);
    component = fixture.componentInstance;
    component.workflow = testWorkflow;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should receive the workflow input correctly', () => {
    expect(component.workflow).toEqual(testWorkflow);
  });

  it('should display the workflow title', () => {
    const textContent = fixture.nativeElement.textContent;
    expect(textContent).toContain('Test Workflow');
  });

  it('should display the workflow description', () => {
    const textContent = fixture.nativeElement.textContent;
    expect(textContent).toContain('This is a test description');
  });

  it('should display the last activity', () => {
    const textContent = fixture.nativeElement.textContent;
    expect(textContent).toContain('Last activity');
  });

  it('should have a workflow detail link', () => {
    const viewButton = fixture.debugElement.query(By.css('.card-actions a'));
    expect(viewButton).toBeTruthy();
    expect(viewButton.nativeElement.textContent).toContain('View workflow');
    expect(viewButton.attributes['href']).toBe('/workflows/1');
  });

  it('shows a management link only when requested by the list', () => {
    expect(fixture.debugElement.query(By.css('.manage-action'))).toBeNull();
    component.showManage = true;
    fixture.detectChanges();
    const manageLink = fixture.debugElement.query(By.css('.manage-action'));
    expect(manageLink.attributes['href']).toBe('/update-workflow/1');
  });

  it('should use semantic card structure', () => {
    const cardElement = fixture.debugElement.query(
      By.css('article.catalog-card'),
    );
    expect(cardElement).toBeTruthy();
    const headerElement = fixture.debugElement.query(By.css('article header'));
    expect(headerElement).toBeTruthy();
    const bodyElement = fixture.debugElement.query(By.css('.card-body'));
    expect(bodyElement).toBeTruthy();
  });
});
