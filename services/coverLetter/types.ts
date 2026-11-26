export interface CoverLetterRecipientInfo {
  hiringManager?: string;
  company: string;
  companyLocation?: string;
  roleTitle: string;
}

export interface CoverLetterSenderInfo {
  fullName: string;
  email: string;
  phone: string;
  location: string;
  date: string;
}

export interface TailoredCoverLetterContent {
  senderInfo: CoverLetterSenderInfo;
  recipientInfo: CoverLetterRecipientInfo;
  salutation: string;
  opening: string;
  bodyParagraphs: string[];
  callToAction: string;
  signOff: string;
  fullLetterMarkdown: string;
  highlightedMatches: string[];
  flaggedGaps: string[];
}

export interface CoverLetterGenerationOptions {
  customInstructions?: string;
  providerId?: string;
  tone?: 'professional-natural' | 'technical-concise' | 'executive';
}

export interface CoverLetterGenerationResult {
  success: boolean;
  documentId?: string;
  version?: number;
  filePath?: string;
  originalFilename?: string;
  content?: TailoredCoverLetterContent;
  flaggedGaps?: string[];
  requiresManualConfirmation?: boolean;
  error?: string;
}
