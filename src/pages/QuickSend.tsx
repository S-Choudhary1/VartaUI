import React, { useState, useEffect, useRef } from 'react';
import { Send, MessageSquare, Search, Phone, RefreshCw, User } from 'lucide-react';
import {
  sendMessage,
  getMessageHistory,
  fetchMessageMedia,
  sendMediaMessage,
  type OutboundMessageType,
} from '../services/messageService';
import { getTemplates } from '../services/templateService';
import { getContacts } from '../services/contactService';
import type { Template, ContactResponse, Message } from '../types';
import { Card, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';

const QuickSend = () => {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [contacts, setContacts] = useState<ContactResponse[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [mediaPreviewUrls, setMediaPreviewUrls] = useState<Record<string, string>>({});
  const [mediaLoadingById, setMediaLoadingById] = useState<Record<string, boolean>>({});
  const mediaPreviewUrlsRef = useRef<Record<string, string>>({});

  // Form
  const [to, setTo] = useState('');
  const [sendType, setSendType] = useState<OutboundMessageType>('TEXT');
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [variables, setVariables] = useState<Record<string, string>>({});
  const [textMessage, setTextMessage] = useState('Hello');
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [mediaCaption, setMediaCaption] = useState('');

  // Contact Search
  const [searchTerm, setSearchTerm] = useState('');

  // Chat Scroll
  const chatContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    getTemplates().then(setTemplates).catch(console.error);
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

  const handleTemplateChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const tmplId = e.target.value;
    setSelectedTemplate(tmplId);
    setVariables({});
    
    const tmpl = templates.find(t => t.id === tmplId);
    if (tmpl && tmpl.content && typeof tmpl.content === 'string') {
      const matches = tmpl.content.match(/{{(\d+)}}/g);
      if (matches) {
        const initialVars: Record<string, string> = {};
        matches.forEach(m => {
          const key = m.replace('{{', '').replace('}}', '');
          initialVars[key] = '';
        });
        setVariables(initialVars);
      }
    }
  };

  const handleVariableChange = (key: string, value: string) => {
    setVariables(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const isFileCompatible = (file: File, type: OutboundMessageType) => {
    if (type === 'IMAGE') return file.type.startsWith('image/');
    if (type === 'VIDEO') return file.type.startsWith('video/');
    if (type === 'DOCUMENT') return true;
    return false;
  };

  const getFileAcceptByType = (type: OutboundMessageType) => {
    if (type === 'IMAGE') return 'image/*';
    if (type === 'VIDEO') return 'video/*';
    if (type === 'DOCUMENT') return '.pdf,.doc,.docx,.txt,.csv,.xls,.xlsx,application/*';
    return '*/*';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      if (sendType === 'TEMPLATE') {
        if (!selectedTemplate) {
          setErrorMsg('Please select a template.');
          return;
        }
        await sendMessage({
          to,
          messageType: 'TEMPLATE',
          templateId: selectedTemplate,
          variables: Object.keys(variables).length > 0 ? variables : undefined,
        });
      } else if (sendType === 'TEXT') {
        if (!textMessage.trim()) {
          setErrorMsg('Please enter a text message.');
          return;
        }
        await sendMessage({
          to,
          messageType: 'TEXT',
          text: textMessage.trim(),
        });
      } else {
        if (!mediaFile) {
          setErrorMsg(`Please select a ${sendType.toLowerCase()} file.`);
          return;
        }
        if (!isFileCompatible(mediaFile, sendType)) {
          setErrorMsg(`Selected file is not valid for ${sendType.toLowerCase()}.`);
          return;
        }
        await sendMediaMessage({
          to,
          messageType: sendType,
          file: mediaFile,
          caption: mediaCaption.trim() || undefined,
        });
      }

      setSuccessMsg('Message sent successfully!');
      if (sendType === 'TEMPLATE') {
        setSelectedTemplate('');
        setVariables({});
      } else if (sendType === 'TEXT') {
        setTextMessage('');
      } else {
        setMediaFile(null);
        setMediaCaption('');
      }
      
      // Refresh history
      await loadHistory(to);
    } catch (err) {
      console.error(err);
        const maybeError = err as {
          response?: { data?: { message?: string; error?: string } };
          message?: string;
        };
        const apiMsg =
          maybeError.response?.data?.message ||
          maybeError.response?.data?.error ||
          maybeError.message ||
          "Failed to send message..";
      setErrorMsg(apiMsg);
    } finally {
      setLoading(false);
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

  const currentTemplate = templates.find(t => t.id === selectedTemplate);

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

    // Text
    const textObj = payload.text;
    if (textObj && typeof textObj === 'object') {
      const body = getStringValue((textObj as Record<string, unknown>).body);
      if (body) return body;
    }
    if (type === 'text') {
      return getStringValue(payload.body) || getStringValue(response.text) || 'Text message';
    }

    // Template
    if (type === 'template' || getStringValue(payload.templateName)) {
      const templateName = getStringValue(payload.templateName) || getStringValue((payload.template as Record<string, unknown>)?.name);
      const body = getStringValue(payload.body) || getStringValue((payload.template as Record<string, unknown>)?.body);
      return (
        <div>
          <span className="font-semibold text-xs text-gray-500 uppercase block mb-1">
            Template: {templateName || 'template_message'}
          </span>
          <span>{body || 'Template message sent'}</span>
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
      const buttonReply =
        interactive.button_reply && typeof interactive.button_reply === 'object'
          ? (interactive.button_reply as Record<string, unknown>)
          : {};
      const listReply =
        interactive.list_reply && typeof interactive.list_reply === 'object'
          ? (interactive.list_reply as Record<string, unknown>)
          : {};
      const title =
        getStringValue(buttonReply.title) ||
        getStringValue(listReply.title) ||
        getStringValue(interactive.type) ||
        'Interactive response';
      return <span>🧠 {title}</span>;
    }

    // Reaction
    if (type === 'reaction' || payload.reaction) {
      const reaction =
        payload.reaction && typeof payload.reaction === 'object'
          ? (payload.reaction as Record<string, unknown>)
          : {};
      const emoji = getStringValue(reaction.emoji) || getStringValue(response.emoji) || '';
      return <span>🙂 Reaction {emoji}</span>;
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
                            <div key={msg.id} className={`flex ${isOutgoing ? 'justify-end' : 'justify-start'}`}>
                                <div className={`max-w-[70%] rounded-lg p-3 shadow-sm ${
                                    isOutgoing 
                                        ? 'bg-[#d9fdd3] text-gray-800 rounded-tr-none' 
                                        : 'bg-white text-gray-800 rounded-tl-none'
                                }`}>
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
              <form onSubmit={handleSubmit} className="flex gap-4 items-end">
                 <div className="flex-1 space-y-4">
                    {!to && (
                        <Input
                            placeholder="Or type phone number..."
                            value={to}
                            onChange={(e) => setTo(e.target.value)}
                            className="mb-2"
                        />
                    )}
                    
                    <div>
                      <select
                        value={sendType}
                        onChange={(e) => {
                          const nextType = e.target.value as OutboundMessageType;
                          setSendType(nextType);
                          setErrorMsg('');
                          if (nextType !== 'TEMPLATE') {
                            setSelectedTemplate('');
                            setVariables({});
                          }
                          if (nextType === 'TEXT') {
                            setMediaFile(null);
                            setMediaCaption('');
                          }
                        }}
                        className="w-full h-10 px-3 py-2 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-whatsapp-teal focus:border-transparent text-sm"
                      >
                        <option value="TEXT">Text</option>
                        <option value="TEMPLATE">Template</option>
                        <option value="IMAGE">Image</option>
                        <option value="VIDEO">Video</option>
                        <option value="DOCUMENT">Document</option>
                      </select>
                    </div>

                    {sendType === 'TEXT' && (
                      <Input
                        placeholder="Type a message..."
                        value={textMessage}
                        onChange={(e) => setTextMessage(e.target.value)}
                      />
                    )}

                    {sendType === 'TEMPLATE' && (
                      <div className="space-y-3">
                        <div className="flex gap-2">
                          <div className="flex-1">
                            <select
                              value={selectedTemplate}
                              onChange={handleTemplateChange}
                              className="w-full h-10 px-3 py-2 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-whatsapp-teal focus:border-transparent text-sm"
                            >
                              <option value="">Select template...</option>
                              {templates.map((t) => (
                                <option key={t.id} value={t.id}>{t.name}</option>
                              ))}
                            </select>
                          </div>
                        </div>
                      </div>
                    )}

                    {sendType === 'TEMPLATE' && currentTemplate && Object.keys(variables).length > 0 && (
                        <div className="grid grid-cols-2 gap-2 bg-gray-50 p-3 rounded-lg border border-gray-100">
                             {Object.keys(variables).map(key => (
                                <input
                                    key={key}
                                    type="text"
                                    required
                                    value={variables[key]}
                                    onChange={(e) => handleVariableChange(key, e.target.value)}
                                    className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                                    placeholder={`{{${key}}}`}
                                />
                             ))}
                        </div>
                    )}

                    {(sendType === 'IMAGE' || sendType === 'VIDEO' || sendType === 'DOCUMENT') && (
                      <div className="space-y-2 rounded-lg border border-gray-200 p-3 bg-gray-50/60">
                        <input
                          type="file"
                          accept={getFileAcceptByType(sendType)}
                          onChange={(e) => setMediaFile(e.target.files?.[0] || null)}
                          className="block w-full text-sm text-gray-700 file:mr-3 file:rounded-md file:border-0 file:bg-gray-200 file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-gray-700 hover:file:bg-gray-300"
                        />
                        {mediaFile && (
                          <p className="text-xs text-gray-500">
                            Selected: {mediaFile.name}
                          </p>
                        )}
                        <Input
                          placeholder="Caption (optional)"
                          value={mediaCaption}
                          onChange={(e) => setMediaCaption(e.target.value)}
                        />
                      </div>
                    )}
                 </div>

                 <Button type="submit" disabled={loading || !to} className="h-10 px-6">
                    {loading ? '...' : <Send className="w-5 h-5" />}
                 </Button>
              </form>
              {errorMsg && <p className="text-red-500 text-xs mt-2">{errorMsg}</p>}
              {successMsg && <p className="text-green-500 text-xs mt-2">{successMsg}</p>}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default QuickSend;
