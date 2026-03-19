// ═══════════════════════════════════════════════════════════════
//  AUTH
// ═══════════════════════════════════════════════════════════════

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

// ═══════════════════════════════════════════════════════════════
//  MESSAGE TYPES
// ═══════════════════════════════════════════════════════════════

export type MessageType =
  | 'TEXT'
  | 'TEMPLATE'
  | 'IMAGE'
  | 'VIDEO'
  | 'AUDIO'
  | 'DOCUMENT'
  | 'STICKER'
  | 'LOCATION'
  | 'CONTACTS'
  | 'INTERACTIVE'
  | 'REACTION'
  | 'BUTTON'
  | 'ORDER'
  | 'SYSTEM'
  | 'UNKNOWN';

export type MessageDirection = 'OUTGOING' | 'INCOMING';
export type MessageStatus = 'QUEUED' | 'SENT' | 'DELIVERED' | 'READ' | 'FAILED' | 'UNKNOWN';

export interface Message {
  id: string;
  campaignId?: string | null;
  contactId?: string | null;
  providerMessageId?: string;
  provider?: string;
  direction: MessageDirection;
  messageType?: MessageType;
  status: MessageStatus;
  contextMessageId?: string | null;
  payloadJson: string;
  responseJson?: string | null;
  error?: string | null;
  createdAt: string;
}

// ═══════════════════════════════════════════════════════════════
//  SEND MESSAGE REQUEST (unified)
// ═══════════════════════════════════════════════════════════════

export interface TextPayload {
  body: string;
  previewUrl?: boolean;
}

export interface MediaPayload {
  link?: string;
  mediaId?: string;
  caption?: string;
  filename?: string;
}

export interface LocationPayload {
  latitude: number;
  longitude: number;
  name?: string;
  address?: string;
}

export interface ContactCardName {
  formattedName: string;
  firstName?: string;
  lastName?: string;
  middleName?: string;
  prefix?: string;
  suffix?: string;
}

export interface ContactCardPhone {
  phone: string;
  type?: string;
  waId?: string;
}

export interface ContactCardEmail {
  email: string;
  type?: string;
}

export interface ContactCardAddress {
  street?: string;
  city?: string;
  state?: string;
  zip?: string;
  country?: string;
  countryCode?: string;
  type?: string;
}

export interface ContactCardOrg {
  company?: string;
  department?: string;
  title?: string;
}

export interface ContactCardUrl {
  url: string;
  type?: string;
}

export interface ContactCardPayload {
  name: ContactCardName;
  phones?: ContactCardPhone[];
  emails?: ContactCardEmail[];
  addresses?: ContactCardAddress[];
  org?: ContactCardOrg;
  urls?: ContactCardUrl[];
  birthday?: string;
}

export interface ReactionPayload {
  messageId: string;
  emoji: string;
}

export interface TemplatePayload {
  templateId: string;
  variables?: Record<string, string>;
}

export interface ContextPayload {
  messageId: string;
}

// ─── Interactive Payload ─────────────────────────────────────

export type InteractiveType = 'button' | 'list' | 'cta_url' | 'product' | 'product_list';

export interface InteractiveMediaRef {
  link?: string;
  id?: string;
}

export interface InteractiveHeader {
  type: 'text' | 'image' | 'video' | 'document';
  text?: string;
  image?: InteractiveMediaRef;
  video?: InteractiveMediaRef;
  document?: InteractiveMediaRef;
}

export interface InteractiveBody {
  text: string;
}

export interface InteractiveFooter {
  text: string;
}

export interface InteractiveReply {
  id: string;
  title: string;
}

export interface InteractiveReplyButton {
  type: 'reply';
  reply: InteractiveReply;
}

export interface InteractiveRow {
  id: string;
  title: string;
  description?: string;
}

export interface InteractiveSection {
  title: string;
  rows?: InteractiveRow[];
  productItems?: { productRetailerId: string }[];
}

export interface InteractiveParameters {
  displayText: string;
  url: string;
}

export interface InteractiveAction {
  buttons?: InteractiveReplyButton[];
  button?: string;
  sections?: InteractiveSection[];
  name?: string;
  parameters?: InteractiveParameters;
  catalogId?: string;
  productRetailerId?: string;
}

export interface InteractivePayload {
  type: InteractiveType;
  header?: InteractiveHeader;
  body: InteractiveBody;
  footer?: InteractiveFooter;
  action: InteractiveAction;
}

// ─── Unified Send Request ────────────────────────────────────

