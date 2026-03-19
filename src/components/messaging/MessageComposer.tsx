import React, { useState, useEffect } from 'react';
import { Send, X, Reply } from 'lucide-react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { sendMessage, sendMediaMessage } from '../../services/messageService';
import { getApprovedMetaTemplates } from '../../services/templateService';
import type {
  Message,
  MessageType,
  MetaTemplate,
  MetaTemplateComponent,
  SendMessageRequest,
  InteractiveReplyButton,
  InteractiveSection,
  InteractiveRow,
  ContactCardPayload,
} from '../../types';

// ─── Types supported by the unified JSON endpoint ──────────────
const ALL_SEND_TYPES: { value: MessageType; label: string }[] = [
  { value: 'TEXT', label: 'Text' },
  { value: 'TEMPLATE', label: 'Template' },
  { value: 'IMAGE', label: 'Image' },
  { value: 'VIDEO', label: 'Video' },
  { value: 'AUDIO', label: 'Audio' },
  { value: 'DOCUMENT', label: 'Document' },
  { value: 'STICKER', label: 'Sticker' },
  { value: 'LOCATION', label: 'Location' },
  { value: 'CONTACTS', label: 'Contact Card' },
  { value: 'INTERACTIVE', label: 'Interactive' },
  { value: 'REACTION', label: 'Reaction' },
];

// Types that use file upload (multipart)
const FILE_UPLOAD_TYPES: MessageType[] = ['IMAGE', 'VIDEO', 'AUDIO', 'DOCUMENT', 'STICKER'];

// Types that can be sent via JSON body with link/mediaId
const LINK_MEDIA_TYPES: MessageType[] = ['IMAGE', 'VIDEO', 'AUDIO', 'DOCUMENT', 'STICKER'];

interface MessageComposerProps {
  to: string;
  onSent?: () => void;
  replyTo?: Message | null;
  onCancelReply?: () => void;
  disabled?: boolean;
  showPhoneInput?: boolean;
  onPhoneChange?: (phone: string) => void;
}

const selectClass =
  'w-full h-10 px-3 py-2 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-whatsapp-teal focus:border-transparent text-sm';

