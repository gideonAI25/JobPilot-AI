export type ScreeningAnswerSource =
  | 'VERIFIED_STANDARD'
  | 'AI_DRAFTED'
  | 'MANUAL_REQUIRED';

export type ScreeningQuestionCategory =
  | 'General'
  | 'Experience'
  | 'Technical'
  | 'Motivation'
  | 'Salary'
  | 'Work Authorization'
  | 'Availability'
  | 'Role-Specific';

export interface ScreeningQuestionAnswer {
  id: string;
  question: string;
  category: ScreeningQuestionCategory;
  answer: string;
  source: ScreeningAnswerSource;
  isVerified: boolean;
  requiresConfirmation: boolean;
  confirmationReason?: string;
  lastUpdated?: string;
}

export interface ApplicationScreeningAnswersContent {
  applicationId: string;
  generatedAt: string;
  version: number;
  summary: string;
  items: ScreeningQuestionAnswer[];
}

export interface ScreeningAnswersGenerationOptions {
  customInstructions?: string;
  providerId?: string;
  includeQuestions?: string[];
}

export interface ScreeningAnswersGenerationResult {
  success: boolean;
  documentId?: string;
  version?: number;
  filePath?: string;
  content?: ApplicationScreeningAnswersContent;
  flaggedCount?: number;
  requiresManualConfirmation?: boolean;
  error?: string;
}
