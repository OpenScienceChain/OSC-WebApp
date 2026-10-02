/// <reference types="cypress" />

export const demoArtifacts = [
  {
    id: 'artifact-nsg-001',
    title: 'Neuroscience image segmentation dataset',
    description:
      'Curated imaging data and metadata used to validate a reproducible segmentation workflow.',
    keywords: ['neuroscience', 'imaging', 'segmentation'],
    submittedAt: '2026-07-28T12:00:00.000Z',
    verified: true,
    lastTimeVerified: '2026-07-30T16:15:00.000Z',
    lastTimeUpdated: null,
  },
  {
    id: 'artifact-cs-001',
    title: 'Citizen Science coastal observations',
    description:
      'A community-contributed collection of coastal observations with collection context.',
    keywords: ['citizen-science', 'coastal', 'observations'],
    submittedAt: '2026-07-27T12:00:00.000Z',
    verified: false,
    lastTimeVerified: null,
    lastTimeUpdated: '2026-07-30T12:00:00.000Z',
  },
];

export const demoArtifactDetail = {
  ...demoArtifacts[0],
  links: ['https://www.nsgportal.org/'],
  dois: [],
  fundingAgencies: ['National Science Foundation'],
  acknowledgements:
    'Prepared by the Neuroscience Gateway community for reproducibility testing.',
  submission_comment:
    'Second release adds reference labels and a machine-readable data dictionary.',
  footprint: 'b731d8f7cc8d9463a5ab13c6bbef70f5103e398ad001aaf52c91a2fb94d6397e',
  manifest: [
    {
      filename: 'images/sub-001_T1w.nii.gz',
      hash: '73ebfe3d589e0ae1ad76e76f83c4f55d2c8d3ad4b94df4ad71ab30a73d134aba',
      algorithm: 'sha256',
    },
    {
      filename: 'labels/sub-001_segmentation.nii.gz',
      hash: '68f7cf5cb132cdd9208105799ee85c0d9d077256a103dec0439615e321635cf5',
      algorithm: 'sha256',
    },
    {
      filename: 'dataset_description.json',
      hash: 'f32b925cf835fd2606575a746dad693e3b1b06be81b74135ab9c8027218d63e7',
      algorithm: 'sha256',
    },
  ],
  updatedAt: '2026-07-30T15:42:00.000Z',
  submissionState: 'CONFIRMED',
  submitterEmail: 'nsg-researcher@example.test',
  submitterUsername: 'nsg-researcher',
  blockchainTxId:
    '7c6f65d972d80f65af0f817cbc6f9b5f7bd86e3377bfd593962804afbff02822',
  peerId: 'peer0.nsg.osc.example',
  submissionError: null,
  organization: { name: 'Neuroscience Gateway' },
};

export const demoWorkflows = [
  {
    id: 'workflow-nsg-001',
    title: 'Reproducible neuroimaging preparation',
    description:
      'A documented process for preparing, validating, and publishing neuroimaging inputs.',
    keywords: ['neuroscience', 'workflow'],
    submissionState: 'SUCCESS',
    submittedAt: '2026-07-28T12:00:00.000Z',
    updatedAt: '2026-07-29T12:00:00.000Z',
  },
  {
    id: 'workflow-cs-001',
    title: 'Community observation quality review',
    description:
      'A repeatable review path for validating and publishing contributed observations.',
    keywords: ['citizen-science', 'quality'],
    submissionState: 'SUCCESS',
    submittedAt: '2026-07-27T12:00:00.000Z',
    updatedAt: '2026-07-30T12:00:00.000Z',
  },
];

