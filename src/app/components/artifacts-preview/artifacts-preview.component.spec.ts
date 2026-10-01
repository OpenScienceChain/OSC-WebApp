import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { Component, Input } from '@angular/core';
import { By } from '@angular/platform-browser';
import { RouterTestingModule } from '@angular/router/testing';

import { ArtifactsPreviewComponent } from './artifacts-preview.component';
import { PublicCatalogService } from '../../guest/public-catalog.service';
import { Artifact } from '../../models/artifact.model';
import { AuthService } from '../../auth/auth.service';

// Mock ArtifactCardComponent
@Component({
  selector: 'app-artifact-card',
  template: '<div></div>',
  standalone: true,
})
class MockArtifactCardComponent {
  @Input() artifact!: Artifact;
}

// Mock Artifact Data
const mockArtifacts: Artifact[] = [
  {
    id: '1',
    title: 'Test Artifact 1',
    description: 'Desc 1',
    keywords: [],
    submittedAt: new Date().toISOString(),
    verified: false,
    lastTimeVerified: null,
    lastTimeUpdated: null,
  },
  {
    id: '2',
    title: 'Test Artifact 2',
    description: 'Desc 2',
    keywords: [],
    submittedAt: new Date().toISOString(),
    verified: true,
    lastTimeVerified: new Date().toISOString(),
    lastTimeUpdated: null,
  },
];

describe('ArtifactsPreviewComponent', () => {
  let component: ArtifactsPreviewComponent;
  let fixture: ComponentFixture<ArtifactsPreviewComponent>;
  let mockCatalog: jasmine.SpyObj<PublicCatalogService>;

  beforeEach(async () => {
    // Create a spy object for the service
    mockCatalog = jasmine.createSpyObj('PublicCatalogService', [
      'listArtifacts',
    ]);
    mockCatalog.listArtifacts.and.returnValue(of(mockArtifacts));

    await TestBed.configureTestingModule({
      imports: [
        ArtifactsPreviewComponent,
        MockArtifactCardComponent,
        RouterTestingModule,
      ],
      providers: [
        { provide: PublicCatalogService, useValue: mockCatalog },
        { provide: AuthService, useValue: { isAuthenticated: () => true } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ArtifactsPreviewComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should fetch and display a preview of artifacts on init', () => {
    expect(mockCatalog.listArtifacts).toHaveBeenCalled();
    expect(component.artifacts.length).toEqual(2);
    expect(component.artifacts[0].title).toEqual('Test Artifact 1');
  });

  it('should render the correct number of artifact cards', () => {
    const cardElements = fixture.debugElement.queryAll(
      By.css('app-artifact-card'),
    );
    expect(cardElements.length).toEqual(2);
  });

  it('should display the section title and catalog link', () => {
    const titleEl = fixture.debugElement.query(
      By.css('.preview-heading h3'),
    ).nativeElement;
    const viewAllEl = fixture.debugElement.query(
      By.css('.preview-heading a'),
    ).nativeElement;

    expect(titleEl.textContent).toContain('Artifacts');
    expect(viewAllEl.textContent).toContain('View all artifacts');
    expect(viewAllEl.getAttribute('href')).toBe('/list-artifacts');
  });
});
