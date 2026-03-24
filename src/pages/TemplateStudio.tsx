import React, { useEffect, useMemo, useState } from 'react';
import { Edit2, FileText, Layout, Plus, RefreshCw, Smartphone, Trash2, Sparkles, AlertCircle, CheckCircle2, ChevronDown } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Button, cn } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Badge } from '../components/ui/Badge';
import { Tabs } from '../components/ui/Tabs';
import { EmptyState } from '../components/ui/EmptyState';
import {
  createTemplate,
  deleteTemplate,
  getTemplates,
  updateTemplate,
} from '../services/templateService';
import type {
  TemplateRequest,
  Template,
  TemplateButton,
  TemplateButtonType,
  TemplateCategory,
  TemplateLanguageCode,
} from '../types';

type HeaderType = 'NONE' | 'TEXT' | 'IMAGE' | 'VIDEO' | 'DOCUMENT' | 'LOCATION';
type TemplateLibraryComponent = {
  type?: string;
  format?: string;
  text?: string;
  buttons?: Array<Record<string, unknown>>;
};

const buttonTypes: TemplateButtonType[] = [
  'QUICK_REPLY',
  'URL',
  'PHONE_NUMBER',
  'COPY_CODE',
  'VOICE_CALL',
  'OTP',
];

const selectClass =
  'w-full h-10 px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#008069]/20 focus:border-[#008069]/40 transition-all duration-200 appearance-none cursor-pointer';

const studioTabs = [
  { id: 'create', label: 'Create Template', icon: Plus },
  { id: 'library', label: 'Template Library', icon: Layout },
];