export interface SendMessageRequest {
  to: string;
  messageType: MessageType;
  text?: TextPayload;
  image?: MediaPayload;
  video?: MediaPayload;
  audio?: MediaPayload;
  document?: MediaPayload;
  sticker?: MediaPayload;
  location?: LocationPayload;
  contacts?: ContactCardPayload[];
  interactive?: InteractivePayload;
  reaction?: ReactionPayload;
  template?: TemplatePayload;
  context?: ContextPayload;
  contactId?: string;
  campaignId?: string;
}

// ═══════════════════════════════════════════════════════════════
//  CONTACTS
// ═══════════════════════════════════════════════════════════════

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
  email?: string;
  createdAt?: string;
  updatedAt?: string;
}

export type Contact = ContactResponse;

// ═══════════════════════════════════════════════════════════════
//  TEMPLATES
// ═══════════════════════════════════════════════════════════════

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
  sampleValues?: string[];
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

/** Request DTO for creating/updating templates (component-based) */
export interface TemplateRequest {
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
  createdAt?: string;
  status?: string;
  language?: string;
  languageCode?: string;
  category?: TemplateCategory;
  qualityRating?: string;
  componentsJson?: string;
  exampleValuesJson?: string;
  rawTemplateJson?: string;
}

// ═══════════════════════════════════════════════════════════════
//  CAMPAIGNS
// ═══════════════════════════════════════════════════════════════

export interface Campaign {
  id: string;
  name: string;
  status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED';
  scheduledAt?: string;
  createdAt: string;
  totalContacts?: number;
  processedContacts?: number;
  flowId?: string;
}

// ═══════════════════════════════════════════════════════════════
//  DASHBOARD
// ═══════════════════════════════════════════════════════════════

export interface DashboardStats {
  totalContacts: number;
  activeCampaigns: number;
  messagesSent: number;
  failedMessages: number;
  recentCampaigns: Campaign[];
}

// ═══════════════════════════════════════════════════════════════
//  PAGINATION (for future use)
// ═══════════════════════════════════════════════════════════════

export interface PaginatedResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
}

// ═══════════════════════════════════════════════════════════════
//  FLOWS
// ═══════════════════════════════════════════════════════════════

export type FlowStatus = 'DRAFT' | 'ACTIVE' | 'PAUSED' | 'ARCHIVED';
export type FlowTriggerType = 'KEYWORD' | 'CAMPAIGN' | 'MANUAL';
export type FlowNodeType = 'START' | 'SEND_MESSAGE' | 'WAIT_FOR_REPLY' | 'CONDITION' | 'END';
export type FlowConditionMatchType = 'EXACT' | 'CONTAINS' | 'BUTTON_ID' | 'LIST_ID' | 'REGEX' | 'DEFAULT';

export interface FlowCondition {
  id: string;
  matchType: FlowConditionMatchType;
  value?: string;
  label: string;
}

export interface FlowNodeData {
  triggerType?: FlowTriggerType;
  keywords?: string[];
  messageType?: string;
  text?: { body: string };
  template?: { templateId: string; templateName?: string; variables?: Record<string, string> };
  templateButtons?: MetaTemplateButton[];
  interactive?: InteractivePayload;
  timeoutSeconds?: number;
  conditions?: FlowCondition[];
}

export interface FlowNode {
  id: string;
  type: FlowNodeType;
  data: FlowNodeData;
  position: { x: number; y: number };
}

export interface FlowEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
  label?: string;
  style?: { stroke?: string; strokeWidth?: number };
}

export interface FlowDefinition {
  nodes: FlowNode[];
  edges: FlowEdge[];
}

export interface Flow {
  id: string;
  name: string;
  description?: string;
  status: FlowStatus;
  triggerType?: FlowTriggerType;
  triggerKeywords?: string;
  definitionJson?: string;
  version?: number;
  createdBy?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface FlowRequest {
  name: string;
  description?: string;
  triggerType?: string;
  triggerKeywords?: string;
  definitionJson?: string;
}

export interface FlowExecution {
  id: string;
  flowId: string;
  contactId: string;
  campaignId?: string;
  currentNodeId?: string;
  status: string;
  startedAt: string;
  updatedAt?: string;
  completedAt?: string;
  steps?: FlowStepHistory[];
}

export interface FlowStepHistory {
  id: string;
  nodeId: string;
  nodeType?: string;
  action: string;
  messageId?: string;
  responseData?: string;
  matchedCondition?: string;
  createdAt: string;
}

export interface FlowAnalytics {
  totalExecutions: number;
  completed: number;
  active: number;
  waiting: number;
  failed: number;
  timedOut: number;
  contactsPerNode: Record<string, number>;
}
