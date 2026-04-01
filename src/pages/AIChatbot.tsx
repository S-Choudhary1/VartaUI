import React, { useEffect, useState, useRef } from 'react';
import {
  Bot, Settings2, MessageSquare, History, Save, Loader2, Send,
  Trash2, ChevronDown, ChevronRight, Phone, Clock, Coins,
  Hash, Zap, Shield, AlertCircle, CheckCircle, Plus, Link2,
  Unlink, RefreshCw, X, BarChart3, TrendingUp, DollarSign, Users,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { cn } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Badge } from '../components/ui/Badge';
import { Tabs } from '../components/ui/Tabs';
import { Modal } from '../components/ui/Modal';
import { EmptyState } from '../components/ui/EmptyState';
import type { AiChatbotConfig, AiProvider, AiConversation, AiMessageLog, McpServerRegistry, McpConnection, McpRequiredField } from '../types';
import {
  getChatbotConfig,
  saveChatbotConfig,
  toggleChatbot,
  testChatbot,
  getConversations,
  getConversationMessages,
  getAnalytics,
} from '../services/chatbotService';
import type { AiAnalytics } from '../services/chatbotService';
import {
  listMcpServers,
  listMcpConnections,
  connectMcpServer,
  disconnectMcpServer,
  testMcpConnection,
} from '../services/mcpService';

// ─── Constants ───────────────────────────────────────────────

const MODEL_HINTS: Record<AiProvider, string> = {
  ANTHROPIC: 'e.g. claude-sonnet-4-20250514, claude-haiku-4-5-20251001',
  OPENAI: 'e.g. gpt-4o, gpt-4o-mini, gpt-3.5-turbo',
  GOOGLE: 'e.g. gemini-2.0-flash, gemini-1.5-pro',
};

const PROVIDER_OPTIONS: { value: AiProvider; label: string }[] = [
  { value: 'ANTHROPIC', label: 'Anthropic' },
  { value: 'OPENAI', label: 'OpenAI' },
  { value: 'GOOGLE', label: 'Google' },
];

const DEFAULT_CONFIG: AiChatbotConfig = {
  name: '',
  enabled: false,
  provider: 'ANTHROPIC',
  model: 'claude-sonnet-4-20250514',
  systemPrompt: '',
  maxTokens: 1024,
  temperature: 0.7,
  fallbackMessage: "I'm sorry, I couldn't process your request. Please try again or type 'agent' to speak with a human.",
  humanHandoffEnabled: true,
  humanHandoffKeyword: 'agent',
  maxConversationTurns: 20,
  conversationTimeoutHours: 24,
  maxMessagesPerDayPerContact: 50,
};

const TAB_LIST = [
  { id: 'config', label: 'Configuration', icon: Settings2 },
  { id: 'test', label: 'Test Chat', icon: MessageSquare },
  { id: 'conversations', label: 'Conversations', icon: History },
  { id: 'analytics', label: 'Analytics', icon: BarChart3 },
];

// ─── Chat message type for Test Chat ─────────────────────────

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  tokensInput?: number;
  tokensOutput?: number;
  latencyMs?: number;
}

// ═══════════════════════════════════════════════════════════════
//  MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════

