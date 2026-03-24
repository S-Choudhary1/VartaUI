import React, { useState, useEffect } from 'react';
import { FileSpreadsheet, Calendar, Send, AlertCircle, CheckCircle, Clock, BarChart2, FileText, Download, Plus, History, Upload } from 'lucide-react';
import { createCampaign, getAllCampaigns, exportCampaignResponsesCsv } from '../services/campaignService';
import { getApprovedMetaTemplates } from '../services/templateService';
import { getFlows } from '../services/flowService';
import type { MetaTemplate, Campaign, MetaTemplateComponent, Flow } from '../types';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Tabs } from '../components/ui/Tabs';
import { Badge } from '../components/ui/Badge';
import { EmptyState } from '../components/ui/EmptyState';

const campaignTabs = [
  { id: 'create', label: 'Create', icon: Plus },
  { id: 'list', label: 'History', icon: History },
];

const statusBadgeVariant = (status: string): 'success' | 'warning' | 'danger' | 'info' => {
  switch (status) {
    case 'COMPLETED': return 'success';
    case 'FAILED': return 'danger';
    case 'RUNNING': return 'info';
    default: return 'warning';
  }
};

const Campaigns = () => {
  const { user } = useAuth();
  const [templates, setTemplates] = useState<MetaTemplate[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [flows, setFlows] = useState<Flow[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingList, setLoadingList] = useState(true);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [activeTab, setActiveTab] = useState<'create' | 'list'>('create');
  const [exportingCampaignId, setExportingCampaignId] = useState<string | null>(null);

  // Form State
  const [campaignName, setCampaignName] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [selectedFlow, setSelectedFlow] = useState('');
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [scheduledAt, setScheduledAt] = useState('');
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    getApprovedMetaTemplates().then(setTemplates).catch(console.error);
    getFlows().then(f => setFlows(f.filter(fl => fl.status === 'ACTIVE'))).catch(console.error);
    fetchCampaigns();
  }, []);

  const renderTemplatePreview = (template: MetaTemplate | undefined) => {
    if (!template) return null;
    const components = template.components || [];

    const getBodyComponent = () =>
      components.find((component) => component.type === 'BODY');
    const getHeaderComponent = () =>
      components.find((component) => component.type === 'HEADER');
    const getFooterComponent = () =>
      components.find((component) => component.type === 'FOOTER');
    const getButtonsComponent = () =>
      components.find((component) => component.type === 'BUTTONS');

    const replaceVariables = (value?: string) =>
      (value || '').replace(/\{\{(\d+)\}\}/g, (_, idx: string) => `sample_${idx}`);

    const header = getHeaderComponent();
    const body = getBodyComponent();
    const footer = getFooterComponent();
    const buttonComponent = getButtonsComponent();
    const buttons =
      buttonComponent && Array.isArray((buttonComponent as MetaTemplateComponent).buttons)
        ? (buttonComponent as MetaTemplateComponent).buttons || []
        : [];

    return (
      <Card className="mt-4 bg-gray-50/50">
        <CardHeader className="py-3">
          <div className="flex items-center gap-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
            <FileText className="w-3.5 h-3.5" />
            Message Preview
          </div>
        </CardHeader>
        <CardContent className="py-4 space-y-3">
          {header?.text && (
            <p className="text-xs font-semibold uppercase text-gray-500 pb-2 border-b border-gray-200">
              {replaceVariables(header.text)}
            </p>
          )}
          <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
            {replaceVariables(body?.text) || 'No body text found.'}
          </p>
          {footer?.text && (
            <p className="text-xs text-gray-400 pt-2 border-t border-gray-200">
              {replaceVariables(footer.text)}
            </p>
          )}
          {buttons.length > 0 && (
            <div className="border-t border-gray-200 pt-3 space-y-1.5">
              {buttons.map((button, index) => (
                <div key={`${button.type}-${index}`} className="text-xs rounded-lg border border-gray-200 bg-white px-3 py-2 text-gray-600 flex items-center gap-2">
                  <Badge variant="outline" size="sm">{button.type}</Badge>
                  <span>{button.text || button.url || button.payload || 'Action'}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  const fetchCampaigns = async () => {
    setLoadingList(true);
    try {
      const data = await getAllCampaigns();
      setCampaigns(data);
    } catch (error) {
      console.error('Failed to fetch campaigns', error);
    } finally {
      setLoadingList(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setCsvFile(e.target.files[0]);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (file.name.endsWith('.csv')) {
        setCsvFile(file);
      }
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    setLoading(true);

    if (!csvFile) {
      setErrorMsg('Please upload a CSV file.');
      setLoading(false);
      return;
    }

    if (!selectedTemplate) {
      setErrorMsg('Please select a message template.');
      setLoading(false);
      return;
    }

    try {
      const formData = new FormData();
      formData.append('file', csvFile);
      formData.append('name', campaignName);
      formData.append('templateId', selectedTemplate);
      if (scheduledAt) {
        formData.append('scheduledAt', new Date(scheduledAt).toISOString());
      }
      formData.append('uploadedBy', user?.id || '00000000-0000-0000-0000-000000000000');
      if (selectedFlow) {
        formData.append('flowId', selectedFlow);
      }

      await createCampaign(formData);
      setSuccessMsg('Campaign created successfully!');

      // Reset form
      setCampaignName('');
      setSelectedTemplate('');
      setSelectedFlow('');
      setCsvFile(null);
      setScheduledAt('');
      const fileInput = document.getElementById('csvInput') as HTMLInputElement;
      if (fileInput) fileInput.value = '';

      // Switch to list view and refresh
      setTimeout(() => {
      setActiveTab('list');
      fetchCampaigns();
        setSuccessMsg('');
      }, 1500);

    } catch (err) {
      console.error(err);
        const apiMsg =
          err.response?.data?.message ||
          err.response?.data?.error ||
          err.message ||
          "Failed to create campaign.";
      setErrorMsg(apiMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleExportResponses = async (campaign: Campaign) => {
    setErrorMsg('');
    setSuccessMsg('');
    setExportingCampaignId(campaign.id);
    try {
      const { blob, filename } = await exportCampaignResponsesCsv(campaign.id);
      const url = window.URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = filename || `campaign-${campaign.id}-responses.csv`;
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      window.URL.revokeObjectURL(url);
      setSuccessMsg('Campaign responses export downloaded successfully.');
    } catch (error) {
      console.error('Failed to export campaign responses', error);
      setErrorMsg('Failed to export campaign responses. Please try again.');
    } finally {
      setExportingCampaignId(null);
    }
  };

  const getProgressPercent = (campaign: Campaign) =>
    campaign.totalContacts && campaign.totalContacts > 0
      ? Math.round((campaign.processedContacts || 0) / campaign.totalContacts * 100)
      : 0;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 tracking-tight">Campaigns</h1>
          <p className="text-sm text-gray-500 mt-1">Create and manage your broadcast messaging campaigns.</p>
        </div>
        <Tabs
          tabs={campaignTabs}
          active={activeTab}
          onChange={(id) => setActiveTab(id as 'create' | 'list')}
        />
      </div>

      {/* Alerts */}
      {successMsg && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-3 rounded-xl flex items-center gap-2.5 text-sm">
          <CheckCircle className="w-4 h-4 flex-shrink-0" />
          {successMsg}
        </div>
      )}
      {errorMsg && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl flex items-center gap-2.5 text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {errorMsg}
        </div>
      )}

      {/* Create Tab */}
      {activeTab === 'create' ? (
        <div className="max-w-2xl mx-auto space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Campaign Details</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Campaign Name */}
                <Input
                  label="Campaign Name"
                  type="text"
                  required
                  value={campaignName}
                  onChange={(e) => setCampaignName(e.target.value)}
                  placeholder="e.g. Summer Sale Blast"
                />

                {/* Template Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Message Template</label>
                  <div className="relative">
                    <select
                      required
                      value={selectedTemplate}
                      onChange={(e) => setSelectedTemplate(e.target.value)}
                      className="w-full h-10 px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#008069] focus:border-transparent appearance-none transition-all duration-200"
                    >
                      <option value="">Select a template...</option>
                      {templates.map(t => (
                        <option key={t.id} value={t.id}>
                          {t.name}
                        </option>
                      ))}
                    </select>
                    <div className="absolute inset-y-0 right-0 flex items-center px-3 pointer-events-none">
                      <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                    </div>
                  </div>
                </div>
              </form>
            </CardContent>
          </Card>

          {/* Template Preview */}
          {selectedTemplate && renderTemplatePreview(templates.find((template) => template.id === selectedTemplate))}

          {/* File Upload */}
          <Card>
            <CardHeader>
              <CardTitle>Contact List</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                className={`relative flex flex-col items-center justify-center px-6 py-10 border-2 border-dashed rounded-xl transition-all duration-200 cursor-pointer ${
                  isDragging
                    ? 'border-[#008069] bg-[#008069]/5'
                    : csvFile
                      ? 'border-[#008069] bg-emerald-50/30'
                      : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50/50'
                }`}
                onClick={() => document.getElementById('csvInput')?.click()}
              >
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-3 ${
                  csvFile ? 'bg-[#008069]/10' : 'bg-gray-100'
                }`}>
                  {csvFile ? (
                    <CheckCircle className="w-6 h-6 text-[#008069]" />
                  ) : (
                    <Upload className="w-6 h-6 text-gray-400" />
                  )}
                </div>
                {csvFile ? (
                  <div className="text-center">
                    <p className="text-sm font-medium text-gray-900">{csvFile.name}</p>
                    <p className="text-xs text-gray-500 mt-1">Click or drag to replace</p>
                  </div>
                ) : (
                  <div className="text-center">
                    <p className="text-sm text-gray-600">
                      <span className="font-medium text-[#008069]">Click to upload</span> or drag and drop
                    </p>
                    <p className="text-xs text-gray-400 mt-1">CSV file up to 10MB</p>
                  </div>
                )}
                <input id="csvInput" name="file" type="file" accept=".csv" className="sr-only" onChange={handleFileChange} />
              </div>
              <p className="text-xs text-gray-500">
                Required columns: <code className="bg-gray-100 px-1.5 py-0.5 rounded text-gray-700 font-mono text-[11px]">Name</code>, <code className="bg-gray-100 px-1.5 py-0.5 rounded text-gray-700 font-mono text-[11px]">PhoneNumber</code> (with country code)
              </p>
            </CardContent>
          </Card>

          {/* Options */}
          <Card>
            <CardHeader>
              <CardTitle>Options</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              {/* Flow Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Attach Flow <span className="text-gray-400 font-normal">(Optional)</span></label>
                <div className="relative">
                  <select
                    value={selectedFlow}
                    onChange={(e) => setSelectedFlow(e.target.value)}
                    className="w-full h-10 px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#008069] focus:border-transparent appearance-none transition-all duration-200"
                  >
                    <option value="">No flow</option>
                    {flows.map(f => (
                      <option key={f.id} value={f.id}>{f.name}</option>
                    ))}
                  </select>
                  <div className="absolute inset-y-0 right-0 flex items-center px-3 pointer-events-none">
                    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                  </div>
                </div>
                <p className="text-xs text-gray-400 mt-1.5">Contacts will be enrolled in this flow after the campaign message is sent.</p>
              </div>

              {/* Scheduling */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Schedule <span className="text-gray-400 font-normal">(Optional)</span></label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    type="datetime-local"
                    value={scheduledAt}
                    onChange={(e) => setScheduledAt(e.target.value)}
                    className="w-full h-10 pl-10 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#008069] focus:border-transparent outline-none transition-all duration-200"
                  />
                </div>
                <p className="text-xs text-gray-400 mt-1.5">Leave blank to send immediately upon processing.</p>
              </div>
            </CardContent>
          </Card>

          {/* Submit */}
          <Button
            type="submit"
            disabled={loading}
            className="w-full"
            size="lg"
            onClick={handleSubmit}
          >
            {loading ? 'Creating Campaign...' : (
              <>
                <Send className="w-4 h-4" />
                Launch Campaign
              </>
            )}
          </Button>
        </div>
      ) : (
        /* History Tab */
        <Card>
          {loadingList ? (
            <div className="py-16 text-center text-gray-500">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#008069] mx-auto mb-4" />
              <p className="text-sm">Loading campaigns...</p>
            </div>
          ) : campaigns.length === 0 ? (
            <EmptyState
              icon={BarChart2}
              title="No campaigns yet"
              description="Create your first campaign to start reaching out to your customers."
              action={
                <Button onClick={() => setActiveTab('create')}>
                  <Plus className="w-4 h-4" />
                  Create Campaign
                </Button>
              }
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="px-6 py-3.5 text-xs font-medium text-gray-500 uppercase tracking-wider">Campaign</th>
                    <th className="px-6 py-3.5 text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3.5 text-xs font-medium text-gray-500 uppercase tracking-wider">Scheduled</th>
                    <th className="px-6 py-3.5 text-xs font-medium text-gray-500 uppercase tracking-wider">Progress</th>
                    <th className="px-6 py-3.5 text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
                    <th className="px-6 py-3.5 text-xs font-medium text-gray-500 uppercase tracking-wider text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {campaigns.map((campaign) => {
                    const progress = getProgressPercent(campaign);
                    return (
                      <tr key={campaign.id} className="group hover:bg-gray-50/50 transition-colors">
                        <td className="px-6 py-4">
                          <span className="text-sm font-medium text-gray-900">{campaign.name}</span>
                        </td>
                        <td className="px-6 py-4">
                          <Badge variant={statusBadgeVariant(campaign.status)} dot>
                            {campaign.status}
                          </Badge>
                        </td>
                        <td className="px-6 py-4">
                          {campaign.scheduledAt ? (
                            <div className="flex items-center gap-1.5 text-sm text-gray-600">
                              <Clock className="w-3.5 h-3.5 text-gray-400" />
                              {new Date(campaign.scheduledAt).toLocaleString()}
                            </div>
                          ) : (
                            <span className="text-xs text-gray-400 uppercase font-medium tracking-wide">Immediate</span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3 min-w-[140px]">
                            <div className="flex-1 bg-gray-100 rounded-full h-1.5 overflow-hidden">
                              <div
                                className="h-full rounded-full transition-all duration-500"
                                style={{
                                  width: `${progress}%`,
                                  backgroundColor: progress === 100 ? '#10b981' : '#008069',
                                }}
                              />
                            </div>
                            <span className="text-xs text-gray-500 tabular-nums whitespace-nowrap">
                              {campaign.processedContacts || 0}/{campaign.totalContacts || 0}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-sm text-gray-500">
                            {campaign.createdAt ? new Date(campaign.createdAt).toLocaleDateString() : '-'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleExportResponses(campaign)}
                            disabled={exportingCampaignId === campaign.id}
                          >
                            <Download className="w-3.5 h-3.5" />
                            {exportingCampaignId === campaign.id ? 'Exporting...' : 'Export'}
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}
    </div>
  );
};

export default Campaigns;