const MessageComposer: React.FC<MessageComposerProps> = ({
  to,
  onSent,
  replyTo,
  onCancelReply,
  disabled,
  showPhoneInput,
  onPhoneChange,
}) => {
  const [sendType, setSendType] = useState<MessageType>('TEXT');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Text
  const [textMessage, setTextMessage] = useState('');

  // Template
  const [templates, setTemplates] = useState<MetaTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [templateVariables, setTemplateVariables] = useState<Record<string, string>>({});

  // Media (file upload)
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [mediaCaption, setMediaCaption] = useState('');
  // Media (link-based)
  const [mediaLink, setMediaLink] = useState('');
  const [mediaFilename, setMediaFilename] = useState('');
  const [useFileUpload, setUseFileUpload] = useState(true);

  // Location
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [locationName, setLocationName] = useState('');
  const [locationAddress, setLocationAddress] = useState('');

  // Contact Card
  const [contactName, setContactName] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactOrg, setContactOrg] = useState('');

  // Interactive
  const [interactiveType, setInteractiveType] = useState<'button' | 'list'>('button');
  const [interactiveBodyText, setInteractiveBodyText] = useState('');
  const [interactiveButtons, setInteractiveButtons] = useState<{ id: string; title: string }[]>([
    { id: 'btn_1', title: '' },
  ]);
  const [listButtonText, setListButtonText] = useState('Menu');
  const [listSections, setListSections] = useState<{ title: string; rows: { id: string; title: string; description: string }[] }[]>([
    { title: 'Section 1', rows: [{ id: 'row_1', title: '', description: '' }] },
  ]);

  // Reaction
  const [reactionEmoji, setReactionEmoji] = useState('');
  const [reactionMessageId, setReactionMessageId] = useState('');

  // Load templates
  useEffect(() => {
    getApprovedMetaTemplates().then(setTemplates).catch(() => {});
  }, []);

  // ─── Template variable extraction ───────────────────────────
  const extractTemplateVariableKeys = (template: MetaTemplate): string[] => {
    const keys: string[] = [];
    if (!template.components) return keys;
    for (const comp of template.components) {
      const text = (comp as MetaTemplateComponent).text || '';
      const matches = text.match(/\{\{(\d+)\}\}/g);
      if (matches) {
        for (const m of matches) {
          const key = m.replace(/[{}]/g, '');
          if (!keys.includes(key)) keys.push(key);
        }
      }
    }
    return keys.sort();
  };

  const handleTemplateChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const id = e.target.value;
    setSelectedTemplate(id);
    if (!id) {
      setTemplateVariables({});
      return;
    }
    const tmpl = templates.find((t) => t.id === id);
    if (!tmpl) return;
    const keys = extractTemplateVariableKeys(tmpl);
    const vars: Record<string, string> = {};
    keys.forEach((k) => (vars[k] = ''));
    setTemplateVariables(vars);
  };

  // ─── File helpers ───────────────────────────────────────────
  const getFileAccept = (type: MessageType) => {
    switch (type) {
      case 'IMAGE': return 'image/*';
      case 'VIDEO': return 'video/*';
      case 'AUDIO': return 'audio/*';
      case 'DOCUMENT': return '.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv';
      case 'STICKER': return 'image/webp';
      default: return '*/*';
    }
  };

  // ─── Reset form ─────────────────────────────────────────────
  const resetForm = () => {
    setTextMessage('');
    setSelectedTemplate('');
    setTemplateVariables({});
    setMediaFile(null);
    setMediaCaption('');
    setMediaLink('');
    setMediaFilename('');
    setLatitude('');
    setLongitude('');
    setLocationName('');
    setLocationAddress('');
    setContactName('');
    setContactPhone('');
    setContactEmail('');
    setContactOrg('');
    setInteractiveBodyText('');
    setInteractiveButtons([{ id: 'btn_1', title: '' }]);
    setListSections([{ title: 'Section 1', rows: [{ id: 'row_1', title: '', description: '' }] }]);
    setReactionEmoji('');
    setReactionMessageId('');
  };

  // ─── Submit ─────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!to || disabled) return;
    setLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      // File upload path (multipart)
      if (FILE_UPLOAD_TYPES.includes(sendType) && useFileUpload && mediaFile) {
        await sendMediaMessage({
          to,
          messageType: sendType as 'IMAGE' | 'VIDEO' | 'AUDIO' | 'DOCUMENT' | 'STICKER',
          file: mediaFile,
          caption: mediaCaption.trim() || undefined,
        });
      } else {
        // JSON body path
        const req: SendMessageRequest = { to, messageType: sendType };

        // Context (reply-to)
        if (replyTo?.providerMessageId) {
          req.context = { messageId: replyTo.providerMessageId };
        }

        switch (sendType) {
          case 'TEXT':
            if (!textMessage.trim()) { setErrorMsg('Message text is required.'); return; }
            req.text = { body: textMessage.trim() };
            break;

          case 'TEMPLATE':
            if (!selectedTemplate) { setErrorMsg('Select a template.'); return; }
            req.template = {
              templateId: selectedTemplate,
              variables: Object.keys(templateVariables).length > 0 ? templateVariables : undefined,
            };
            break;

          case 'IMAGE':
          case 'VIDEO':
          case 'AUDIO':
          case 'DOCUMENT':
          case 'STICKER': {
            if (!mediaLink.trim()) { setErrorMsg('Media link is required.'); return; }
            const mediaPayload = {
              link: mediaLink.trim(),
              caption: mediaCaption.trim() || undefined,
              filename: mediaFilename.trim() || undefined,
            };
            if (sendType === 'IMAGE') req.image = mediaPayload;
            else if (sendType === 'VIDEO') req.video = mediaPayload;
            else if (sendType === 'AUDIO') req.audio = mediaPayload;
            else if (sendType === 'DOCUMENT') req.document = mediaPayload;
            else if (sendType === 'STICKER') req.sticker = mediaPayload;
            break;
          }

          case 'LOCATION':
            if (!latitude || !longitude) { setErrorMsg('Latitude and longitude required.'); return; }
            req.location = {
              latitude: parseFloat(latitude),
              longitude: parseFloat(longitude),
              name: locationName.trim() || undefined,
              address: locationAddress.trim() || undefined,
            };
            break;

          case 'CONTACTS': {
            if (!contactName.trim()) { setErrorMsg('Contact name is required.'); return; }
            const card: ContactCardPayload = {
              name: { formattedName: contactName.trim() },
            };
            if (contactPhone.trim()) card.phones = [{ phone: contactPhone.trim() }];
            if (contactEmail.trim()) card.emails = [{ email: contactEmail.trim() }];
            if (contactOrg.trim()) card.org = { company: contactOrg.trim() };
            req.contacts = [card];
            break;
          }

          case 'INTERACTIVE':
            if (!interactiveBodyText.trim()) { setErrorMsg('Body text is required.'); return; }
            if (interactiveType === 'button') {
              const validButtons = interactiveButtons.filter((b) => b.title.trim());
              if (validButtons.length === 0) { setErrorMsg('At least one button required.'); return; }
              if (validButtons.length > 3) { setErrorMsg('Max 3 reply buttons allowed.'); return; }
              const buttons: InteractiveReplyButton[] = validButtons.map((b) => ({
                type: 'reply',
                reply: { id: b.id, title: b.title.trim() },
              }));
              req.interactive = {
                type: 'button',
                body: { text: interactiveBodyText.trim() },
                action: { buttons },
              };
            } else {
              // List
              const validSections: InteractiveSection[] = listSections
                .filter((s) => s.rows.some((r) => r.title.trim()))
                .map((s) => ({
                  title: s.title,
                  rows: s.rows
                    .filter((r) => r.title.trim())
                    .map((r) => ({ id: r.id, title: r.title.trim(), description: r.description.trim() || undefined } as InteractiveRow)),
                }));
              if (validSections.length === 0) { setErrorMsg('At least one section with rows required.'); return; }
              req.interactive = {
                type: 'list',
                body: { text: interactiveBodyText.trim() },
                action: { button: listButtonText || 'Menu', sections: validSections },
              };
            }
            break;

          case 'REACTION':
            if (!reactionMessageId.trim()) { setErrorMsg('Message ID is required.'); return; }
            req.reaction = {
              messageId: reactionMessageId.trim(),
              emoji: reactionEmoji || '',
            };
            break;

          default:
            setErrorMsg('Unsupported message type.');
            return;
        }

        await sendMessage(req);
      }

      setSuccessMsg('Sent!');
      resetForm();
      onSent?.();
      if (onCancelReply) onCancelReply();
      setTimeout(() => setSuccessMsg(''), 2000);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to send.');
    } finally {
      setLoading(false);
    }
  };

  // ─── Render ─────────────────────────────────────────────────
  return (
    <div className="space-y-2">
      {/* Reply preview bar */}
      {replyTo && (
        <div className="flex items-center gap-2 px-3 py-2 bg-whatsapp-teal/10 border-l-4 border-whatsapp-teal rounded text-sm">
          <Reply className="w-4 h-4 text-whatsapp-teal flex-shrink-0" />
          <span className="flex-1 truncate text-gray-700">
            Replying to: {replyTo.payloadJson ? tryExtractText(replyTo.payloadJson) : 'message'}
          </span>
          <button onClick={onCancelReply} className="text-gray-400 hover:text-gray-600">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-3">
        {/* Phone input (when no contact selected) */}
        {showPhoneInput && (
          <Input
            placeholder="Phone number..."
            value={to}
            onChange={(e) => onPhoneChange?.(e.target.value)}
          />
        )}

        {/* Type selector */}
        <div className="flex gap-2">
          <select value={sendType} onChange={(e) => { setSendType(e.target.value as MessageType); setErrorMsg(''); }} className={selectClass + ' flex-1'}>
            {ALL_SEND_TYPES.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>

          <Button type="submit" disabled={loading || !to || disabled} className="h-10 px-6">
            {loading ? '...' : <Send className="w-5 h-5" />}
          </Button>
        </div>

        {/* ─── TEXT ──────────────────────────────────────── */}
        {sendType === 'TEXT' && (
          <Input
            placeholder="Type a message..."
            value={textMessage}
            onChange={(e) => setTextMessage(e.target.value)}
          />
        )}

        {/* ─── TEMPLATE ─────────────────────────────────── */}
        {sendType === 'TEMPLATE' && (
          <div className="space-y-2">
            <select value={selectedTemplate} onChange={handleTemplateChange} className={selectClass}>
              <option value="">Select template...</option>
              {templates.map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
            {Object.keys(templateVariables).length > 0 && (
              <div className="grid grid-cols-2 gap-2 bg-gray-50 p-3 rounded-lg border">
                {Object.keys(templateVariables).map((key) => (
                  <input
                    key={key}
                    type="text"
                    required
                    value={templateVariables[key]}
                    onChange={(e) => setTemplateVariables((prev) => ({ ...prev, [key]: e.target.value }))}
                    className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                    placeholder={`{{${key}}}`}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* ─── MEDIA (file upload or link) ──────────────── */}
        {LINK_MEDIA_TYPES.includes(sendType) && (
          <div className="space-y-2 rounded-lg border border-gray-200 p-3 bg-gray-50/60">
            <div className="flex gap-2 text-xs">
              <button type="button" onClick={() => setUseFileUpload(true)}
                className={`px-2 py-1 rounded ${useFileUpload ? 'bg-whatsapp-teal text-white' : 'bg-gray-200'}`}>
                Upload File
              </button>
              <button type="button" onClick={() => setUseFileUpload(false)}
                className={`px-2 py-1 rounded ${!useFileUpload ? 'bg-whatsapp-teal text-white' : 'bg-gray-200'}`}>
                Link / Media ID
              </button>
            </div>

            {useFileUpload ? (
              <>
                <input
                  type="file"
                  accept={getFileAccept(sendType)}
                  onChange={(e) => setMediaFile(e.target.files?.[0] || null)}
                  className="block w-full text-sm text-gray-700 file:mr-3 file:rounded-md file:border-0 file:bg-gray-200 file:px-3 file:py-1.5 file:text-xs file:font-medium"
                />
                {mediaFile && <p className="text-xs text-gray-500">Selected: {mediaFile.name}</p>}
              </>
            ) : (
              <>
                <Input placeholder="Media URL or Media ID..." value={mediaLink} onChange={(e) => setMediaLink(e.target.value)} />
                {sendType === 'DOCUMENT' && (
                  <Input placeholder="Filename (optional)" value={mediaFilename} onChange={(e) => setMediaFilename(e.target.value)} />
                )}
              </>
            )}
            {sendType !== 'AUDIO' && sendType !== 'STICKER' && (
              <Input placeholder="Caption (optional)" value={mediaCaption} onChange={(e) => setMediaCaption(e.target.value)} />
            )}
          </div>
        )}

        {/* ─── LOCATION ─────────────────────────────────── */}
        {sendType === 'LOCATION' && (
          <div className="grid grid-cols-2 gap-2 bg-gray-50 p-3 rounded-lg border">
            <Input placeholder="Latitude *" value={latitude} onChange={(e) => setLatitude(e.target.value)} />
            <Input placeholder="Longitude *" value={longitude} onChange={(e) => setLongitude(e.target.value)} />
            <Input placeholder="Name" value={locationName} onChange={(e) => setLocationName(e.target.value)} />
            <Input placeholder="Address" value={locationAddress} onChange={(e) => setLocationAddress(e.target.value)} />
          </div>
        )}

        {/* ─── CONTACTS ─────────────────────────────────── */}
        {sendType === 'CONTACTS' && (
          <div className="grid grid-cols-2 gap-2 bg-gray-50 p-3 rounded-lg border">
            <Input placeholder="Full Name *" value={contactName} onChange={(e) => setContactName(e.target.value)} />
            <Input placeholder="Phone" value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} />
            <Input placeholder="Email" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} />
            <Input placeholder="Company" value={contactOrg} onChange={(e) => setContactOrg(e.target.value)} />
          </div>
        )}

        {/* ─── INTERACTIVE ──────────────────────────────── */}
        {sendType === 'INTERACTIVE' && (
          <div className="space-y-2 bg-gray-50 p-3 rounded-lg border">
            <div className="flex gap-2 text-xs mb-2">
              <button type="button" onClick={() => setInteractiveType('button')}
                className={`px-2 py-1 rounded ${interactiveType === 'button' ? 'bg-whatsapp-teal text-white' : 'bg-gray-200'}`}>
                Reply Buttons
              </button>
              <button type="button" onClick={() => setInteractiveType('list')}
                className={`px-2 py-1 rounded ${interactiveType === 'list' ? 'bg-whatsapp-teal text-white' : 'bg-gray-200'}`}>
                List
              </button>
            </div>

            <Input placeholder="Body text *" value={interactiveBodyText} onChange={(e) => setInteractiveBodyText(e.target.value)} />

            {interactiveType === 'button' && (
              <div className="space-y-1">
                <p className="text-xs text-gray-500">Reply buttons (max 3):</p>
                {interactiveButtons.map((btn, i) => (
                  <div key={i} className="flex gap-1">
                    <input
                      className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm"
                      placeholder={`Button ${i + 1} title`}
                      value={btn.title}
                      onChange={(e) => {
                        const updated = [...interactiveButtons];
                        updated[i] = { ...updated[i], title: e.target.value };
                        setInteractiveButtons(updated);
                      }}
                    />
                    {interactiveButtons.length > 1 && (
                      <button type="button" onClick={() => setInteractiveButtons(interactiveButtons.filter((_, j) => j !== i))}
                        className="text-red-400 text-xs px-1">✕</button>
                    )}
                  </div>
                ))}
                {interactiveButtons.length < 3 && (
                  <button type="button"
                    onClick={() => setInteractiveButtons([...interactiveButtons, { id: `btn_${interactiveButtons.length + 1}`, title: '' }])}
                    className="text-xs text-whatsapp-teal">+ Add button</button>
                )}
              </div>
            )}

            {interactiveType === 'list' && (
              <div className="space-y-2">
                <Input placeholder="Button text" value={listButtonText} onChange={(e) => setListButtonText(e.target.value)} />
                {listSections.map((section, si) => (
                  <div key={si} className="border border-gray-200 rounded p-2 space-y-1">
                    <input
                      className="w-full px-2 py-1 border border-gray-300 rounded text-sm font-medium"
                      placeholder="Section title"
                      value={section.title}
                      onChange={(e) => {
                        const updated = [...listSections];
                        updated[si] = { ...updated[si], title: e.target.value };
                        setListSections(updated);
                      }}
                    />
                    {section.rows.map((row, ri) => (
                      <div key={ri} className="flex gap-1">
                        <input className="flex-1 px-2 py-1 border rounded text-sm" placeholder="Row title"
                          value={row.title}
                          onChange={(e) => {
                            const updated = [...listSections];
                            updated[si].rows[ri] = { ...row, title: e.target.value };
                            setListSections(updated);
                          }}
                        />
                        <input className="flex-1 px-2 py-1 border rounded text-sm" placeholder="Description"
                          value={row.description}
                          onChange={(e) => {
                            const updated = [...listSections];
                            updated[si].rows[ri] = { ...row, description: e.target.value };
                            setListSections(updated);
                          }}
                        />
                      </div>
                    ))}
                    <button type="button"
                      onClick={() => {
                        const updated = [...listSections];
                        updated[si].rows.push({ id: `row_${si}_${section.rows.length + 1}`, title: '', description: '' });
                        setListSections(updated);
                      }}
                      className="text-xs text-whatsapp-teal">+ Add row</button>
                  </div>
                ))}
                <button type="button"
                  onClick={() => setListSections([...listSections, { title: `Section ${listSections.length + 1}`, rows: [{ id: `row_${listSections.length}_1`, title: '', description: '' }] }])}
                  className="text-xs text-whatsapp-teal">+ Add section</button>
              </div>
            )}
          </div>
        )}

        {/* ─── REACTION ─────────────────────────────────── */}
        {sendType === 'REACTION' && (
          <div className="grid grid-cols-2 gap-2 bg-gray-50 p-3 rounded-lg border">
            <Input placeholder="Message ID *" value={reactionMessageId} onChange={(e) => setReactionMessageId(e.target.value)} />
            <Input placeholder="Emoji (e.g. 👍)" value={reactionEmoji} onChange={(e) => setReactionEmoji(e.target.value)} />
          </div>
        )}

        {/* Messages */}
        {errorMsg && <p className="text-red-500 text-xs">{errorMsg}</p>}
        {successMsg && <p className="text-green-500 text-xs">{successMsg}</p>}
      </form>
    </div>
  );
};

// Helper to extract readable text from payloadJson
function tryExtractText(payloadJson: string): string {
  try {
    const p = JSON.parse(payloadJson);
    if (p.text?.body) return p.text.body;
    if (typeof p.body === 'string') return p.body;
    if (p.type) return `[${p.type}]`;
    return 'message';
  } catch {
    return 'message';
  }
}

export default MessageComposer;
