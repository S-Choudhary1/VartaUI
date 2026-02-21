import React, { useState, useEffect, useRef } from 'react';
import { Send, MessageSquare, AlertCircle, CheckCircle, Search, Phone, RefreshCw, User } from 'lucide-react';
import { sendMessage, getMessageHistory } from '../services/messageService';
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

  // Form
  const [to, setTo] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [variables, setVariables] = useState<Record<string, string>>({});
  const [textMessage, setTextMessage] = useState('Hello'); // Default text if no template

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      await sendMessage({
        to,
        templateId: selectedTemplate || undefined,
        variables: Object.keys(variables).length > 0 ? variables : undefined
      });
      setSuccessMsg('Message sent successfully!');
      // Clear form but keep 'to' to show updated history
      setSelectedTemplate('');
      setVariables({});
      
      // Refresh history
      await loadHistory(to);
    } catch (err) {
      console.error(err);
        const apiMsg =
          err.response?.data?.message ||
          err.response?.data?.error ||
          err.message ||
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

  const currentTemplate = templates.find(t => t.id === selectedTemplate);

  const filteredContacts = contacts.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    c.phone.includes(searchTerm)
  );

  const formatMessageContent = (msg: Message) => {
      if (!msg.payloadJson) return <em>(No Content)</em>;
      try {
          const payload = JSON.parse(msg.payloadJson) as Record<string, any>;
          const type = payload.type || payload.messages?.[0]?.type;

          // Text
          if (payload.text?.body) return payload.text.body;
          if (type === 'text' && payload.body) return payload.body;

          // Template
          if (type === 'template' || payload.templateName) {
            return (
              <div>
                <span className="font-semibold text-xs text-gray-500 uppercase block mb-1">
                  Template: {payload.templateName || payload.template?.name || 'template_message'}
                </span>
                <span>{payload.body || payload.template?.body || 'Template message sent'}</span>
                {payload.variables && Object.keys(payload.variables).length > 0 && (
                  <div className="mt-1 text-xs text-gray-500">Vars: {JSON.stringify(payload.variables)}</div>
                )}
              </div>
            );
          }

          // Media: image/video/audio/document/sticker
          if (payload.image || type === 'image') return <span>📷 Image message</span>;
          if (payload.video || type === 'video') return <span>🎥 Video message</span>;
          if (payload.audio || type === 'audio') return <span>🎵 Audio message</span>;
          if (payload.document || type === 'document') return <span>📄 Document message</span>;
          if (payload.sticker || type === 'sticker') return <span>🧩 Sticker</span>;

          // Interactive: button/list/reply
          if (payload.interactive || type === 'interactive') {
            const interactive = payload.interactive || payload.messages?.[0]?.interactive;
            const title =
              interactive?.button_reply?.title ||
              interactive?.list_reply?.title ||
              interactive?.nfm_reply?.name ||
              'Interactive response';
            return <span>🧠 {title}</span>;
          }

          // Location / contacts / reaction
          if (payload.location || type === 'location') {
            const name = payload.location?.name ? ` (${payload.location.name})` : '';
            return <span>📍 Location{name}</span>;
          }
          if (payload.contacts || type === 'contacts') return <span>👤 Contact card shared</span>;
          if (payload.reaction || type === 'reaction') {
            const emoji = payload.reaction?.emoji || payload.messages?.[0]?.reaction?.emoji || '';
            return <span>🙂 Reaction {emoji}</span>;
          }

          // Fallback
          if (type) return <span>{String(type).toUpperCase()} message</span>;
          return JSON.stringify(payload);
      } catch (e) {
          return msg.payloadJson;
      }
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
                    
                    <div className="flex gap-2">
                         <div className="flex-1">
                             <select
                                value={selectedTemplate}
                                onChange={handleTemplateChange}
                                className="w-full h-10 px-3 py-2 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-whatsapp-teal focus:border-transparent text-sm"
                            >
                                <option value="">Send simple text (Hello)</option>
                                {templates.map(t => (
                                    <option key={t.id} value={t.id}>{t.name}</option>
                                ))}
                            </select>
                         </div>
                    </div>

                    {currentTemplate && Object.keys(variables).length > 0 && (
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
