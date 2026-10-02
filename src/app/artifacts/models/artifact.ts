/**
 * Data Transfer Object for creating a new artifact
 * Matches the backend expectations for artifact creation
 */
export interface CreateArtifactDTO {
  // Form fields (user-provided)
  title: string; // Length: 3-200
  description: string; // Length: 50-3000
  submission_comment?: string; // Mandatory via UI; server field
  keywords?: string[]; // Optional array of strings
  links?: string[]; // Optional array of URLs
  dois?: string[]; // Optional array of DOI strings
  fundingAgencies?: string[]; // Optional array of agency names
  acknowledgements?: string; // Optional, Length: 0-3000

  // Manifest containing details about each file in the artifact
  manifest: ManifestItem[];
  footprint: string;
}

/**
 * DTO for updating an existing artifact's metadata (no title/description)
 * The API rejects title/description on update, so they are intentionally omitted.
 */
export interface UpdateArtifactDTO {
  keywords?: string[];
  links?: string[];
  dois?: string[];
  fundingAgencies?: string[];
  acknowledgements?: string;
  submission_comment?: string;
  manifest: ManifestItem[];
  footprint: string;
}

/**
 * Interface for an item in the artifact's manifest
 */
export interface ManifestItem {
  hash: string;
  filename: string;
  algorithm: string;
}

/**
 * Internal interface for handling file data before submission
 * This is used internally in the component before creating the DTO
 */
export interface FileData {
  content: File;
  name: string;
  hash: string;
  size: number;
}