const AIChatbot: React.FC = () => {
  // ─── State ────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState('config');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toggling, setToggling] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Config form
  const [config, setConfig] = useState<AiChatbotConfig>(DEFAULT_CONFIG);
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [isExistingConfig, setIsExistingConfig] = useState(false);

  // Test chat
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // MCP Servers
  const [mcpServers, setMcpServers] = useState<McpServerRegistry[]>([]);
  const [mcpConnections, setMcpConnections] = useState<McpConnection[]>([]);
  const [mcpLoading, setMcpLoading] = useState(false);
  const [mcpModalOpen, setMcpModalOpen] = useState(false);
  const [selectedServer, setSelectedServer] = useState<McpServerRegistry | null>(null);
  const [mcpCredentials, setMcpCredentials] = useState<Record<string, string>>({});
  const [mcpConnecting, setMcpConnecting] = useState(false);
  const [mcpError, setMcpError] = useState<string | null>(null);

  // Analytics
  const [analytics, setAnalytics] = useState<AiAnalytics | null>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);

  // Conversations
  const [conversations, setConversations] = useState<AiConversation[]>([]);
  const [convoLoading, setConvoLoading] = useState(false);
  const [expandedConvo, setExpandedConvo] = useState<string | null>(null);
  const [convoMessages, setConvoMessages] = useState<Record<string, AiMessageLog[]>>({});
  const [convoMsgLoading, setConvoMsgLoading] = useState<string | null>(null);

  // ─── Load config on mount ─────────────────────────────────
  useEffect(() => {
    const load = async () => {
      try {
        const data = await getChatbotConfig();
        if (data) {
          setConfig(data);
          setIsExistingConfig(true);
        }
      } catch (err) {
        console.error('Failed to load chatbot config', err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  // Scroll to bottom of chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  // ─── Handlers ─────────────────────────────────────────────

  const handleToggle = async () => {
    setToggling(true);
    setError(null);
    try {
      const newEnabled = !config.enabled;
      await toggleChatbot(newEnabled);
      setConfig(prev => ({ ...prev, enabled: newEnabled }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to toggle chatbot');
    } finally {
      setToggling(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSaveSuccess(false);
    try {
      const payload: Partial<AiChatbotConfig> = { ...config };
      if (apiKeyInput.trim()) {
        payload.apiKey = apiKeyInput.trim();
      }
      // Don't send hasApiKey to the backend
      delete payload.hasApiKey;
      const saved = await saveChatbotConfig(payload);
      setConfig(saved);
      setIsExistingConfig(true);
      setApiKeyInput('');
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save configuration');
    } finally {
      setSaving(false);
    }
  };

  const handleTestSend = async () => {
    if (!chatInput.trim() || chatLoading) return;
    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: chatInput.trim(),
    };
    setChatMessages(prev => [...prev, userMsg]);
    setChatInput('');
    setChatLoading(true);

    try {
      const result = await testChatbot(userMsg.content);
      const aiMsg: ChatMessage = {
        id: `ai-${Date.now()}`,
        role: 'assistant',
        content: result.response,
        tokensInput: result.tokensInput,
        tokensOutput: result.tokensOutput,
        latencyMs: result.latencyMs,
      };
      setChatMessages(prev => [...prev, aiMsg]);
    } catch (err) {
      const errMsg: ChatMessage = {
        id: `err-${Date.now()}`,
        role: 'assistant',
        content: err instanceof Error ? err.message : 'Failed to get response',
      };
      setChatMessages(prev => [...prev, errMsg]);
    } finally {
      setChatLoading(false);
    }
  };

  const handleClearChat = () => {
    setChatMessages([]);
  };

  const loadMcpData = async () => {
    setMcpLoading(true);
    try {
      const [servers, connections] = await Promise.all([
        listMcpServers(),
        isExistingConfig ? listMcpConnections() : Promise.resolve([]),
      ]);
      setMcpServers(servers);
      setMcpConnections(connections);
    } catch (err) {
      console.error('Failed to load MCP data', err);
    } finally {
      setMcpLoading(false);
    }
  };

  const handleOpenConnectModal = (server: McpServerRegistry) => {
    // Don't allow connecting if already connected
    const existing = mcpConnections.find(c => c.mcpServer.id === server.id);
    if (existing) return;
    setSelectedServer(server);
    setMcpCredentials({});
    setMcpError(null);
    setMcpModalOpen(true);
  };

  const handleMcpConnect = async () => {
    if (!selectedServer) return;
    setMcpConnecting(true);
    setMcpError(null);
    try {
      await connectMcpServer(selectedServer.id, mcpCredentials);
      setMcpModalOpen(false);
      setSelectedServer(null);
      setMcpCredentials({});
      await loadMcpData();
    } catch (err) {
      setMcpError(err instanceof Error ? err.message : 'Failed to connect');
    } finally {
      setMcpConnecting(false);
    }
  };

  const handleMcpDisconnect = async (connectionId: string) => {
    try {
      await disconnectMcpServer(connectionId);
      setMcpConnections(prev => prev.filter(c => c.id !== connectionId));
    } catch (err) {
      console.error('Failed to disconnect', err);
    }
  };

  const handleMcpTest = async (connectionId: string) => {
    try {
      const updated = await testMcpConnection(connectionId);
      setMcpConnections(prev => prev.map(c => c.id === connectionId ? updated : c));
    } catch (err) {
      console.error('Failed to test connection', err);
    }
  };

  const loadConversations = async () => {
    setConvoLoading(true);
    try {
      const data = await getConversations();
      setConversations(data.content);
    } catch (err) {
      console.error('Failed to load conversations', err);
    } finally {
      setConvoLoading(false);
    }
  };

  const handleExpandConvo = async (convoId: string) => {
    if (expandedConvo === convoId) {
      setExpandedConvo(null);
      return;
    }
    setExpandedConvo(convoId);
    if (!convoMessages[convoId]) {
      setConvoMsgLoading(convoId);
      try {
        const msgs = await getConversationMessages(convoId);
        setConvoMessages(prev => ({ ...prev, [convoId]: msgs }));
      } catch (err) {
        console.error('Failed to load messages', err);
      } finally {
        setConvoMsgLoading(null);
      }
    }
  };

  // Load MCP data when config tab is active
  useEffect(() => {
    if (activeTab === 'config') {
      loadMcpData();
    }
  }, [activeTab, isExistingConfig]);

  // Load conversations when switching to that tab
  useEffect(() => {
    if (activeTab === 'conversations') {
      loadConversations();
    }
  }, [activeTab]);

  // Load analytics when switching to that tab
  useEffect(() => {
    if (activeTab === 'analytics' && isExistingConfig) {
      setAnalyticsLoading(true);
      getAnalytics()
        .then(data => setAnalytics(data))
        .catch(err => console.error('Failed to load analytics', err))
        .finally(() => setAnalyticsLoading(false));
    }
  }, [activeTab, isExistingConfig]);

  const updateConfig = (field: keyof AiChatbotConfig, value: unknown) => {
    setConfig(prev => ({ ...prev, [field]: value }));
  };

  // ─── Loading state ────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#008069]" />
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════
  //  RENDER
  // ═══════════════════════════════════════════════════════════

  return (
    <div className="space-y-6">
      {/* ─── Page Header ─── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
            <Bot className="w-6 h-6 text-[#008069]" />
            AI Chatbot
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Configure an AI-powered auto-responder for incoming WhatsApp messages.
          </p>
        </div>

        {/* Enable / Disable toggle */}
        <button
          onClick={handleToggle}
          disabled={toggling || !isExistingConfig}
          className={cn(
            'relative inline-flex h-7 w-12 shrink-0 cursor-pointer items-center rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-[#008069]/30 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed',
            config.enabled ? 'bg-[#008069]' : 'bg-gray-300'
          )}
          title={isExistingConfig ? (config.enabled ? 'Disable chatbot' : 'Enable chatbot') : 'Save configuration first'}
        >
          <span
            className={cn(
              'inline-block h-5 w-5 rounded-full bg-white shadow-sm transition-transform duration-200',
              config.enabled ? 'translate-x-6' : 'translate-x-1'
            )}
          />
        </button>
      </div>

      {/* Status indicator */}
      {isExistingConfig && (
        <div className="flex items-center gap-2">
          <Badge variant={config.enabled ? 'success' : 'default'} dot>
            {config.enabled ? 'Active' : 'Inactive'}
          </Badge>
          {config.hasApiKey && (
            <Badge variant="info" dot>API key configured</Badge>
          )}
        </div>
      )}

      {/* Error banner */}
      {error && (
        <div className="flex items-center gap-3 p-3 rounded-xl border border-red-200 bg-red-50/80 text-red-800">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <p className="text-sm">{error}</p>
          <button onClick={() => setError(null)} className="ml-auto text-red-400 hover:text-red-600">
            &times;
          </button>
        </div>
      )}

      {/* Success banner */}
      {saveSuccess && (
        <div className="flex items-center gap-3 p-3 rounded-xl border border-emerald-200 bg-emerald-50/80 text-emerald-800">
          <CheckCircle className="w-4 h-4 shrink-0" />
          <p className="text-sm">Configuration saved successfully.</p>
        </div>
      )}

      {/* ─── Tabs ─── */}
      <Tabs tabs={TAB_LIST} active={activeTab} onChange={setActiveTab} />

      {/* ─── Configuration Tab ─── */}
      {activeTab === 'config' && (
        <div className="space-y-6">
          {/* Chatbot Settings Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings2 className="w-5 h-5 text-[#008069]" />
                Chatbot Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid gap-5">
                {/* Name */}
                <Input
                  label="Chatbot Name"
                  placeholder="e.g. Support Assistant"
                  value={config.name}
                  onChange={e => updateConfig('name', e.target.value)}
                />

                {/* Provider */}
                <div className="w-full">
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    AI Provider
                  </label>
                  <select
                    value={config.provider}
                    onChange={e => updateConfig('provider', e.target.value as AiProvider)}
                    className="flex h-10 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#008069] focus:border-transparent transition-all duration-200 cursor-pointer"
                  >
                    {PROVIDER_OPTIONS.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>

                {/* Model */}
                <div className="w-full">
                  <Input
                    label="Model"
                    placeholder="Enter model ID"
                    value={config.model}
                    onChange={e => updateConfig('model', e.target.value)}
                  />
                  <p className="mt-1 text-xs text-gray-400">
                    {MODEL_HINTS[config.provider]}
                  </p>
                </div>

                {/* API Key */}
                <div className="w-full">
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    API Key
                  </label>
                  <div className="relative">
                    <input
                      type="password"
                      placeholder={config.hasApiKey ? '••••••••••••••••' : 'Enter API key'}
                      value={apiKeyInput}
                      onChange={e => setApiKeyInput(e.target.value)}
                      className="flex h-10 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#008069] focus:border-transparent transition-all duration-200"
                    />
                    {config.hasApiKey && !apiKeyInput && (
                      <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        <Badge variant="success" size="sm">
                          <Shield className="w-3 h-3" />
                          Configured
                        </Badge>
                      </div>
                    )}
                  </div>
                  {apiKeyInput && (
                    <p className="mt-1 text-xs text-amber-600">
                      New key will be saved when you click Save.
                    </p>
                  )}
                </div>

                {/* System Prompt */}
                <div className="w-full">
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    System Prompt
                  </label>
                  <textarea
                    rows={6}
                    placeholder="Describe your business, tone, and what the chatbot should help with. For example: 'You are a helpful customer support agent for Acme Corp. You help customers with order tracking, returns, and general inquiries. Be polite and concise.'"
                    value={config.systemPrompt}
                    onChange={e => updateConfig('systemPrompt', e.target.value)}
                    className="flex w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#008069] focus:border-transparent transition-all duration-200 resize-none"
                  />
                </div>

                {/* Temperature slider */}
                <div className="w-full">
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Temperature
                    <span className="ml-2 text-xs font-normal text-gray-400">
                      ({config.temperature})
                    </span>
                  </label>
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.1}
                    value={config.temperature}
                    onChange={e => updateConfig('temperature', parseFloat(e.target.value))}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-[#008069]"
                  />
                  <div className="flex justify-between text-xs text-gray-400 mt-1">
                    <span>Precise (0)</span>
                    <span>Creative (1)</span>
                  </div>
                </div>

                {/* Max Tokens */}
                <Input
                  label="Max Tokens"
                  type="number"
                  placeholder="1024"
                  value={config.maxTokens}
                  onChange={e => updateConfig('maxTokens', parseInt(e.target.value) || 0)}
                />
              </div>
            </CardContent>
          </Card>

          {/* Behavior Settings Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="w-5 h-5 text-[#008069]" />
                Behavior Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid gap-5">
                {/* Fallback Message */}
                <div className="w-full">
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Fallback Message
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Message sent when the AI cannot generate a response"
                    value={config.fallbackMessage}
                    onChange={e => updateConfig('fallbackMessage', e.target.value)}
                    className="flex w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#008069] focus:border-transparent transition-all duration-200 resize-none"
                  />
                </div>

                {/* Human Handoff */}
                <div className="w-full">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Human Handoff
                      </label>
                      <p className="text-xs text-gray-400 mt-0.5">
                        Allow users to request a human agent
                      </p>
                    </div>
                    <button
                      onClick={() => updateConfig('humanHandoffEnabled', !config.humanHandoffEnabled)}
                      className={cn(
                        'relative inline-flex h-6 w-10 shrink-0 cursor-pointer items-center rounded-full transition-colors duration-200',
                        config.humanHandoffEnabled ? 'bg-[#008069]' : 'bg-gray-300'
                      )}
                    >
                      <span
                        className={cn(
                          'inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform duration-200',
                          config.humanHandoffEnabled ? 'translate-x-5' : 'translate-x-1'
                        )}
                      />
                    </button>
                  </div>
                  {config.humanHandoffEnabled && (
                    <Input
                      label="Handoff Keyword"
                      placeholder="e.g. agent, human, help"
                      value={config.humanHandoffKeyword}
                      onChange={e => updateConfig('humanHandoffKeyword', e.target.value)}
                    />
                  )}
                </div>

                {/* Conversation Timeout */}
                <Input
                  label="Conversation Timeout (hours)"
                  type="number"
                  placeholder="24"
                  value={config.conversationTimeoutHours}
                  onChange={e => updateConfig('conversationTimeoutHours', parseInt(e.target.value) || 0)}
                />

                {/* Max Messages Per Day */}
                <Input
                  label="Max Messages Per Day Per Contact"
                  type="number"
                  placeholder="50"
                  value={config.maxMessagesPerDayPerContact}
                  onChange={e => updateConfig('maxMessagesPerDayPerContact', parseInt(e.target.value) || 0)}
                />
              </div>
            </CardContent>
          </Card>

          {/* Save button */}
          <div className="flex justify-end">
            <Button onClick={handleSave} disabled={saving} size="lg">
              {saving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              {saving ? 'Saving...' : 'Save Configuration'}
            </Button>
          </div>

          {/* ─── Connected MCP Servers ─── */}
          {isExistingConfig && config.provider === 'ANTHROPIC' && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Link2 className="w-5 h-5 text-[#008069]" />
                    Connected MCP Servers
                  </CardTitle>
                  <Badge variant="info" size="sm">Anthropic only</Badge>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Connect MCP servers to give your chatbot real-world capabilities — booking appointments, checking orders, and more.
                </p>
              </CardHeader>
              <CardContent className="p-6">
                {mcpLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-5 h-5 animate-spin text-[#008069]" />
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {/* Connected servers */}
                    {mcpConnections.map(conn => (
                      <div
                        key={conn.id}
                        className="border border-gray-200 rounded-xl p-4 flex flex-col gap-3"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 min-w-0">
                            <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center shrink-0">
                              <Link2 className="w-4 h-4 text-emerald-600" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-gray-900 truncate">
                                {conn.mcpServer.name}
                              </p>
                              <p className="text-[10px] text-gray-400">{conn.mcpServer.category}</p>
                            </div>
                          </div>
                          <Badge
                            variant={conn.status === 'connected' ? 'success' : conn.status === 'error' ? 'danger' : 'warning'}
                            size="sm"
                            dot
                          >
                            {conn.status}
                          </Badge>
                        </div>

                        {conn.errorMessage && (
                          <p className="text-xs text-red-500 bg-red-50 rounded-lg px-2 py-1">{conn.errorMessage}</p>
                        )}

                        <div className="flex items-center gap-2 mt-auto">
                          <button
                            onClick={() => handleMcpTest(conn.id)}
                            className="text-xs text-gray-500 hover:text-[#008069] flex items-center gap-1 transition-colors"
                          >
                            <RefreshCw className="w-3 h-3" /> Test
                          </button>
                          <button
                            onClick={() => handleMcpDisconnect(conn.id)}
                            className="text-xs text-gray-500 hover:text-red-600 flex items-center gap-1 transition-colors ml-auto"
                          >
                            <Unlink className="w-3 h-3" /> Disconnect
                          </button>
                        </div>
                      </div>
                    ))}

                    {/* Available servers (not yet connected) */}
                    {mcpServers
                      .filter(s => !mcpConnections.some(c => c.mcpServer.id === s.id))
                      .map(server => (
                        <button
                          key={server.id}
                          onClick={() => handleOpenConnectModal(server)}
                          className="border border-dashed border-gray-300 rounded-xl p-4 flex flex-col items-center justify-center gap-2 hover:border-[#008069] hover:bg-emerald-50/30 transition-all group min-h-[100px]"
                        >
                          <div className="w-8 h-8 rounded-lg bg-gray-100 group-hover:bg-emerald-100 flex items-center justify-center transition-colors">
                            <Plus className="w-4 h-4 text-gray-400 group-hover:text-emerald-600 transition-colors" />
                          </div>
                          <p className="text-sm font-medium text-gray-600 group-hover:text-[#008069] transition-colors">
                            {server.name}
                          </p>
                          <p className="text-[10px] text-gray-400">{server.category}</p>
                        </button>
                      ))}

                    {mcpServers.length === 0 && mcpConnections.length === 0 && (
                      <div className="col-span-full text-center py-6 text-sm text-gray-400">
                        No MCP servers available yet.
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {isExistingConfig && config.provider !== 'ANTHROPIC' && (
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-3 text-sm text-gray-500">
                  <Link2 className="w-5 h-5 text-gray-400 shrink-0" />
                  <div>
                    <p className="font-medium text-gray-700">MCP Servers</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      MCP tool integration is currently available with Anthropic (Claude) models only.
                      Switch your provider to Anthropic to connect MCP servers.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* ─── Analytics Tab ─── */}
      {activeTab === 'analytics' && (
        <div className="space-y-6">
          {analyticsLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#008069]" />
            </div>
          ) : !analytics ? (
            <Card>
              <CardContent className="p-0">
                <EmptyState
                  icon={BarChart3}
                  title="No analytics data"
                  description="Analytics will appear once your chatbot starts handling conversations."
                />
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Stat cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <AnalyticsStat
                  icon={MessageSquare}
                  iconBg="bg-blue-50"
                  iconColor="text-blue-600"
                  label="Total Conversations"
                  value={analytics.totalConversations.toLocaleString()}
                />
                <AnalyticsStat
                  icon={Hash}
                  iconBg="bg-emerald-50"
                  iconColor="text-emerald-600"
                  label="Total Messages"
                  value={analytics.totalMessages.toLocaleString()}
                />
                <AnalyticsStat
                  icon={Zap}
                  iconBg="bg-violet-50"
                  iconColor="text-violet-600"
                  label="Total Tokens"
                  value={analytics.totalTokensUsed.toLocaleString()}
                />
                <AnalyticsStat
                  icon={DollarSign}
                  iconBg="bg-amber-50"
                  iconColor="text-amber-600"
                  label="Estimated Cost"
                  value={`$${analytics.estimatedCostUsd.toFixed(4)}`}
                />
              </div>

              {/* Detail cards */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <TrendingUp className="w-4 h-4 text-[#008069]" />
                      Performance
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-6">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Active Conversations</span>
                        <span className="text-sm font-semibold text-gray-900">{analytics.activeConversations}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Avg Messages / Conversation</span>
                        <span className="text-sm font-semibold text-gray-900">{analytics.avgMessagesPerConversation}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Human Handoff Rate</span>
                        <span className="text-sm font-semibold text-gray-900">{analytics.humanHandoffRate}%</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Handed Off Conversations</span>
                        <span className="text-sm font-semibold text-gray-900">{analytics.handedOffConversations}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Bot className="w-4 h-4 text-[#008069]" />
                      Configuration
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-6">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Provider</span>
                        <Badge variant="info" size="sm">{analytics.provider}</Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Model</span>
                        <span className="text-xs font-mono text-gray-700 bg-gray-100 rounded px-2 py-0.5">{analytics.model}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Status</span>
                        <Badge variant={config.enabled ? 'success' : 'default'} size="sm" dot>
                          {config.enabled ? 'Active' : 'Inactive'}
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </>
          )}
        </div>
      )}

      {/* ─── MCP Connection Modal ─── */}
      <McpConnectModal
        open={mcpModalOpen}
        server={selectedServer}
        credentials={mcpCredentials}
        onCredentialChange={(key, val) => setMcpCredentials(prev => ({ ...prev, [key]: val }))}
        connecting={mcpConnecting}
        error={mcpError}
        onConnect={handleMcpConnect}
        onClose={() => { setMcpModalOpen(false); setSelectedServer(null); setMcpError(null); }}
      />

      {/* ─── Test Chat Tab ─── */}
      {activeTab === 'test' && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-[#008069]" />
                Test Chat
              </CardTitle>
              {chatMessages.length > 0 && (
                <Button variant="ghost" size="sm" onClick={handleClearChat}>
                  <Trash2 className="w-3.5 h-3.5" />
                  Clear
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {/* Chat area */}
            <div className="h-[480px] overflow-y-auto bg-[#efeae2] px-4 py-4" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%23d5cfc4\' fill-opacity=\'0.4\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")' }}>
              {chatMessages.length === 0 && (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <div className="w-16 h-16 rounded-2xl bg-white/80 flex items-center justify-center mx-auto mb-3 shadow-sm">
                      <Bot className="w-8 h-8 text-[#008069]" />
                    </div>
                    <p className="text-sm font-medium text-gray-700">Send a message to test your chatbot</p>
                    <p className="text-xs text-gray-500 mt-1">Messages are processed using your saved configuration</p>
                  </div>
                </div>
              )}

              {chatMessages.map(msg => (
                <div
                  key={msg.id}
                  className={cn(
                    'flex mb-2',
                    msg.role === 'user' ? 'justify-end' : 'justify-start'
                  )}
                >
                  <div
                    className={cn(
                      'max-w-[75%] rounded-xl px-3 py-2 shadow-sm',
                      msg.role === 'user'
                        ? 'bg-[#d9fdd3] rounded-tr-none'
                        : 'bg-white rounded-tl-none'
                    )}
                  >
                    <p className="text-sm text-gray-900 whitespace-pre-wrap">{msg.content}</p>
                    {msg.role === 'assistant' && msg.tokensInput !== undefined && (
                      <p className="text-[10px] text-gray-400 mt-1.5 flex items-center gap-2">
                        <span>{msg.tokensInput} in / {msg.tokensOutput} out tokens</span>
                        <span>&middot;</span>
                        <span>{msg.latencyMs}ms</span>
                      </p>
                    )}
                  </div>
                </div>
              ))}

              {/* Loading indicator */}
              {chatLoading && (
                <div className="flex justify-start mb-2">
                  <div className="bg-white rounded-xl rounded-tl-none px-4 py-3 shadow-sm">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                </div>
              )}

              <div ref={chatEndRef} />
            </div>

            {/* Input bar */}
            <div className="flex items-center gap-2 px-4 py-3 border-t border-gray-200 bg-white rounded-b-xl">
              <input
                type="text"
                placeholder={isExistingConfig ? 'Type a message...' : 'Save configuration first to test'}
                value={chatInput}
                onChange={e => setChatInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleTestSend()}
                disabled={chatLoading || !isExistingConfig}
                className="flex-1 h-10 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#008069] focus:border-transparent transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              />
              <Button
                onClick={handleTestSend}
                disabled={chatLoading || !chatInput.trim() || !isExistingConfig}
                size="md"
              >
                {chatLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ─── Conversations Tab ─── */}
      {activeTab === 'conversations' && (
        <div className="space-y-4">
          {convoLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#008069]" />
            </div>
          ) : conversations.length === 0 ? (
            <Card>
              <CardContent className="p-0">
                <EmptyState
                  icon={History}
                  title="No conversations yet"
                  description="AI chatbot conversations will appear here once contacts start messaging."
                />
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <History className="w-5 h-5 text-[#008069]" />
                  Recent Conversations
                  <Badge variant="default">{conversations.length}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y divide-gray-100">
                  {conversations.map(convo => (
                    <div key={convo.id}>
                      {/* Conversation row */}
                      <button
                        onClick={() => handleExpandConvo(convo.id)}
                        className="w-full flex items-center gap-4 px-6 py-4 hover:bg-gray-50/50 transition-colors text-left"
                      >
                        <div className="shrink-0">
                          {expandedConvo === convo.id ? (
                            <ChevronDown className="w-4 h-4 text-gray-400" />
                          ) : (
                            <ChevronRight className="w-4 h-4 text-gray-400" />
                          )}
                        </div>
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <Phone className="w-4 h-4 text-gray-400 shrink-0" />
                          <span className="text-sm font-medium text-gray-900 font-mono truncate">
                            {convo.contactPhone}
                          </span>
                          <ConvoStatusBadge status={convo.status} />
                        </div>
                        <div className="hidden sm:flex items-center gap-4 text-xs text-gray-500 shrink-0">
                          <span className="flex items-center gap-1">
                            <Hash className="w-3 h-3" />
                            {convo.totalMessages} msgs
                          </span>
                          <span className="flex items-center gap-1">
                            <Zap className="w-3 h-3" />
                            {convo.totalTokensUsed.toLocaleString()} tokens
                          </span>
                          <span className="flex items-center gap-1">
                            <Coins className="w-3 h-3" />
                            ${convo.estimatedCostUsd.toFixed(4)}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {new Date(convo.lastMessageAt).toLocaleDateString()}
                          </span>
                        </div>
                      </button>

                      {/* Expanded messages */}
                      {expandedConvo === convo.id && (
                        <div className="px-6 pb-4">
                          <div className="bg-gray-50 rounded-xl border border-gray-100 overflow-hidden">
                            {convoMsgLoading === convo.id ? (
                              <div className="flex items-center justify-center py-8">
                                <Loader2 className="w-5 h-5 animate-spin text-[#008069]" />
                              </div>
                            ) : convoMessages[convo.id]?.length ? (
                              <div className="divide-y divide-gray-100">
                                {convoMessages[convo.id].map(msg => (
                                  <div
                                    key={msg.id}
                                    className={cn(
                                      'px-4 py-3',
                                      msg.direction === 'INBOUND' ? 'bg-white' : 'bg-emerald-50/40'
                                    )}
                                  >
                                    <div className="flex items-start justify-between gap-3">
                                      <div className="min-w-0 flex-1">
                                        <div className="flex items-center gap-2 mb-1">
                                          <Badge
                                            variant={msg.direction === 'INBOUND' ? 'info' : 'success'}
                                            size="sm"
                                          >
                                            {msg.direction === 'INBOUND' ? 'User' : 'AI'}
                                          </Badge>
                                          <span className="text-[10px] text-gray-400">
                                            {new Date(msg.createdAt).toLocaleString()}
                                          </span>
                                        </div>
                                        <p className="text-sm text-gray-800 whitespace-pre-wrap">
                                          {msg.content}
                                        </p>
                                      </div>
                                      {msg.direction === 'OUTBOUND' && (
                                        <div className="text-right shrink-0">
                                          <p className="text-[10px] text-gray-400">
                                            {msg.tokensInput + msg.tokensOutput} tokens
                                          </p>
                                          <p className="text-[10px] text-gray-400">
                                            {msg.latencyMs}ms &middot; {msg.modelUsed}
                                          </p>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div className="text-center py-8 text-sm text-gray-400">
                                No messages found
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
};

// ─── Helper Components ───────────────────────────────────────

const ConvoStatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const variant =
    status === 'ACTIVE' ? 'success' :
    status === 'ENDED' ? 'default' :
    status === 'HANDED_OFF' ? 'warning' :
    status === 'TIMED_OUT' ? 'danger' :
    'default';

  return (
    <Badge variant={variant} size="sm" dot>
      {status.replace(/_/g, ' ')}
    </Badge>
  );
};

// ─── Analytics Stat Card ──────────────────────────────────────

const AnalyticsStat: React.FC<{
  icon: React.FC<{ className?: string }>;
  iconBg: string;
  iconColor: string;
  label: string;
  value: string;
}> = ({ icon: Icon, iconBg, iconColor, label, value }) => (
  <Card>
    <CardContent className="p-4 flex items-center gap-3">
      <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center shrink-0', iconBg)}>
        <Icon className={cn('w-5 h-5', iconColor)} />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-gray-500 truncate">{label}</p>
        <p className="text-lg font-bold text-gray-900">{value}</p>
      </div>
    </CardContent>
  </Card>
);

// ─── MCP Connection Modal ─────────────────────────────────────

interface McpConnectModalProps {
  open: boolean;
  server: McpServerRegistry | null;
  credentials: Record<string, string>;
  onCredentialChange: (key: string, value: string) => void;
  connecting: boolean;
  error: string | null;
  onConnect: () => void;
  onClose: () => void;
}

const McpConnectModal: React.FC<McpConnectModalProps> = ({
  open, server, credentials, onCredentialChange, connecting, error, onConnect, onClose,
}) => {
  if (!server) return null;

  let capabilities: string[] = [];
  try {
    capabilities = JSON.parse(server.capabilities || '[]');
  } catch { /* ignore */ }

  let requiredFields: McpRequiredField[] = [];
  try {
    requiredFields = JSON.parse(server.requiredFields || '[]');
  } catch { /* ignore */ }

  const isApiKey = server.authType === 'api_key';
  const isOAuth = server.authType === 'oauth2';
  const hasRequiredFields = requiredFields.length > 0 || isApiKey;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Connect ${server.name}`}
      description={server.description}
      size="md"
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          {hasRequiredFields && (
            <Button onClick={onConnect} disabled={connecting}>
              {connecting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Link2 className="w-4 h-4" />}
              {connecting ? 'Connecting...' : 'Save & Connect'}
            </Button>
          )}
          {isOAuth && requiredFields.length === 0 && (
            <Button onClick={onConnect} disabled={connecting}>
              {connecting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Link2 className="w-4 h-4" />}
              {connecting ? 'Connecting...' : 'Connect'}
            </Button>
          )}
        </div>
      }
    >
      <div className="space-y-4">
        {/* Capabilities */}
        {capabilities.length > 0 && (
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">
              Capabilities
            </p>
            <div className="space-y-1.5">
              {capabilities.map((cap: string) => (
                <div key={cap} className="flex items-center gap-2 text-sm text-gray-700">
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                  {cap.replace(/_/g, ' ')}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Auth info */}
        <div className="flex items-center gap-2 text-xs text-gray-500 bg-gray-50 rounded-lg px-3 py-2">
          <Shield className="w-3.5 h-3.5" />
          Authentication: {server.authType === 'oauth2' ? 'OAuth 2.0' : server.authType === 'api_key' ? 'API Key' : server.authType}
        </div>

        {/* Required fields (API key servers) */}
        {requiredFields.length > 0 && (
          <div className="space-y-3">
            {requiredFields.map((field: McpRequiredField) => (
              <div key={field.key}>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  {field.label}
                </label>
                <input
                  type={field.type === 'password' ? 'password' : 'text'}
                  placeholder={`Enter ${field.label.toLowerCase()}`}
                  value={credentials[field.key] || ''}
                  onChange={e => onCredentialChange(field.key, e.target.value)}
                  className="flex h-10 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#008069] focus:border-transparent transition-all duration-200"
                />
              </div>
            ))}
            <div className="flex items-center gap-2 text-xs text-amber-600 bg-amber-50 rounded-lg px-3 py-2">
              <Shield className="w-3.5 h-3.5 shrink-0" />
              Credentials are encrypted and stored securely.
            </div>
          </div>
        )}

        {/* OAuth servers with no extra fields */}
        {isOAuth && requiredFields.length === 0 && (
          <p className="text-sm text-gray-600">
            Click "Connect" to establish the connection. OAuth authentication will be handled automatically.
          </p>
        )}

        {/* Error */}
        {error && (
          <div className="flex items-center gap-2 text-sm text-red-700 bg-red-50 rounded-lg px-3 py-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            {error}
          </div>
        )}
      </div>
    </Modal>
  );
};

export default AIChatbot;