export const demoWorkflowDetail = {
  ...demoWorkflows[0],
  githubRepositories: [
    {
      url: 'https://github.com/OpenScienceChain/OSC-Chaincode',
      description: 'Chaincode used to register provenance events.',
      gitHash: '44f6a8fb818929cd1b7b2fb47226a0c557308ea7',
      contents: [
        {
          filename: 'chaincode/artifact.go',
          hash: '28b6c49f410b74047ddb393665651adf14e5d92fb636d4848a702566f9045ecf',
        },
        {
          filename: 'chaincode/workflow.go',
          hash: 'f591ab85e36fc04735f3a447f17f1f2355b30848e17a28b74cb7a20a83e4685a',
        },
      ],
    },
  ],
  artifacts: [
    {
      id: demoArtifactDetail.id,
      title: demoArtifactDetail.title,
      description: demoArtifactDetail.description,
    },
  ],
  submitterEmail: 'nsg-researcher@example.test',
  submitterUsername: 'nsg-researcher',
  submission_comment:
    'Records the preparation, validation, and publication sequence used for this release.',
  blockchainTxId:
    'd4ca802d8b18353f9b538f65f52293a556aa245ff3777bba516f32c27655ee40',
  peerId: 'peer0.nsg.osc.example',
  submissionError: null,
  organization: { name: 'Neuroscience Gateway' },
};

const initialValue = {
  acknowledgements: demoArtifactDetail.acknowledgements,
  dois: [],
  footprint: '2e740d6df59af6a8c51c1122c3942133d7078c2f4f0b399d999dcc78d39c95a2',
  fundingAgencies: ['National Science Foundation'],
  id: demoArtifactDetail.id,
  keywords: ['neuroscience', 'imaging'],
  lastTimeVerified: null,
  links: demoArtifactDetail.links,
  manifest: [demoArtifactDetail.manifest[0]],
  submitterEmail: demoArtifactDetail.submitterEmail,
  submitterUsername: demoArtifactDetail.submitterUsername,
  submissionState: 'CONFIRMED',
  submittedAt: '2026-07-28T12:00:00.000Z',
  title: demoArtifactDetail.title,
  description: demoArtifactDetail.description,
  verified: false,
  organization: demoArtifactDetail.organization,
};

export const demoArtifactHistory = {
  artifactId: demoArtifactDetail.id,
  items: [
    {
      txId: demoArtifactDetail.blockchainTxId,
      timestamp: '2026-07-30T16:15:00.000Z',
      isDelete: false,
      value: {
        ...initialValue,
        footprint: demoArtifactDetail.footprint,
        keywords: demoArtifactDetail.keywords,
        manifest: demoArtifactDetail.manifest,
        lastTimeVerified: demoArtifactDetail.lastTimeVerified,
        verified: true,
      },
    },
    {
      txId: 'ad80250f87de870f3b73b57ec1ecfb731f3079523e095dc0d5ba4d7d2ce697da',
      timestamp: '2026-07-30T15:42:00.000Z',
      isDelete: false,
      value: {
        ...initialValue,
        footprint: demoArtifactDetail.footprint,
        keywords: demoArtifactDetail.keywords,
        manifest: demoArtifactDetail.manifest,
      },
    },
    {
      txId: '4e52aeec8e8349c8ea95caa48740ec7f62b97dc49fca208a144cd31d89c84919',
      timestamp: '2026-07-28T12:00:00.000Z',
      isDelete: false,
      value: initialValue,
    },
  ],
  total: 3,
  offset: 0,
  limit: 25,
  order: 'desc',
  hasMore: false,
};

export function installDemoCatalogIntercepts(): void {
  cy.intercept('GET', '**/api/v1/artifacts', { body: demoArtifacts }).as(
    'artifacts',
  );
  cy.intercept('GET', '**/api/v1/workflows', { body: demoWorkflows }).as(
    'workflows',
  );
}

export function installDemoSession(win: Window): void {
  const nowSeconds = Math.floor(Date.now() / 1000);
  const payload = btoa(
    JSON.stringify({
      username: 'nsg-researcher',
      sub: 'demo-user',
      roles: ['pi'],
      email: 'nsg-researcher@example.test',
      iat: nowSeconds,
      exp: nowSeconds + 3600,
    }),
  )
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
  const token = `eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0.${payload}.demo`;
  win.localStorage.setItem('token', token);
  win.localStorage.setItem(
    'tokenData',
    JSON.stringify({ token, expiresAt: (nowSeconds + 3600) * 1000 }),
  );
}
