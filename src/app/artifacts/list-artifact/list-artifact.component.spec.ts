import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { of } from 'rxjs';

import { ListArtifactComponent } from './list-artifact.component';
import { ArtifactService } from '../services/artifact.service';
import { Artifact } from '../../models/artifact.model';

// Helper to create mock artifacts
const createMockArtifacts = (count: number): Artifact[] => {
  return Array.from({ length: count }, (_, i) => ({
    id: `${i + 1}`,
    title: `Artifact ${i + 1}`,
    description: `Description for artifact ${i + 1}`,
    keywords: [`keyword${i + 1}`],
    submittedAt: new Date().toISOString(),
    verified: false,
    lastTimeVerified: null,
    lastTimeUpdated: null,
  }));
};

describe('ListArtifactComponent', () => {
  let component: ListArtifactComponent;
  let fixture: ComponentFixture<ListArtifactComponent>;
  let artifactService: ArtifactService;

  const mockArtifacts = createMockArtifacts(20); // Create 20 mock artifacts for testing

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        ListArtifactComponent,
        HttpClientTestingModule,
        RouterTestingModule,
      ],
      providers: [ArtifactService],
    }).compileComponents();

    fixture = TestBed.createComponent(ListArtifactComponent);
    component = fixture.componentInstance;
    artifactService = TestBed.inject(ArtifactService);

    // Spy on the service and return our mock data
    spyOn(artifactService, 'getArtifacts').and.returnValue(of(mockArtifacts));
  });

  it('should create and load initial artifacts', () => {
    fixture.detectChanges(); // Trigger ngOnInit
    expect(component).toBeTruthy();
    expect(artifactService.getArtifacts).toHaveBeenCalled();
    expect(component.allArtifacts.length).toBe(20);
    expect(component.filteredArtifacts.length).toBe(20);
    expect(component.paginatedArtifacts.length).toBe(component.itemsPerPage);
  });

  it('uses the public catalog without an authenticated session', () => {
    fixture.detectChanges();
    expect(artifactService.getArtifacts).toHaveBeenCalled();
    expect(component.allArtifacts.length).toBe(20);
  });

  describe('onSearch', () => {
    beforeEach(() => {
      fixture.detectChanges(); // Load initial data
    });

    it('should filter artifacts by search term', () => {
      component.titleSearchTerm = 'Artifact 1'; // This should match Artifact 1, 10, 11...19
      component.onSearch();
      expect(component.filteredArtifacts.length).toBe(11);
      expect(component.filteredArtifacts.map((item) => item.title)).toContain(
        'Artifact 1',
      );
    });

    it('should reset to full list when search term is empty', () => {
      component.titleSearchTerm = 'Artifact 1';
      component.onSearch();
      expect(component.filteredArtifacts.length).not.toBe(20);

      component.titleSearchTerm = '';
      component.onSearch();
      expect(component.filteredArtifacts.length).toBe(20);
    });

    it('should reset to page 1 after a search', () => {
      component.currentPage = 3;
      component.titleSearchTerm = 'Artifact 2';
      component.onSearch();
      expect(component.currentPage).toBe(1);
    });
  });

  describe('onPageChange', () => {
    beforeEach(() => {
      fixture.detectChanges();
    });

    it('should update current page and refresh view if page is a number', () => {
      spyOn(component, 'refreshView').and.callThrough();
      component.onPageChange(2);
      expect(component.currentPage).toBe(2);
      expect(component.refreshView).toHaveBeenCalled();
    });

    it('should not update page if page is not a number', () => {
      spyOn(component, 'refreshView').and.callThrough();
      component.currentPage = 1;
      component.onPageChange('...');
      expect(component.currentPage).toBe(1);
      expect(component.refreshView).not.toHaveBeenCalled();
    });
  });

  describe('getPages', () => {
    beforeEach(() => {
      // Use 50 artifacts to have 10 pages total
      const fiftyArtifacts = createMockArtifacts(50);
      component.allArtifacts = fiftyArtifacts;
      component.filteredArtifacts = fiftyArtifacts;
      component.itemsPerPage = 5;
      fixture.detectChanges();
    });

    it('should return all pages for a small set', () => {
      component.filteredArtifacts = createMockArtifacts(25); // 5 pages
      component.refreshView();
      expect(component.getPages()).toEqual([1, 2, 3, 4, 5]);
    });

    it('should return an empty array if there is only 1 page', () => {
      component.filteredArtifacts = createMockArtifacts(5);
      component.refreshView();
      expect(component.getPages()).toEqual([]);
    });
  });
});
