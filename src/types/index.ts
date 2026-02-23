export interface User {
  id: string;
  username: string;
  role: string;
  clientId?: string;
}

export interface AuthResponse {
  accessToken: string;
  token: string;
  user: User;
}

export interface Message {
  id: string;
  campaignId?: string | null;
  contactId: string;
  providerMessageId?: string;
  provider?: string;
  direction: 'OUTGOING' | 'INCOMING';
  messageType?: string;
  status: 'SENT' | 'DELIVERED' | 'READ' | 'FAILED';
  contextMessageId?: string | null;
  payloadJson: string; // The raw JSON content
  responseJson?: string | null;
  error?: string | null;
  createdAt: string;
}

export interface ContactRequest {
  name: string;
  phone: string;
  tags?: string[];
  metadata?: Record<string, string>;
}

export interface ContactResponse {
  id: string;
  name: string;
  phone: string;
  tags?: string[];
  metadata?: Record<string, string>;
  // Backend does not currently return these, so mark optional
  email?: string; 
  createdAt?: string;
  updatedAt?: string;
}

// Alias for backward compatibility
export type Contact = ContactResponse;

export interface TemplateRequest {
  name: string;
  content: string;
  type: string; // Backend accepts generic string, usually TEXT, MEDIA, INTERACTIVE
  languageCode?: 'en' | 'hi';
  provider_template_id?: string; // Match @JsonProperty("provider_template_id")
}

export type TemplateCategory = 'MARKETING' | 'UTILITY' | 'AUTHENTICATION';
export type TemplateLanguageCode = 'en' | 'hi' | 'en_US' | 'hi_IN';
export type TemplateHeaderFormat = 'TEXT' | 'IMAGE' | 'VIDEO' | 'DOCUMENT' | 'LOCATION';
export type TemplateButtonType =
  | 'QUICK_REPLY'
  | 'URL'
  | 'PHONE_NUMBER'
  | 'COPY_CODE'
  | 'VOICE_CALL'
  | 'OTP';

export interface TemplateButton {
  type: TemplateButtonType;
  text?: string;
  url?: string;
  phoneNumber?: string;
  example?: string;
}

export interface TemplateHeaderComponent {
  type: 'HEADER';
  format: TemplateHeaderFormat;
  text?: string;
  mediaHandle?: string;
}

export interface TemplateBodyComponent {
  type: 'BODY';
  text: string;
  sampleValues?: string[];
}

export interface TemplateFooterComponent {
  type: 'FOOTER';
  text: string;
}

export interface TemplateButtonsComponent {
  type: 'BUTTONS';
  buttons: TemplateButton[];
}

export type TemplateComponent =
  | TemplateHeaderComponent
  | TemplateBodyComponent
  | TemplateFooterComponent
  | TemplateButtonsComponent;

export interface AdvancedTemplateRequest {
  name: string;
  category: TemplateCategory;
  language_code: TemplateLanguageCode;
  components: TemplateComponent[];
}

export interface MetaTemplateButton {
  type: string;
  text?: string;
  url?: string;
  payload?: string;
}

export interface MetaTemplateComponent {
  type: string;
  text?: string;
  format?: string;
  example?: unknown;
  buttons?: MetaTemplateButton[];
}

export interface MetaTemplate {
  id: string;
  name: string;
  status: string;
  category: string;
  language: string;
  qualityScore?: string;
  rejectionReason?: string | null;
  specificRejectionReason?: string | null;
  components?: MetaTemplateComponent[];
  raw?: Record<string, unknown>;
}

export interface Template {
  id: string;
  name: string;
  content: string;
  type: string;
  providerTemplateId?: string;
  active: boolean;
  createdAt?: string; // Backend sends OffsetDateTime, serialized as string
  // Fields used in UI but potentially missing in backend response
  status?: string;
  language?: string;
  languageCode?: string;
  category?: TemplateCategory;
  componentsJson?: string;
  exampleValuesJson?: string;
  rawTemplateJson?: string;
}

export interface Campaign {
  id: string;
  name: string;
  status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED';
  scheduledAt?: string;
  createdAt: string;
  totalContacts?: number;
  processedContacts?: number;
}

export interface DashboardStats {
  totalContacts: number;
  activeCampaigns: number;
  messagesSent: number;
  failedMessages: number;
  recentCampaigns: Campaign[];
}
