import { of } from 'rxjs';
import { GuestArtifactFormComponent } from './guest-artifact-form.component';
import { GuestWorkflowFormComponent } from './guest-workflow-form.component';
import { DemoCatalogArtifact } from './demo.models';

describe('Guest portal form boundaries', () => {
  it('shows the original metadata format checks on blur', () => {
    const form = new GuestArtifactFormComponent(
      { snapshot: { paramMap: { get: () => null } } } as any,
      {} as any,
      {} as any,
      {} as any,
    );
    form.keywords = 'science,,analysis';
    expect(form.fieldError('keywords')).toContain('empty entries');
    form.links = 'http://example.com';
    expect(form.fieldError('links')).toContain('HTTPS');
    form.dois = 'invalid-doi';
    expect(form.fieldError('dois')).toContain('10.xxxx');
    form.otherAgency = 'A, B';
    form.nsf = form.nih = form.noaa = form.nasa = true;
    expect(form.fieldError('otherAgency')).toContain('at most 5');
    form.markTouched('keywords');
    expect(form.touched.has('keywords')).toBeTrue();
  });

  it('lists only confirmed artifacts from the selected organization', () => {
    const organization = 'neuroscience-gateway' as const;
    const artifact = (id: string, organizationSlug: 'neuroscience-gateway' | 'citizen-science', submissionState: string): DemoCatalogArtifact => ({
      id, organizationSlug, submissionState, title: id,
      description: 'Synthetic test artifact', organization: organizationSlug,
      contributorAlias: 'test', researchContext: null, verified: true,
      submittedAt: new Date().toISOString(),
    });
    const records = [
      artifact('same-org', organization, 'SUCCESS'),
      artifact('pending', organization, 'PENDING'),
      artifact('other-org', 'citizen-science', 'SUCCESS'),
    ];
    const demo = {
      session: { organization },
      listArtifacts: jasmine.createSpy('listArtifacts').and.returnValue(of(records)),
    };
    const form = new GuestWorkflowFormComponent(demo as any, {} as any, {} as any);
    form.loadArtifacts();
    expect(demo.listArtifacts).toHaveBeenCalledWith(organization);
    expect(form.matchingArtifacts.map((item) => item.id)).toEqual(['same-org']);
    form.selectArtifact('same-org');
    expect(form.selectedArtifacts.map((item) => item.id)).toEqual(['same-org']);
  });
});
