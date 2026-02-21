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
  contactId: string;
  direction: 'OUTGOING' | 'INCOMING';
  status: 'SENT' | 'DELIVERED' | 'READ' | 'FAILED';
  payloadJson: string; // The raw JSON content
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
export type TemplateLanguageCode = 'en' | 'hi' | 'en_US';
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
  languageCode: TemplateLanguageCode;
  components: TemplateComponent[];
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
  category?: TemplateCategory;
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