const TemplateStudio = () => {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [previewText, setPreviewText] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('create');

  const [name, setName] = useState('');
  const [category, setCategory] = useState<TemplateCategory>('MARKETING');
  const [languageCode, setLanguageCode] = useState<TemplateLanguageCode>('en_US');
  const [headerType, setHeaderType] = useState<HeaderType>('NONE');
  const [headerText, setHeaderText] = useState('');
  const [headerMediaHandle, setHeaderMediaHandle] = useState('');
  const [bodyText, setBodyText] = useState('');
  const [footerText, setFooterText] = useState('');
  const [buttons, setButtons] = useState<TemplateButton[]>([]);
  const [variableSamples, setVariableSamples] = useState<Record<string, string>>({});

  const variableKeys = useMemo(() => {
    const matches = Array.from(bodyText.matchAll(/\{\{(\d+)\}\}/g));
    const keys = matches.map((match) => match[1]);
    return Array.from(new Set(keys)).sort((a, b) => Number(a) - Number(b));
  }, [bodyText]);

  useEffect(() => {
    setVariableSamples((prev) => {
      const next: Record<string, string> = {};
      variableKeys.forEach((key) => {
        next[key] = prev[key] ?? `sample_${key}`;
      });
      return next;
    });
  }, [variableKeys]);

  const resetBuilder = () => {
    setEditingId(null);
    setName('');
    setCategory('MARKETING');
    setLanguageCode('en_US');
    setHeaderType('NONE');
    setHeaderText('');
    setHeaderMediaHandle('');
    setBodyText('');
    setFooterText('');
    setButtons([]);
    setVariableSamples({});
    setPreviewText('');
  };

  const fetchTemplates = async () => {
    setLoading(true);
    try {
      const data = await getTemplates();
      setTemplates(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load templates.');
      setTemplates([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTemplates();
  }, []);

  const parseJsonArray = (value?: string): TemplateLibraryComponent[] => {
    if (!value) return [];
    try {
      const parsed = JSON.parse(value) as unknown;
      return Array.isArray(parsed) ? (parsed as TemplateLibraryComponent[]) : [];
    } catch {
      return [];
    }
  };

  const parseJsonObject = (value?: string): Record<string, unknown> => {
    if (!value) return {};
    try {
      const parsed = JSON.parse(value) as unknown;
      return parsed && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : {};
    } catch {
      return {};
    }
  };

  const normalizeTemplateComponents = (template: Template): TemplateLibraryComponent[] => {
    const byComponentsJson = parseJsonArray(template.componentsJson);
    if (byComponentsJson.length > 0) return byComponentsJson;

    const raw = parseJsonObject(template.rawTemplateJson);
    const rawComponents = raw.components;
    if (Array.isArray(rawComponents)) return rawComponents as TemplateLibraryComponent[];

    if (template.content) {
      return [{ type: 'BODY', text: template.content }];
    }
    return [];
  };

  const replaceVariablesWithSamples = (text?: string): string =>
    (text || '').replace(/\{\{(\d+)\}\}/g, (_full, idx: string) => `sample_${idx}`);

  const addButton = () => {
    setButtons((prev) => [...prev, { type: 'QUICK_REPLY', text: '' }]);
  };

  const updateButton = (index: number, patch: Partial<TemplateButton>) => {
    setButtons((prev) => prev.map((btn, idx) => (idx === index ? { ...btn, ...patch } : btn)));
  };

  const removeButton = (index: number) => {
    setButtons((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleEdit = (template: Template) => {
    const components = normalizeTemplateComponents(template);
    const header = components.find((component) => component.type?.toUpperCase() === 'HEADER');
    const body = components.find((component) => component.type?.toUpperCase() === 'BODY');
    const footer = components.find((component) => component.type?.toUpperCase() === 'FOOTER');
    const buttonComponent = components.find((component) => component.type?.toUpperCase() === 'BUTTONS');

    setEditingId(template.id);
    setName(template.name || '');
    setCategory((template.category as TemplateCategory) || 'MARKETING');

    const language = (template.languageCode || template.language || 'en_US').toLowerCase();
    setLanguageCode(language.startsWith('hi') ? 'hi_IN' : 'en_US');

    if (header?.format) {
      const format = header.format.toUpperCase() as HeaderType;
      setHeaderType(
        ['TEXT', 'IMAGE', 'VIDEO', 'DOCUMENT', 'LOCATION'].includes(format) ? format : 'NONE'
      );
      setHeaderText(header.text || '');
      setHeaderMediaHandle('');
    } else {
      setHeaderType('NONE');
      setHeaderText('');
      setHeaderMediaHandle('');
    }

    setBodyText(body?.text || template.content || '');
    setFooterText(footer?.text || '');

    const rawButtons = Array.isArray(buttonComponent?.buttons) ? buttonComponent?.buttons : [];
    const parsedButtons: TemplateButton[] = rawButtons
      .map((button) => {
        const buttonType = String(button.type || 'QUICK_REPLY').toUpperCase() as TemplateButtonType;
        return {
          type: buttonTypes.includes(buttonType) ? buttonType : 'QUICK_REPLY',
          text: typeof button.text === 'string' ? button.text : undefined,
          url: typeof button.url === 'string' ? button.url : undefined,
          phoneNumber:
            typeof button.phoneNumber === 'string'
              ? button.phoneNumber
              : typeof button.phone_number === 'string'
                ? button.phone_number
                : undefined,
          example: typeof button.example === 'string' ? button.example : undefined,
        };
      })
      .filter(Boolean);
    setButtons(parsedButtons);
    setPreviewText('');
    setActiveTab('create');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const buildPayload = (): TemplateRequest => {
    const components: TemplateRequest['components'] = [];

    if (headerType !== 'NONE') {
      if (headerType === 'TEXT') {
        components.push({
          type: 'HEADER',
          format: 'TEXT',
          text: headerText,
        });
      } else if (headerType === 'LOCATION') {
        components.push({
          type: 'HEADER',
          format: 'LOCATION',
        });
      } else {
        components.push({
          type: 'HEADER',
          format: headerType,
          mediaHandle: headerMediaHandle,
        });
      }
    }

    components.push({
      type: 'BODY',
      text: bodyText,
      sampleValues: variableKeys.map((key) => variableSamples[key] || `sample_${key}`),
    });

    if (footerText.trim()) {
      components.push({
        type: 'FOOTER',
        text: footerText,
      });
    }

    if (buttons.length > 0) {
      components.push({
        type: 'BUTTONS',
        buttons,
      });
    }

    return {
      name,
      category,
      language_code: languageCode,
      components,
    };
  };

  const generateLocalPreviewBody = () => {
    if (!bodyText.trim()) {
      return 'Template body preview appears here.';
    }
    let rendered = bodyText;
    variableKeys.forEach((key) => {
      const sample = variableSamples[key] || `sample_${key}`;
      rendered = rendered.replaceAll(`{{${key}}}`, sample);
    });
    return rendered;
  };

  const getPreviewHeader = () => {
    if (headerType === 'NONE') return '';
    if (headerType === 'TEXT') {
      let rendered = headerText || 'Header text';
      variableKeys.forEach((key) => {
        const sample = variableSamples[key] || `sample_${key}`;
        rendered = rendered.replaceAll(`{{${key}}}`, sample);
      });
      return rendered;
    }
    if (headerType === 'LOCATION') return 'Location Header';
    if (!headerMediaHandle.trim()) return `${headerType} Header`;
    return `${headerType} Header (${headerMediaHandle})`;
  };

  const handlePreview = async () => {
    setError('');
    setPreviewLoading(true);
    try {
      setPreviewText(generateLocalPreviewBody());
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    setSuccess('');
    try {
      const payload = buildPayload();
      if (editingId) {
        await updateTemplate(editingId, payload);
        setSuccess('Template updated successfully.');
      } else {
        await createTemplate(payload);
        setSuccess('Template created and submitted for review.');
      }
      resetBuilder();
      await fetchTemplates();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create template.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this template?')) return;
    try {
      await deleteTemplate(id);
      await fetchTemplates();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete template.');
    }
  };

  const previewHeader = getPreviewHeader();
  const previewBody = previewText || generateLocalPreviewBody();

  const getStatusBadgeVariant = (status?: string): 'success' | 'warning' | 'danger' | 'info' | 'default' => {
    switch (status?.toUpperCase()) {
      case 'APPROVED': return 'success';
      case 'PENDING': case 'SUBMITTED': return 'warning';
      case 'REJECTED': case 'DISABLED': return 'danger';
      default: return 'default';
    }
  };

  const getCategoryBadgeVariant = (cat?: string): 'info' | 'warning' | 'default' => {
    switch (cat?.toUpperCase()) {
      case 'MARKETING': return 'info';
      case 'UTILITY': return 'warning';
      case 'AUTHENTICATION': return 'default';
      default: return 'default';
    }
  };

  const getQualityIndicator = (quality?: string) => {
    switch (quality?.toUpperCase()) {
      case 'GREEN': return { color: 'bg-emerald-500', label: 'High' };
      case 'YELLOW': return { color: 'bg-amber-500', label: 'Medium' };
      case 'RED': return { color: 'bg-red-500', label: 'Low' };
      default: return { color: 'bg-gray-300', label: 'Unknown' };
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Template Studio</h1>
          <p className="text-sm text-gray-500 mt-1">
            Build Marketing, Utility, and Authentication templates with WhatsApp components.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchTemplates}>
          <RefreshCw className={cn('w-4 h-4', loading && 'animate-spin')} />
          Sync Templates
        </Button>
      </div>

      {/* Alerts */}
      {error && (
        <div className="flex items-center gap-3 text-sm text-red-700 bg-red-50 border border-red-200/60 rounded-xl px-4 py-3">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
          <button onClick={() => setError('')} className="ml-auto text-red-400 hover:text-red-600 text-xs">Dismiss</button>
        </div>
      )}
      {success && (
        <div className="flex items-center gap-3 text-sm text-emerald-700 bg-emerald-50 border border-emerald-200/60 rounded-xl px-4 py-3">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
          <span>{success}</span>
          <button onClick={() => setSuccess('')} className="ml-auto text-emerald-400 hover:text-emerald-600 text-xs">Dismiss</button>
        </div>
      )}

      {/* Tabs */}
      <Tabs
        tabs={studioTabs.map((t) => ({
          ...t,
          count: t.id === 'library' ? templates.length : undefined,
        }))}
        active={activeTab}
        onChange={setActiveTab}
      />

      {/* ═══ CREATE TAB ═══ */}
      {activeTab === 'create' && (
        <div className="grid grid-cols-1 xl:grid-cols-5 gap-6 items-start">
          {/* Left: Form */}
          <Card className="xl:col-span-3">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-[#008069]/10 flex items-center justify-center">
                  <Sparkles className="w-4.5 h-4.5 text-[#008069]" />
                </div>
                <div>
                  <CardTitle>{editingId ? 'Edit Template' : 'Create Template'}</CardTitle>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {editingId ? 'Modify your existing template' : 'Design a new message template'}
                  </p>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <form className="space-y-6" onSubmit={handleCreate}>
                {/* Section: Basic Info */}
                <div className="space-y-3">
                  <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Basic Information</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <Input label="Template Name" value={name} onChange={(e) => setName(e.target.value)} required placeholder="e.g. order_confirmation" />
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Category</label>
                      <div className="relative">
                        <select className={selectClass} value={category} onChange={(e) => setCategory(e.target.value as TemplateCategory)}>
                          <option value="MARKETING">Marketing</option>
                          <option value="UTILITY">Utility</option>
                          <option value="AUTHENTICATION">Authentication</option>
                        </select>
                        <ChevronDown className="w-4 h-4 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Language</label>
                      <div className="relative">
                        <select className={selectClass} value={languageCode} onChange={(e) => setLanguageCode(e.target.value as TemplateLanguageCode)}>
                          <option value="en_US">English (US)</option>
                          <option value="hi_IN">Hindi (IN)</option>
                        </select>
                        <ChevronDown className="w-4 h-4 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Section: Header */}
                <div className="space-y-3">
                  <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Header</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Header Type</label>
                      <div className="relative">
                        <select className={selectClass} value={headerType} onChange={(e) => setHeaderType(e.target.value as HeaderType)}>
                          <option value="NONE">None</option>
                          <option value="TEXT">Text</option>
                          <option value="IMAGE">Image</option>
                          <option value="VIDEO">Video</option>
                          <option value="DOCUMENT">Document</option>
                          <option value="LOCATION">Location</option>
                        </select>
                        <ChevronDown className="w-4 h-4 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                      </div>
                    </div>
                    {headerType === 'TEXT' && (
                      <Input
                        label="Header Text"
                        value={headerText}
                        onChange={(e) => setHeaderText(e.target.value)}
                        placeholder="Order Update {{1}}"
                      />
                    )}
                    {headerType !== 'NONE' && headerType !== 'TEXT' && headerType !== 'LOCATION' && (
                      <Input
                        label="Media Handle"
                        value={headerMediaHandle}
                        onChange={(e) => setHeaderMediaHandle(e.target.value)}
                        placeholder="4::aW..."
                      />
                    )}
                  </div>
                </div>

                {/* Section: Body */}
                <div className="space-y-3">
                  <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Body</h4>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Message Body</label>
                    <textarea
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl min-h-28 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#008069]/20 focus:border-[#008069]/40 transition-all duration-200 resize-y"
                      value={bodyText}
                      onChange={(e) => setBodyText(e.target.value)}
                      placeholder="Hello {{1}}, your order {{2}} is confirmed."
                      required
                    />
                    {variableKeys.length > 0 && (
                      <div className="flex items-center gap-2 mt-2">
                        <span className="text-xs text-gray-400">Variables:</span>
                        {variableKeys.map((key) => (
                          <Badge key={key} variant="outline" size="sm">{`{{${key}}}`}</Badge>
                        ))}
                      </div>
                    )}
                  </div>

                  {variableKeys.length > 0 && (
                    <div className="rounded-xl border border-gray-100 bg-gray-50/50 p-4 space-y-3">
                      <div>
                        <h4 className="text-sm font-semibold text-gray-800">Sample Values</h4>
                        <p className="text-xs text-gray-500 mt-0.5">
                          Used for preview and submission payload.
                        </p>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {variableKeys.map((key) => (
                          <Input
                            key={key}
                            label={`{{${key}}}`}
                            value={variableSamples[key] || ''}
                            onChange={(e) =>
                              setVariableSamples((prev) => ({
                                ...prev,
                                [key]: e.target.value,
                              }))
                            }
                            placeholder={`sample_${key}`}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Section: Footer */}
                <div className="space-y-3">
                  <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Footer</h4>
                  <Input
                    label="Footer Text (optional)"
                    value={footerText}
                    onChange={(e) => setFooterText(e.target.value)}
                    placeholder="Reply STOP to unsubscribe"
                  />
                </div>

                {/* Section: Buttons */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Buttons</h4>
                    <Button type="button" variant="ghost" size="sm" onClick={addButton}>
                      <Plus className="w-3.5 h-3.5" />
                      Add
                    </Button>
                  </div>
                  {buttons.length === 0 ? (
                    <p className="text-xs text-gray-400 italic">No buttons added yet.</p>
                  ) : (
                    <div className="space-y-3">
                      {buttons.map((button, index) => (
                        <div key={`${button.type}-${index}`} className="grid grid-cols-1 md:grid-cols-5 gap-2 items-end p-3 rounded-xl border border-gray-100 bg-gray-50/30">
                          <div>
                            <label className="text-xs font-medium text-gray-500 mb-1 block">Type</label>
                            <div className="relative">
                              <select
                                className={selectClass}
                                value={button.type}
                                onChange={(e) => updateButton(index, { type: e.target.value as TemplateButtonType })}
                              >
                                {buttonTypes.map((type) => (
                                  <option key={type} value={type}>{type}</option>
                                ))}
                              </select>
                              <ChevronDown className="w-4 h-4 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                            </div>
                          </div>
                          <Input
                            label="Label"
                            value={button.text || ''}
                            onChange={(e) => updateButton(index, { text: e.target.value })}
                          />
                          <Input
                            label="URL / Phone"
                            value={button.url || button.phoneNumber || ''}
                            onChange={(e) => {
                              const value = e.target.value;
                              if (button.type === 'URL' || button.type === 'OTP') {
                                updateButton(index, { url: value, phoneNumber: undefined });
                              } else if (button.type === 'PHONE_NUMBER' || button.type === 'VOICE_CALL') {
                                updateButton(index, { phoneNumber: value, url: undefined });
                              } else {
                                updateButton(index, { url: undefined, phoneNumber: undefined });
                              }
                            }}
                          />
                          <Input
                            label="Example"
                            value={button.example || ''}
                            onChange={(e) => updateButton(index, { example: e.target.value })}
                          />
                          <Button type="button" variant="ghost" size="sm" onClick={() => removeButton(index)} className="text-red-500 hover:text-red-700 hover:bg-red-50">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-3 pt-2 border-t border-gray-100">
                  <Button type="submit" disabled={submitting}>
                    {submitting ? 'Submitting...' : editingId ? 'Update Template' : 'Create Template'}
                  </Button>
                  <Button type="button" variant="outline" onClick={handlePreview} disabled={previewLoading}>
                    <Smartphone className="w-4 h-4" />
                    {previewLoading ? 'Previewing...' : 'Preview'}
                  </Button>
                  {editingId && (
                    <Button type="button" variant="ghost" onClick={resetBuilder}>
                      Cancel Edit
                    </Button>
                  )}
                  {!editingId && (name || bodyText) && (
                    <Button type="button" variant="ghost" onClick={resetBuilder}>
                      Reset
                    </Button>
                  )}
                </div>
              </form>
            </CardContent>
          </Card>

          {/* Right: Phone Mockup Preview */}
          <div className="xl:col-span-2 flex flex-col items-center">
            <div className="sticky top-6 w-full max-w-xs">
              {/* Phone Frame */}
              <div className="relative mx-auto w-[280px] bg-gray-900 rounded-[2.5rem] p-2.5 shadow-2xl shadow-gray-900/20">
                {/* Notch */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-6 bg-gray-900 rounded-b-2xl z-10" />

                {/* Screen */}
                <div className="bg-white rounded-[2rem] overflow-hidden">
                  {/* Status bar */}
                  <div className="h-10 bg-gray-900 flex items-end justify-between px-6 pb-1">
                    <span className="text-[10px] text-white/80 font-medium">9:41</span>
                    <div className="flex items-center gap-1">
                      <div className="w-3.5 h-2 border border-white/60 rounded-sm relative">
                        <div className="absolute inset-0.5 bg-white/80 rounded-[1px]" />
                      </div>
                    </div>
                  </div>

                  {/* WhatsApp Header */}
                  <div className="bg-[#008069] px-4 py-3 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                      <span className="text-white text-xs font-bold">
                        {name ? name.charAt(0).toUpperCase() : 'T'}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm font-semibold truncate">
                        {name || 'Template Preview'}
                      </p>
                      <p className="text-white/70 text-[10px]">online</p>
                    </div>
                  </div>

                  {/* Chat Area */}
                  <div
                    className="min-h-[380px] p-4 space-y-2"
                    style={{
                      backgroundColor: '#efeae2',
                      backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23c8c4bc' fill-opacity='0.15'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
                    }}
                  >
                    {/* Message Bubble */}
                    <div className="flex justify-end">
                      <div className="relative max-w-[85%] bg-[#d9fdd3] rounded-lg rounded-tr-none p-3 shadow-sm">
                        {/* Tail */}
                        <div className="absolute -right-2 top-0 w-0 h-0 border-t-[8px] border-t-[#d9fdd3] border-r-[8px] border-r-transparent" />

                        {previewHeader && (
                          <div className="text-xs font-bold text-gray-700 pb-1.5 mb-1.5 border-b border-black/5">
                            {previewHeader}
                          </div>
                        )}

                        <p className="text-[13px] text-gray-800 leading-relaxed whitespace-pre-wrap">
                          {previewBody}
                        </p>

                        {footerText.trim() && (
                          <p className="text-[11px] text-gray-500 mt-1.5 pt-1.5 border-t border-black/5">
                            {footerText}
                          </p>
                        )}

                        <div className="flex items-center justify-end gap-1 mt-1">
                          <span className="text-[10px] text-gray-500">
                            {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                          <span className="text-blue-500 text-[10px]">&#10003;&#10003;</span>
                        </div>
                      </div>
                    </div>

                    {/* Button Previews */}
                    {buttons.length > 0 && (
                      <div className="flex justify-end">
                        <div className="max-w-[85%] space-y-1">
                          {buttons.map((button, index) => (
                            <div
                              key={`${button.type}-${index}-phone`}
                              className="bg-white rounded-lg px-3 py-2 text-center text-[13px] text-[#008069] font-medium shadow-sm border border-gray-100"
                            >
                              {button.text || button.url || button.phoneNumber || 'Button'}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Input Bar */}
                  <div className="bg-[#f0f0f0] px-3 py-2 flex items-center gap-2">
                    <div className="flex-1 bg-white rounded-full px-4 py-2">
                      <span className="text-xs text-gray-400">Type a message</span>
                    </div>
                    <div className="w-8 h-8 rounded-full bg-[#008069] flex items-center justify-center">
                      <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M3.4 20.4l17.45-7.48c.81-.35.81-1.49 0-1.84L3.4 3.6c-.66-.29-1.39.2-1.39.91L2 9.12c0 .5.37.93.87.99L17 12 2.87 13.88c-.5.07-.87.5-.87 1l.01 4.61c0 .71.73 1.2 1.39.91z" />
                      </svg>
                    </div>
                  </div>
                </div>
              </div>

              {/* Helper text */}
              <p className="text-xs text-center text-gray-400 mt-4">
                Live preview of your template as it appears on WhatsApp
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ═══ LIBRARY TAB ═══ */}
      {activeTab === 'library' && (
        <>
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <RefreshCw className="w-6 h-6 text-gray-400 animate-spin" />
            </div>
          ) : templates.length === 0 ? (
            <EmptyState
              icon={FileText}
              title="No templates yet"
              description="Create your first message template to get started with WhatsApp campaigns."
              action={
                <Button onClick={() => setActiveTab('create')}>
                  <Plus className="w-4 h-4" />
                  Create Template
                </Button>
              }
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {templates.map((template) => {
                const components = normalizeTemplateComponents(template);
                const header = components.find((c) => c.type?.toUpperCase() === 'HEADER');
                const body = components.find((c) => c.type?.toUpperCase() === 'BODY');
                const footer = components.find((c) => c.type?.toUpperCase() === 'FOOTER');
                const buttonComponent = components.find((c) => c.type?.toUpperCase() === 'BUTTONS');
                const rawButtons = Array.isArray(buttonComponent?.buttons) ? buttonComponent?.buttons : [];
                const quality = getQualityIndicator(template.qualityRating);

                return (
                  <Card key={template.id} className="group hover:shadow-md transition-shadow duration-200">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <h3 className="font-semibold text-gray-900 truncate text-sm">{template.name}</h3>
                          <p className="text-xs text-gray-400 mt-0.5">
                            {template.languageCode || template.language || 'en_US'}
                          </p>
                        </div>
                        <Badge variant={getStatusBadgeVariant(template.status)} dot size="sm">
                          {template.status || 'Draft'}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2 mt-2">
                        <Badge variant={getCategoryBadgeVariant(template.category || template.type)} size="sm">
                          {template.category || template.type || 'General'}
                        </Badge>
                        {template.qualityRating && (
                          <div className="flex items-center gap-1.5 text-xs text-gray-500">
                            <div className={cn('w-2 h-2 rounded-full', quality.color)} />
                            {quality.label}
                          </div>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                      {/* Mini Preview */}
                      <div
                        className="rounded-xl p-3 mb-3"
                        style={{
                          backgroundColor: '#efeae2',
                          backgroundImage: `url("data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23c8c4bc' fill-opacity='0.12'%3E%3Cpath d='M20 18v-2h-2v2h-2v2h2v2h2v-2h2v-2h-2z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
                        }}
                      >
                        <div className="bg-white rounded-lg p-3 text-sm text-gray-800 space-y-2 shadow-sm">
                          {header?.text && (
                            <div className="text-xs font-bold text-gray-600 border-b border-gray-100 pb-1.5">
                              {replaceVariablesWithSamples(header.text)}
                            </div>
                          )}
                          <div className="whitespace-pre-wrap text-xs leading-relaxed line-clamp-4">
                            {replaceVariablesWithSamples(body?.text || template.content || 'No body text available')}
                          </div>
                          {footer?.text && (
                            <div className="text-[11px] text-gray-400 border-t border-gray-100 pt-1.5">
                              {replaceVariablesWithSamples(footer.text)}
                            </div>
                          )}
                          {rawButtons.length > 0 && (
                            <div className="border-t border-gray-100 pt-2 space-y-1">
                              {rawButtons.map((button, index) => (
                                <div
                                  key={`${String(button.type || 'button')}-${index}`}
                                  className="text-center text-xs text-[#008069] font-medium bg-gray-50 rounded-md py-1.5"
                                >
                                  {String(
                                    button.text ||
                                      button.url ||
                                      button.phoneNumber ||
                                      button.phone_number ||
                                      button.payload ||
                                      'Action'
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                        <Button variant="ghost" size="sm" onClick={() => handleEdit(template)} className="text-gray-500 hover:text-[#008069]">
                          <Edit2 className="w-3.5 h-3.5" />
                          Edit
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDelete(template.id)} className="text-gray-500 hover:text-red-600">
                          <Trash2 className="w-3.5 h-3.5" />
                          Delete
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default TemplateStudio;
