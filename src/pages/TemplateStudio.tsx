import React, { useEffect, useMemo, useState } from 'react';
import { Plus, RefreshCw, Trash2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import {
  createAdvancedTemplate,
  createTemplate,
  deleteTemplate,
  getTemplates,
  previewAdvancedTemplate,
} from '../services/templateService';
import type {
  AdvancedTemplateRequest,
  Template,
  TemplateButton,
  TemplateButtonType,
  TemplateCategory,
  TemplateLanguageCode,
} from '../types';

type HeaderType = 'NONE' | 'TEXT' | 'IMAGE' | 'VIDEO' | 'DOCUMENT' | 'LOCATION';

const buttonTypes: TemplateButtonType[] = [
  'QUICK_REPLY',
  'URL',
  'PHONE_NUMBER',
  'COPY_CODE',
  'VOICE_CALL',
  'OTP',
];

const TemplateStudio = () => {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [previewText, setPreviewText] = useState('');

  const [name, setName] = useState('');
  const [category, setCategory] = useState<TemplateCategory>('MARKETING');
  const [languageCode, setLanguageCode] = useState<TemplateLanguageCode>('en');
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
    setName('');
    setCategory('MARKETING');
    setLanguageCode('en');
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

  const addButton = () => {
    setButtons((prev) => [...prev, { type: 'QUICK_REPLY', text: '' }]);
  };

  const updateButton = (index: number, patch: Partial<TemplateButton>) => {
    setButtons((prev) => prev.map((btn, idx) => (idx === index ? { ...btn, ...patch } : btn)));
  };

  const removeButton = (index: number) => {
    setButtons((prev) => prev.filter((_, idx) => idx !== index));
  };

  const buildPayload = (): AdvancedTemplateRequest => {
    const components: AdvancedTemplateRequest['components'] = [];

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
      languageCode,
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
      const payload = buildPayload();
      const response = await previewAdvancedTemplate(payload);
      setPreviewText(response.previewText || generateLocalPreviewBody());
    } catch {
      // Fallback local preview if backend preview endpoint is not ready.
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
      await createAdvancedTemplate(payload);
      setSuccess('Template created and submitted for review.');
      resetBuilder();
      await fetchTemplates();
    } catch {
      // Backward compatible fallback to existing endpoint.
      await createTemplate({
        name,
        content: bodyText,
        type: headerType === 'NONE' ? 'TEXT' : headerType,
        languageCode: languageCode === 'en_US' ? 'en' : languageCode,
      });
      setSuccess('Template created using legacy endpoint.');
      resetBuilder();
      await fetchTemplates();
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Template Studio</h1>
          <p className="text-gray-500 mt-1">
            Build Marketing, Utility, and Authentication templates with WhatsApp components.
          </p>
        </div>
        <Button variant="outline" onClick={fetchTemplates}>
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      {error && <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-2">{error}</div>}
      {success && <div className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-4 py-2">{success}</div>}

      <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
        <Card className="xl:col-span-3">
          <CardHeader>
            <CardTitle>Create Template</CardTitle>
          </CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={handleCreate}>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <Input label="Template Name" value={name} onChange={(e) => setName(e.target.value)} required />
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Category</label>
                  <select
                    className="w-full h-10 px-3 py-2 bg-white border border-gray-300 rounded-lg"
                    value={category}
                    onChange={(e) => setCategory(e.target.value as TemplateCategory)}
                  >
                    <option value="MARKETING">Marketing</option>
                    <option value="UTILITY">Utility</option>
                    <option value="AUTHENTICATION">Authentication</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Language</label>
                  <select
                    className="w-full h-10 px-3 py-2 bg-white border border-gray-300 rounded-lg"
                    value={languageCode}
                    onChange={(e) => setLanguageCode(e.target.value as TemplateLanguageCode)}
                  >
                    <option value="en">en</option>
                    <option value="hi">hi</option>
                    <option value="en_US">en_US</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Header</label>
                  <select
                    className="w-full h-10 px-3 py-2 bg-white border border-gray-300 rounded-lg"
                    value={headerType}
                    onChange={(e) => setHeaderType(e.target.value as HeaderType)}
                  >
                    <option value="NONE">None</option>
                    <option value="TEXT">Text</option>
                    <option value="IMAGE">Image</option>
                    <option value="VIDEO">Video</option>
                    <option value="DOCUMENT">Document</option>
                    <option value="LOCATION">Location</option>
                  </select>
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

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Body</label>
                <textarea
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg min-h-28"
                  value={bodyText}
                  onChange={(e) => setBodyText(e.target.value)}
                  placeholder="Hello {{1}}, your order {{2}} is confirmed."
                  required
                />
                {variableKeys.length > 0 && (
                  <p className="text-xs text-gray-500 mt-1">
                    Variables detected: {variableKeys.map((key) => `{{${key}}}`).join(', ')}
                  </p>
                )}
              </div>

              {variableKeys.length > 0 && (
                <div className="space-y-2 rounded-lg border border-gray-200 p-3">
                  <h3 className="text-sm font-semibold text-gray-800">Variable Samples</h3>
                  <p className="text-xs text-gray-500">
                    Add sample values for preview and template submission payload.
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {variableKeys.map((key) => (
                      <Input
                        key={key}
                        label={`Sample for {{${key}}}`}
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

              <div>
                <Input
                  label="Footer (optional)"
                  value={footerText}
                  onChange={(e) => setFooterText(e.target.value)}
                  placeholder="Reply STOP to unsubscribe"
                />
              </div>

              <div className="space-y-3 rounded-lg border border-gray-200 p-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-gray-800">Buttons</h3>
                  <Button type="button" variant="outline" size="sm" onClick={addButton}>
                    <Plus className="w-4 h-4 mr-1" />
                    Add Button
                  </Button>
                </div>
                {buttons.length === 0 && <p className="text-xs text-gray-500">No buttons added.</p>}
                {buttons.map((button, index) => (
                  <div key={`${button.type}-${index}`} className="grid grid-cols-1 md:grid-cols-5 gap-2 items-end">
                    <div>
                      <label className="text-xs text-gray-600">Type</label>
                      <select
                        className="w-full h-10 px-2 border border-gray-300 rounded-lg"
                        value={button.type}
                        onChange={(e) => updateButton(index, { type: e.target.value as TemplateButtonType })}
                      >
                        {buttonTypes.map((type) => (
                          <option key={type} value={type}>
                            {type}
                          </option>
                        ))}
                      </select>
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
                    <Button type="button" variant="ghost" onClick={() => removeButton(index)}>
                      <Trash2 className="w-4 h-4 text-red-600" />
                    </Button>
                  </div>
                ))}
              </div>

              <div className="flex gap-3">
                <Button type="button" variant="outline" onClick={handlePreview} disabled={previewLoading}>
                  {previewLoading ? 'Previewing...' : 'Preview'}
                </Button>
                <Button type="submit" disabled={submitting}>
                  {submitting ? 'Submitting...' : 'Create Template'}
                </Button>
                <Button type="button" variant="ghost" onClick={resetBuilder}>
                  Reset
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle>Live Preview</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg border border-gray-200 bg-[#efeae2] p-4">
              <div className="rounded-lg bg-white p-3 text-sm text-gray-800 space-y-2">
                {previewHeader && (
                  <div className="text-xs font-semibold uppercase text-gray-500 border-b border-gray-100 pb-2">
                    {previewHeader}
                  </div>
                )}
                <div className="whitespace-pre-wrap">{previewBody}</div>
                {footerText.trim() && (
                  <div className="text-xs text-gray-500 border-t border-gray-100 pt-2">{footerText}</div>
                )}
                {buttons.length > 0 && (
                  <div className="border-t border-gray-100 pt-2 space-y-1">
                    {buttons.map((button, index) => (
                      <div
                        key={`${button.type}-${index}-preview`}
                        className="text-xs rounded-md border border-gray-200 px-2 py-1 text-gray-700"
                      >
                        [{button.type}] {button.text || button.url || button.phoneNumber || 'Action'}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div className="text-xs text-gray-500">
              Use this builder for common scenarios: promotions, order updates, OTP/auth, location updates, and
              button-driven interactions.
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Template Library</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-sm text-gray-500">Loading templates...</div>
          ) : templates.length === 0 ? (
            <div className="text-sm text-gray-500">No templates found.</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {templates.map((template) => (
                <div key={template.id} className="rounded-lg border border-gray-200 p-4 space-y-2">
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="font-semibold text-gray-900 truncate">{template.name}</h3>
                    <span className="text-[11px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 uppercase">
                      {template.category || template.type}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 uppercase">{template.language || 'en'}</p>
                  <p className="text-sm text-gray-700 line-clamp-3 whitespace-pre-wrap">{template.content}</p>
                  <div className="pt-1">
                    <Button variant="ghost" size="sm" onClick={() => handleDelete(template.id)}>
                      <Trash2 className="w-4 h-4 text-red-600 mr-1" />
                      Delete
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default TemplateStudio;
