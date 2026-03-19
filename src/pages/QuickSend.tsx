import React, { useState, useEffect, useRef } from 'react';
import { MessageSquare, Search, Phone, RefreshCw, User, Reply } from 'lucide-react';
import {
  getMessageHistory,
  fetchMessageMedia,
} from '../services/messageService';
import { getContacts } from '../services/contactService';
import type { ContactResponse, Message } from '../types';
import { Card, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
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
              className="text-xs text-blue-600 hover:underline"
              disabled={isLoading}
            >
              {isLoading ? 'Loading...' : 'Load preview'}
            </button>
          )}
          <button
            type="button"
            onClick={() => handleOpenMedia(messageId)}
            className="text-xs text-blue-600 hover:underline"
          >
            Open
          </button>
          <button
            type="button"
            onClick={() => handleDownloadMedia(messageId, filename || 'download')}
            className="text-xs text-blue-600 hover:underline"
            disabled={isLoading}
          >
            {isLoading ? 'Please wait...' : 'Download'}
          </button>
        </div>
      );
    };

    // Text — handle both outgoing payload format and incoming webhook format
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
          // Not JSON — treat as plain body text
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
          <span className="font-semibold text-xs text-gray-500 uppercase block">
            Template: {templateName || 'template_message'}
          </span>
          {headerText && (
            <div className="text-xs font-semibold text-gray-600 border-b border-gray-200 pb-1">{headerText}</div>
          )}
          <span className="whitespace-pre-wrap">{bodyText || 'Template message sent'}</span>
          {footerText && (
            <div className="text-xs text-gray-400 border-t border-gray-200 pt-1 mt-1">{footerText}</div>
          )}
          {buttons.length > 0 && (
            <div className="flex flex-wrap gap-1 pt-1 border-t border-gray-200 mt-1">
              {buttons.map((btn, i) => (
                <span key={i} className="inline-block px-3 py-1 bg-white border border-gray-300 rounded-full text-xs text-blue-600 font-medium">
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
            <img src={imageUrl} alt={caption || 'Incoming image'} className="max-w-56 rounded-md border border-gray-200" />
          ) : (
            <span>📷 Image message</span>
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
            <video controls className="max-w-56 rounded-md border border-gray-200">
              <source src={videoUrl} />
            </video>
          ) : (
            <span>🎥 Video message</span>
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
            <span>🎵 Audio message</span>
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
          <div className="text-sm">📄 {filename}</div>
          {mimeType && <div className="text-xs text-gray-500">{mimeType}</div>}
          {!docUrl && <div className="text-xs text-gray-500">Document URL not stored in payload; using backend media API.</div>}
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
            <img src={stickerUrl} alt="Sticker" className="max-w-28 rounded-md border border-gray-200" />
          ) : (
            <span>🧩 Sticker</span>
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
          <div>📍 {name}</div>
          {address && <div className="text-xs text-gray-600">{address}</div>}
          {latitude !== undefined && longitude !== undefined && (
            <div className="text-xs text-gray-600">
              {latitude.toFixed(6)}, {longitude.toFixed(6)}
            </div>
          )}
          {mapUrl && (
            <a
              href={mapUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-blue-600 hover:underline"
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
        <div>
          👤 {formattedName}
          {firstPhone && <div className="text-xs text-gray-600 mt-1">{firstPhone}</div>}
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
            <div className="inline-block px-3 py-1.5 bg-blue-50 border border-blue-200 rounded-full text-sm font-medium text-blue-700">
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
            <div className="text-xs text-gray-400">{footerText}</div>
          )}
          {interactiveType === 'button' && Array.isArray(actionObj.buttons) && (
            <div className="flex flex-wrap gap-1 mt-1">
              {(actionObj.buttons as Array<Record<string, unknown>>).map((btn, i) => {
                const reply = btn.reply && typeof btn.reply === 'object' ? (btn.reply as Record<string, unknown>) : {};
                return (
                  <span key={i} className="inline-block px-3 py-1 bg-white border border-gray-300 rounded-full text-xs text-blue-600 font-medium">
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
                    <div key={ri} className="text-xs pl-2 border-l-2 border-gray-200 ml-1 py-0.5">
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

  return (
    <div className="space-y-6 h-[calc(100vh-140px)] flex flex-col">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Quick Send & Chat</h1>
        <p className="text-gray-500 mt-1">Chat with contacts and send templates instantly.</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-6 flex-1 min-h-0">
        {/* Left Sidebar - Contact List */}
        <div className="w-full lg:w-80 bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col">
          <div className="p-4 border-b border-gray-100 bg-gray-50/50">
            <h3 className="font-semibold text-gray-900 mb-3">Contacts</h3>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input 
                type="text"
                placeholder="Search..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-whatsapp-teal focus:border-transparent outline-none"
              />
            </div>
          </div>
          
          <div className="overflow-y-auto flex-1 p-2 space-y-1">
            {filteredContacts.length === 0 ? (
              <div className="text-center py-8 text-gray-500 text-sm">
                No contacts found.
              </div>
            ) : (
              filteredContacts.map(contact => (
                <button
                  key={contact.id}
                  onClick={() => handleContactSelect(contact.phone)}
                  className={`w-full flex items-center gap-3 p-3 rounded-lg transition-colors text-left ${
                    to === contact.phone 
                      ? 'bg-green-50 border border-green-100' 
                      : 'hover:bg-gray-50 border border-transparent'
                  }`}
                >
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold ${
                    to === contact.phone ? 'bg-green-200 text-green-800' : 'bg-gray-100 text-gray-600'
                  }`}>
                    {contact.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium truncate ${to === contact.phone ? 'text-green-900' : 'text-gray-900'}`}>
                      {contact.name}
                    </p>
                    <p className="text-xs text-gray-500 flex items-center gap-1">
                      <Phone className="w-3 h-3" />
                      {contact.phone}
                    </p>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Right Side - Chat & Form */}
        <div className="flex-1 flex flex-col gap-4 min-h-0">
          
          {/* Chat Window */}
          <Card className="flex-1 flex flex-col min-h-0 bg-[#efeae2]">
             <div className="p-4 bg-white border-b border-gray-200 flex justify-between items-center shadow-sm z-10">
                 <div className="flex items-center gap-3">
                     <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
                         <User className="text-gray-500 w-6 h-6" />
                     </div>
                     <div>
                        <h3 className="font-semibold text-gray-900">
                            {contacts.find(c => c.phone === to)?.name || to || 'Select a Contact'}
                        </h3>
                        {to && <p className="text-xs text-gray-500">{to}</p>}
                     </div>
                 </div>
                 {to && (
                     <Button variant="outline" size="sm" onClick={() => loadHistory(to)} disabled={historyLoading}>
                         <RefreshCw className={`w-4 h-4 ${historyLoading ? 'animate-spin' : ''}`} />
                     </Button>
                 )}
             </div>

             <div className="flex-1 overflow-y-auto p-6 space-y-4" ref={chatContainerRef}>
                {!to ? (
                    <div className="h-full flex flex-col items-center justify-center text-gray-400">
                        <MessageSquare className="w-12 h-12 mb-2 opacity-20" />
                        <p>Select a contact to view history</p>
                    </div>
                ) : messages.length === 0 ? (
                    <div className="h-full flex items-center justify-center text-gray-400 text-sm">
                        No messages yet. Start the conversation!
                    </div>
                ) : (
                    messages.map((msg) => {
                        const isOutgoing = msg.direction === 'OUTGOING';
                        return (
                            <div key={msg.id} className={`group flex ${isOutgoing ? 'justify-end' : 'justify-start'}`}>
                                <div className={`max-w-[70%] rounded-lg p-3 shadow-sm relative ${
                                    isOutgoing
                                        ? 'bg-[#d9fdd3] text-gray-800 rounded-tr-none'
                                        : 'bg-white text-gray-800 rounded-tl-none'
                                }`}>
                                    {/* Reply button (visible on hover) */}
                                    <button
                                      type="button"
                                      onClick={() => setReplyTo(msg)}
                                      className="absolute -top-2 right-1 opacity-0 group-hover:opacity-100 transition-opacity bg-white border border-gray-200 rounded-full p-1 shadow-sm hover:bg-gray-50"
                                      title="Reply"
                                    >
                                      <Reply className="w-3 h-3 text-gray-500" />
                                    </button>

                                    {/* Reply context (if this message is a reply) */}
                                    {msg.contextMessageId && (
                                      <div className="text-xs bg-black/5 rounded px-2 py-1 mb-1 border-l-2 border-whatsapp-teal truncate">
                                        Replying to a message
                                      </div>
                                    )}

                                    <div className="text-sm">
                                        {formatMessageContent(msg)}
                                    </div>
                                    <div className="text-[10px] text-gray-500 mt-1 text-right flex items-center justify-end gap-1">
                                        {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute:'2-digit' })}
                                        {isOutgoing && (
                                            <span className={msg.status === 'READ' ? 'text-blue-500' : 'text-gray-400'}>
                                                {msg.status === 'READ' ? '✓✓' : '✓'}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })
                )}
             </div>
          </Card>

          {/* Send Area */}
          <Card className="flex-shrink-0">
            <CardContent className="p-4">
              <MessageComposer
                to={to}
                onSent={() => loadHistory(to)}
                replyTo={replyTo}
                onCancelReply={() => setReplyTo(null)}
                disabled={!to}
                showPhoneInput={!to}
                onPhoneChange={setTo}
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default QuickSend;
