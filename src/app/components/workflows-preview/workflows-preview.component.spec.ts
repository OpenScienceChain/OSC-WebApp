import { ComponentFixture, TestBed } from '@angular/core/testing';
import { WorkflowsPreviewComponent } from './workflows-preview.component';
import { PublicCatalogService } from '../../guest/public-catalog.service';
import { WorkflowListItem } from '../../models/workflow.model';
import { of } from 'rxjs';
import { Component, Input } from '@angular/core';
import { By } from '@angular/platform-browser';
import { CommonModule } from '@angular/common';
import { RouterTestingModule } from '@angular/router/testing';
import { AuthService } from '../../auth/auth.service';

@Component({
  selector: 'app-workflow-card',
  template: '<div>{{workflow.title}}</div>',
  standalone: true,
})
class MockWorkflowCardComponent {
  @Input() workflow!: WorkflowListItem;
}

const mockWorkflows: WorkflowListItem[] = [
  {
    id: '1',
    title: 'Test Workflow 1',
    description: 'Description 1',
    keywords: ['test'],
    submissionState: 'PENDING',
    submittedAt: new Date(),
    updatedAt: null as any,
  },
  {
    id: '2',
    title: 'Test Workflow 2',
    description: 'Description 2',
    keywords: ['test'],
    submissionState: 'SUCCESS',
    submittedAt: new Date(),
    updatedAt: null as any,
  },
];

class MockCatalogService {
  listWorkflows() {
    return of(mockWorkflows);
  }
}

describe('WorkflowsPreviewComponent', () => {
  let component: WorkflowsPreviewComponent;
  let fixture: ComponentFixture<WorkflowsPreviewComponent>;
  let catalog: PublicCatalogService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        CommonModule,
        RouterTestingModule,
        WorkflowsPreviewComponent,
        MockWorkflowCardComponent,
      ],
      providers: [
        { provide: PublicCatalogService, useClass: MockCatalogService },
        { provide: AuthService, useValue: { isAuthenticated: () => true } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(WorkflowsPreviewComponent);
    component = fixture.componentInstance;
    catalog = TestBed.inject(PublicCatalogService);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load workflows on init', () => {
    expect(component.workflows.length).toBe(2);
    expect(component.workflows).toEqual(mockWorkflows);
  });

  it('should display the section title', () => {
    const titleElement = fixture.debugElement.query(
      By.css('.preview-heading h3'),
    );
    expect(titleElement).toBeTruthy();
    expect(titleElement.nativeElement.textContent).toContain('Workflows');
  });

  it('should display a link to the workflow catalog', () => {
    const linkElement = fixture.debugElement.query(
      By.css('.preview-heading a'),
    );
    expect(linkElement).toBeTruthy();
    expect(linkElement.nativeElement.textContent).toContain(
      'View all workflows',
    );
    expect(linkElement.attributes['href']).toBe('/list-workflows');
  });

  it('should render workflow cards for each workflow', () => {
    const cardElements = fixture.debugElement.queryAll(
      By.css('app-workflow-card'),
    );
    expect(cardElements.length).toBe(2);
  });

  it('should contain the workflow titles in the rendered output', () => {
    const textContent = fixture.nativeElement.textContent;
    expect(textContent).toContain('Test Workflow 1');
    expect(textContent).toContain('Test Workflow 2');
  });

  it('should call listWorkflows from the public catalog', () => {
    const spy = spyOn(catalog, 'listWorkflows').and.callThrough();
    component.ngOnInit();
    expect(spy).toHaveBeenCalled();
  });
});
