import React, { useState, useEffect, useRef } from 'react';
import { MessageSquare, Phone, RefreshCw, Reply, Check, CheckCheck } from 'lucide-react';
import {
  getMessageHistory,
  fetchMessageMedia,
} from '../services/messageService';
import { getContacts } from '../services/contactService';
import type { ContactResponse, Message } from '../types';
import { Button, cn } from '../components/ui/Button';
import { Avatar } from '../components/ui/Avatar';
import { SearchBar } from '../components/ui/SearchBar';
import { EmptyState } from '../components/ui/EmptyState';
import MessageComposer from '../components/messaging/MessageComposer';

const QuickSend = () => {
  const [contacts, setContacts] = useState<ContactResponse[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [mediaPreviewUrls, setMediaPreviewUrls] = useState<Record<string, string>>({});
  const [mediaLoadingById, setMediaLoadingById] = useState<Record<string, boolean>>({});
  const mediaPreviewUrlsRef = useRef<Record<string, string>>({});

  // Selected contact
  const [to, setTo] = useState('');

  // Reply-to
  const [replyTo, setReplyTo] = useState<Message | null>(null);

  // Contact Search
  const [searchTerm, setSearchTerm] = useState('');

  // Chat Scroll
  const chatContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    getContacts().then(setContacts).catch(console.error);
  }, []);

  useEffect(() => {
    if (to && to.length >= 10) {
        loadHistory(to);
    } else {
        setMessages([]);
    }
  }, [to]);

  // Scroll to bottom when messages change
  useEffect(() => {
    if (chatContainerRef.current) {
        chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    mediaPreviewUrlsRef.current = mediaPreviewUrls;
  }, [mediaPreviewUrls]);

  useEffect(() => {
    return () => {
      Object.values(mediaPreviewUrlsRef.current).forEach((url) => URL.revokeObjectURL(url));
    };
  }, []);

  const loadHistory = async (phone: string) => {
    setHistoryLoading(true);
    try {
        const history = await getMessageHistory(phone);
        // Sort by date
        history.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
        setMessages(history);
    } catch (e) {
        console.error("Failed to load history", e);
    } finally {
        setHistoryLoading(false);
    }
  };

  const handleContactSelect = (phone: string) => {
    setTo(phone);
    // History loading triggered by useEffect
  };

  const setMediaLoading = (messageId: string, value: boolean) => {
    setMediaLoadingById((prev) => ({ ...prev, [messageId]: value }));
  };

  const loadMediaPreview = async (messageId: string) => {
    if (mediaPreviewUrls[messageId]) return mediaPreviewUrls[messageId];
    setMediaLoading(messageId, true);
    try {
      const { blob } = await fetchMessageMedia(messageId, 'inline');
      const objectUrl = URL.createObjectURL(blob);
      setMediaPreviewUrls((prev) => ({ ...prev, [messageId]: objectUrl }));
      return objectUrl;
    } catch (err) {
      console.error('Failed to load media preview', err);
      setErrorMsg('Unable to load media preview.');
      return '';
    } finally {
      setMediaLoading(messageId, false);
    }
  };

  const handleOpenMedia = async (messageId: string) => {
    const previewUrl = mediaPreviewUrls[messageId] || (await loadMediaPreview(messageId));
    if (!previewUrl) return;
    window.open(previewUrl, '_blank', 'noopener,noreferrer');
  };

  const handleDownloadMedia = async (messageId: string, fallbackFilename: string) => {
    setMediaLoading(messageId, true);
    try {
      const { blob, filename } = await fetchMessageMedia(messageId, 'attachment');
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = objectUrl;
      link.download = filename || fallbackFilename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
    } catch (err) {
      console.error('Failed to download media', err);
      setErrorMsg('Unable to download media file.');
    } finally {
      setMediaLoading(messageId, false);
    }
  };

  const filteredContacts = contacts.filter(c =>
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.phone.includes(searchTerm)
  );

  const parseJsonObject = (value?: string | null): Record<string, unknown> => {
    if (!value) return {};
    try {
      const parsed = JSON.parse(value) as unknown;
      return parsed && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : {};
    } catch {
      return {};
    }
  };

  const getStringValue = (value: unknown): string | undefined =>
    typeof value === 'string' && value.trim() ? value : undefined;

  const getNumberValue = (value: unknown): number | undefined =>
    typeof value === 'number' ? value : undefined;

  const selectedContact = contacts.find(c => c.phone === to);

  const formatMessageContent = (msg: Message) => {
    const payload = parseJsonObject(msg.payloadJson);
    const response = parseJsonObject(msg.responseJson);
    const type =
      (getStringValue(payload.type) || getStringValue(msg.messageType) || '').toLowerCase();

    if (!type && !Object.keys(payload).length) return <em>(No Content)</em>;

    const mediaFromPayload = (key: string) => {
      const value = payload[key];
      if (value && typeof value === 'object') return value as Record<string, unknown>;
      return {};
    };

    const renderMediaActions = (messageId: string, filename?: string, showLoadPreview = false) => {
      const isLoading = !!mediaLoadingById[messageId];
      return (
        <div className="flex items-center gap-2 pt-1">
          {showLoadPreview && !mediaPreviewUrls[messageId] && (
            <button
              type="button"
              onClick={() => loadMediaPreview(messageId)}
              className="text-xs text-[#008069] hover:underline font-medium"
              disabled={isLoading}
            >
              {isLoading ? 'Loading...' : 'Load preview'}
            </button>
          )}
          <button
            type="button"
            onClick={() => handleOpenMedia(messageId)}
            className="text-xs text-[#008069] hover:underline font-medium"
          >
            Open
          </button>
          <button
            type="button"
            onClick={() => handleDownloadMedia(messageId, filename || 'download')}
            className="text-xs text-[#008069] hover:underline font-medium"
            disabled={isLoading}
          >
            {isLoading ? 'Please wait...' : 'Download'}
          </button>
        </div>
      );
    };

    // Text -- handle both outgoing payload format and incoming webhook format
    if (type === 'text') {
      const textObj = payload.text;
      if (textObj && typeof textObj === 'object') {
        const body = getStringValue((textObj as Record<string, unknown>).body);
        if (body) return body;
      }
      // Normalized responseJson format or flat payload
      return getStringValue(response.text) || getStringValue(payload.body) || 'Text message';
    }
    // Also handle if payload.text exists without explicit type
    const textObj = payload.text;
    if (textObj && typeof textObj === 'object') {
      const body = getStringValue((textObj as Record<string, unknown>).body);
      if (body) return body;
    }

    // Template
    if (type === 'template' || getStringValue(payload.templateName)) {
      const templateName = getStringValue(payload.templateName) || getStringValue((payload.template as Record<string, unknown>)?.name);
      const variableSource =
        payload.variables && typeof payload.variables === 'object'
          ? (payload.variables as Record<string, unknown>)
          : {};
      const resolveVars = (text: string) =>
        text.replace(/\{\{\s*([^}]+?)\s*\}\}/g, (_m, key: string) => {
          const raw = variableSource[key];
          return raw === undefined || raw === null ? `{{${key}}}` : String(raw);
        });

      // Try to parse body as components JSON (from Template entity's contentJson)
      const bodyRaw = payload.body;
      let headerText = '';
      let bodyText = '';
      let footerText = '';
      let buttons: Array<Record<string, unknown>> = [];

      if (typeof bodyRaw === 'string') {
        try {
          const parsed = JSON.parse(bodyRaw);
          if (Array.isArray(parsed)) {
            // Components array format: [{type:"HEADER",...},{type:"BODY",...},{type:"FOOTER",...},{type:"BUTTONS",...}]
            for (const comp of parsed) {
              if (comp.type === 'HEADER' && comp.text) headerText = resolveVars(comp.text);
              if (comp.type === 'BODY' && comp.text) bodyText = resolveVars(comp.text);
              if (comp.type === 'FOOTER' && comp.text) footerText = comp.text;
              if (comp.type === 'BUTTONS' && Array.isArray(comp.buttons)) buttons = comp.buttons;
            }
          }
        } catch {
          // Not JSON -- treat as plain body text
          bodyText = resolveVars(bodyRaw);
        }
        if (!bodyText) bodyText = resolveVars(bodyRaw);
      }

      // Fallback: body directly on payload
      if (!bodyText && typeof bodyRaw !== 'string') {
        const fallback = getStringValue((payload.template as Record<string, unknown>)?.body) || '';
        bodyText = resolveVars(fallback);
      }

      return (
        <div className="space-y-1">
          <span className="font-semibold text-[10px] text-gray-500 uppercase block tracking-wide">
            Template: {templateName || 'template_message'}
          </span>
          {headerText && (
            <div className="text-xs font-semibold text-gray-600 border-b border-black/5 pb-1">{headerText}</div>
          )}
          <span className="whitespace-pre-wrap">{bodyText || 'Template message sent'}</span>
          {footerText && (
            <div className="text-[11px] text-gray-400 border-t border-black/5 pt-1 mt-1">{footerText}</div>
          )}
          {buttons.length > 0 && (
            <div className="flex flex-wrap gap-1 pt-1 border-t border-black/5 mt-1">
              {buttons.map((btn, i) => (
                <span key={i} className="inline-block px-3 py-1 bg-white/80 border border-gray-200 rounded-full text-xs text-[#008069] font-medium">
                  {getStringValue(btn.text) || `Button ${i + 1}`}
                </span>
              ))}
            </div>
          )}
        </div>
      );
    }

    // Image
    if (type === 'image' || payload.image) {
      const image = mediaFromPayload('image');
      const imageUrl = mediaPreviewUrls[msg.id];
      const caption = getStringValue(image.caption) || getStringValue(response.caption);
      return (
        <div className="space-y-1">
          {imageUrl ? (
            <img src={imageUrl} alt={caption || 'Incoming image'} className="max-w-56 rounded-lg" />
          ) : (
            <span>Image message</span>
          )}
          {caption && <p className="text-xs text-gray-600">{caption}</p>}
          {renderMediaActions(msg.id, 'image', true)}
        </div>
      );
    }

    // Video
    if (type === 'video' || payload.video) {
      const videoUrl = mediaPreviewUrls[msg.id];
      return (
        <div className="space-y-1">
          {videoUrl ? (
            <video controls className="max-w-56 rounded-lg">
              <source src={videoUrl} />
            </video>
          ) : (
            <span>Video message</span>
          )}
          {renderMediaActions(msg.id, 'video', true)}
        </div>
      );
    }

    // Audio
    if (type === 'audio' || payload.audio) {
      const audioUrl = mediaPreviewUrls[msg.id];
      return (
        <div className="space-y-1">
          {audioUrl ? (
            <audio controls className="w-56">
              <source src={audioUrl} />
            </audio>
          ) : (
            <span>Audio message</span>
          )}
          {renderMediaActions(msg.id, 'audio', true)}
        </div>
      );
    }

    // Document
    if (type === 'document' || payload.document) {
      const document = mediaFromPayload('document');
      const docUrl = getStringValue(document.url);
      const filename =
        getStringValue(document.filename) ||
        getStringValue(response.filename) ||
        'document';
      const mimeType = getStringValue(document.mime_type) || getStringValue(response.mimeType);
      return (
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-lg bg-[#008069]/10 flex items-center justify-center flex-shrink-0">
              <svg className="w-5 h-5 text-[#008069]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
            </div>
            <div className="min-w-0">
              <div className="text-sm font-medium truncate">{filename}</div>
              {mimeType && <div className="text-[11px] text-gray-500">{mimeType}</div>}
            </div>
          </div>
          {!docUrl && <div className="text-[11px] text-gray-400">Using backend media API.</div>}
          {renderMediaActions(msg.id, filename)}
        </div>
      );
    }

    // Sticker
    if (type === 'sticker' || payload.sticker) {
      const stickerUrl = mediaPreviewUrls[msg.id];
      return (
        <div className="space-y-1">
          {stickerUrl ? (
            <img src={stickerUrl} alt="Sticker" className="max-w-28 rounded-lg" />
          ) : (
            <span>Sticker</span>
          )}
          {renderMediaActions(msg.id, 'sticker.webp', true)}
        </div>
      );
    }

    // Location
    if (type === 'location' || payload.location) {
      const locationObj =
        (payload.location && typeof payload.location === 'object' ? (payload.location as Record<string, unknown>) : {}) ||
        {};
      const latitude = getNumberValue(locationObj.latitude) ?? getNumberValue(response.latitude);
      const longitude = getNumberValue(locationObj.longitude) ?? getNumberValue(response.longitude);
      const name = getStringValue(locationObj.name) || getStringValue(response.name) || 'Location';
      const address = getStringValue(locationObj.address) || getStringValue(response.address);
      const mapUrl =
        latitude !== undefined && longitude !== undefined
          ? `https://maps.google.com/?q=${latitude},${longitude}`
          : undefined;

      return (
        <div className="space-y-1">
          <div className="font-medium text-sm">{name}</div>
          {address && <div className="text-xs text-gray-600">{address}</div>}
          {latitude !== undefined && longitude !== undefined && (
            <div className="text-xs text-gray-500">
              {latitude.toFixed(6)}, {longitude.toFixed(6)}
            </div>
          )}
          {mapUrl && (
            <a
              href={mapUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-[#008069] hover:underline font-medium inline-block mt-0.5"
            >
              Open in Maps
            </a>
          )}
        </div>
      );
    }

    // Contacts
    if (type === 'contacts' || payload.contacts) {
      const contactsRaw =
        Array.isArray(payload.contacts) ? (payload.contacts as Array<Record<string, unknown>>) : [];
      const first = contactsRaw[0];
      const nameObj = first?.name && typeof first.name === 'object' ? (first.name as Record<string, unknown>) : {};
      const formattedName = getStringValue(nameObj.formatted_name) || 'Contact shared';
      const phones = Array.isArray(first?.phones) ? (first.phones as Array<Record<string, unknown>>) : [];
      const firstPhone = getStringValue(phones[0]?.phone);
      return (
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
            <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
          </div>
          <div>
            <div className="text-sm font-medium">{formattedName}</div>
            {firstPhone && <div className="text-xs text-gray-500">{firstPhone}</div>}
          </div>
        </div>
      );
    }

    // Interactive
    if (type === 'interactive' || payload.interactive) {
      const interactive =
        payload.interactive && typeof payload.interactive === 'object'
          ? (payload.interactive as Record<string, unknown>)
          : {};
      const interactiveType = getStringValue(interactive.type);
      const bodyObj = interactive.body && typeof interactive.body === 'object'
        ? (interactive.body as Record<string, unknown>) : {};
      const bodyText = getStringValue(bodyObj.text);
      const actionObj = interactive.action && typeof interactive.action === 'object'
        ? (interactive.action as Record<string, unknown>) : {};

      // Incoming interactive reply
      const buttonReply = interactive.button_reply && typeof interactive.button_reply === 'object'
        ? (interactive.button_reply as Record<string, unknown>) : {};
      const listReply = interactive.list_reply && typeof interactive.list_reply === 'object'
        ? (interactive.list_reply as Record<string, unknown>) : {};
      if (getStringValue(buttonReply.title) || getStringValue(listReply.title)) {
        const replyTitle = getStringValue(buttonReply.title) || getStringValue(listReply.title);
        const replyDesc = getStringValue(listReply.description);
        return (
          <div>
            <div className="inline-block px-3 py-1.5 bg-[#008069]/10 border border-[#008069]/20 rounded-full text-sm font-medium text-[#008069]">
              {replyTitle}
            </div>
            {replyDesc && <p className="text-xs text-gray-500 mt-1">{replyDesc}</p>}
          </div>
        );
      }

      // Outgoing interactive (buttons or list)
      const headerObj = interactive.header && typeof interactive.header === 'object'
        ? (interactive.header as Record<string, unknown>) : {};
      const headerType = getStringValue(headerObj.type);
      const headerTextVal = getStringValue(headerObj.text);
      const footerObj = interactive.footer && typeof interactive.footer === 'object'
        ? (interactive.footer as Record<string, unknown>) : {};
      const footerText = getStringValue(footerObj.text);

      return (
        <div className="space-y-2">
          {headerTextVal && headerType === 'text' && (
            <div className="text-xs font-semibold text-gray-600">{headerTextVal}</div>
          )}
          {bodyText && <p>{bodyText}</p>}
          {footerText && (
            <div className="text-[11px] text-gray-400">{footerText}</div>
          )}
          {interactiveType === 'button' && Array.isArray(actionObj.buttons) && (
            <div className="flex flex-wrap gap-1 mt-1">
              {(actionObj.buttons as Array<Record<string, unknown>>).map((btn, i) => {
                const reply = btn.reply && typeof btn.reply === 'object' ? (btn.reply as Record<string, unknown>) : {};
                return (
                  <span key={i} className="inline-block px-3 py-1 bg-white/80 border border-gray-200 rounded-full text-xs text-[#008069] font-medium">
                    {getStringValue(reply.title) || `Button ${i + 1}`}
                  </span>
                );
              })}
            </div>
          )}
          {interactiveType === 'list' && Array.isArray(actionObj.sections) && (
            <div className="space-y-1 mt-1">
              {(actionObj.sections as Array<Record<string, unknown>>).map((section, si) => (
                <div key={si}>
                  {getStringValue(section.title) && (
                    <p className="text-xs font-semibold text-gray-500 uppercase">{getStringValue(section.title)}</p>
                  )}
                  {Array.isArray(section.rows) && (section.rows as Array<Record<string, unknown>>).map((row, ri) => (
                    <div key={ri} className="text-xs pl-2 border-l-2 border-[#008069]/30 ml-1 py-0.5">
                      <span className="font-medium">{getStringValue(row.title)}</span>
                      {getStringValue(row.description) && <span className="text-gray-400 ml-1">- {getStringValue(row.description)}</span>}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}
          {!bodyText && !interactiveType && <span>Interactive message</span>}
        </div>
      );
    }

    // Reaction
    if (type === 'reaction' || payload.reaction) {
      const reaction =
        payload.reaction && typeof payload.reaction === 'object'
          ? (payload.reaction as Record<string, unknown>)
          : {};
      const emoji = getStringValue(reaction.emoji) || getStringValue(response.emoji) || '';
      return (
        <span className="text-2xl" title={`Reaction: ${emoji}`}>{emoji || 'Reaction removed'}</span>
      );
    }

    return <span>{type ? `${type.toUpperCase()} message` : JSON.stringify(payload)}</span>;
  };

  const renderStatusTicks = (msg: Message) => {
    if (msg.direction !== 'OUTGOING') return null;
    switch (msg.status) {
      case 'READ':
        return <CheckCheck className="w-3.5 h-3.5 text-blue-500" />;
      case 'DELIVERED':
        return <CheckCheck className="w-3.5 h-3.5 text-gray-400" />;
      case 'SENT':
        return <Check className="w-3.5 h-3.5 text-gray-400" />;
      case 'FAILED':
        return <span className="text-[10px] text-red-500 font-medium">Failed</span>;
      default:
        return <Check className="w-3.5 h-3.5 text-gray-300" />;
    }
  };

  return (
    <div className="h-[calc(100vh-140px)] flex flex-col">
      {/* Page Header */}
      <div className="mb-4">
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Quick Send & Chat</h1>
        <p className="text-sm text-gray-500 mt-0.5">Chat with contacts and send templates instantly.</p>
      </div>

      {/* Error bar */}
      {errorMsg && (
        <div className="mb-3 text-sm text-red-700 bg-red-50 border border-red-200/60 rounded-xl px-4 py-2 flex items-center justify-between">
          <span>{errorMsg}</span>
          <button onClick={() => setErrorMsg('')} className="text-red-400 hover:text-red-600 text-xs">Dismiss</button>
        </div>
      )}

      <div className="flex flex-col lg:flex-row gap-0 flex-1 min-h-0 rounded-2xl overflow-hidden border border-gray-200 bg-white shadow-sm">
        {/* ═══ Left Sidebar - Contact List ═══ */}
        <div className="w-full lg:w-80 border-r border-gray-100 flex flex-col bg-white">
          {/* Sidebar Header */}
          <div className="p-4 border-b border-gray-100">
            <h3 className="font-semibold text-gray-900 mb-3 text-sm">Contacts</h3>
            <SearchBar
              placeholder="Search contacts..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              size="sm"
            />
          </div>

          {/* Contact List */}
          <div className="overflow-y-auto flex-1">
            {filteredContacts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                <Phone className="w-8 h-8 mb-2 opacity-30" />
                <p className="text-sm">No contacts found</p>
              </div>
            ) : (
              filteredContacts.map(contact => {
                const isActive = to === contact.phone;
                return (
                  <button
                    key={contact.id}
                    onClick={() => handleContactSelect(contact.phone)}
                    className={cn(
                      'w-full flex items-center gap-3 px-4 py-3 transition-all duration-150 text-left border-l-[3px]',
                      isActive
                        ? 'bg-[#008069]/5 border-l-[#008069]'
                        : 'border-l-transparent hover:bg-gray-50'
                    )}
                  >
                    <Avatar name={contact.name} size="md" />
                    <div className="flex-1 min-w-0">
                      <p className={cn(
                        'text-sm font-medium truncate',
                        isActive ? 'text-[#008069]' : 'text-gray-900'
                      )}>
                        {contact.name}
                      </p>
                      <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                        <Phone className="w-3 h-3" />
                        {contact.phone}
                      </p>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* ═══ Right Side - Chat Area ═══ */}
        <div className="flex-1 flex flex-col min-h-0">
          {!to ? (
            /* No contact selected */
            <div className="flex-1 flex items-center justify-center bg-[#f0ebe4]">
              <EmptyState
                icon={MessageSquare}
                title="Select a conversation"
                description="Choose a contact from the sidebar to start chatting."
                className="py-0"
              />
            </div>
          ) : (
            <>
              {/* Chat Header */}
              <div className="px-5 py-3 bg-white border-b border-gray-100 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Avatar name={selectedContact?.name || to} size="md" />
                  <div>
                    <h3 className="font-semibold text-gray-900 text-sm">
                      {selectedContact?.name || to}
                    </h3>
                    <p className="text-xs text-gray-400">{to}</p>
                  </div>
                </div>
                <Button variant="ghost" size="sm" onClick={() => loadHistory(to)} disabled={historyLoading}>
                  <RefreshCw className={cn('w-4 h-4', historyLoading && 'animate-spin')} />
                </Button>
              </div>

              {/* Chat Messages */}
              <div
                className="flex-1 overflow-y-auto px-6 py-4 space-y-1"
                ref={chatContainerRef}
                style={{
                  backgroundColor: '#efeae2',
                  backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23c8c4bc' fill-opacity='0.15'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
                }}
              >
                {historyLoading && messages.length === 0 ? (
                  <div className="flex items-center justify-center h-full">
                    <RefreshCw className="w-6 h-6 text-gray-400 animate-spin" />
                  </div>
                ) : messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-gray-400">
                    <MessageSquare className="w-10 h-10 mb-2 opacity-20" />
                    <p className="text-sm">No messages yet. Start the conversation!</p>
                  </div>
                ) : (
                  messages.map((msg) => {
                    const isOutgoing = msg.direction === 'OUTGOING';
                    return (
                      <div key={msg.id} className={cn('group flex mb-1', isOutgoing ? 'justify-end' : 'justify-start')}>
                        <div
                          className={cn(
                            'relative max-w-[70%] rounded-lg p-2.5 shadow-sm',
                            isOutgoing
                              ? 'bg-[#d9fdd3] rounded-tr-none'
                              : 'bg-white rounded-tl-none'
                          )}
                        >
                          {/* Bubble tail */}
                          {isOutgoing ? (
                            <div className="absolute -right-2 top-0 w-0 h-0 border-t-[8px] border-t-[#d9fdd3] border-r-[8px] border-r-transparent" />
                          ) : (
                            <div className="absolute -left-2 top-0 w-0 h-0 border-t-[8px] border-t-white border-l-[8px] border-l-transparent" />
                          )}

                          {/* Reply button (visible on hover) */}
                          <button
                            type="button"
                            onClick={() => setReplyTo(msg)}
                            className="absolute -top-2 right-1 opacity-0 group-hover:opacity-100 transition-opacity bg-white border border-gray-200 rounded-full p-1 shadow-sm hover:bg-gray-50 z-10"
                            title="Reply"
                          >
                            <Reply className="w-3 h-3 text-gray-500" />
                          </button>

                          {/* Reply context (if this message is a reply) */}
                          {msg.contextMessageId && (
                            <div className="text-xs bg-black/5 rounded-md px-2.5 py-1.5 mb-2 border-l-2 border-[#008069] truncate">
                              Replying to a message
                            </div>
                          )}

                          {/* Message content */}
                          <div className="text-[13px] leading-relaxed text-gray-800">
                            {formatMessageContent(msg)}
                          </div>

                          {/* Timestamp + status */}
                          <div className="flex items-center justify-end gap-1 mt-1">
                            <span className="text-[10px] text-gray-500">
                              {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                            {renderStatusTicks(msg)}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Message Composer */}
              <div className="bg-[#f0f0f0] border-t border-gray-200 px-4 py-3">
                <MessageComposer
                  to={to}
                  onSent={() => loadHistory(to)}
                  replyTo={replyTo}
                  onCancelReply={() => setReplyTo(null)}
                  disabled={!to}
                  showPhoneInput={false}
                  onPhoneChange={setTo}
                />
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default QuickSend;
