import React, { useState, useEffect } from 'react';
import { Upload, FileSpreadsheet, Calendar, Send, AlertCircle, CheckCircle, Clock, BarChart2, FileText } from 'lucide-react';
import { createCampaign, getAllCampaigns, exportCampaignResponses } from '../services/campaignService';
import { getTemplates } from '../services/templateService';
import type { Template, Campaign } from '../types';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';

const Campaigns = () => {
  const { user } = useAuth();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingList, setLoadingList] = useState(true);
  const [exportingId, setExportingId] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [activeTab, setActiveTab] = useState<'create' | 'list'>('create');

  // Form State
  const [campaignName, setCampaignName] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [scheduledAt, setScheduledAt] = useState('');

  useEffect(() => {
    getTemplates().then(setTemplates).catch(console.error);
    fetchCampaigns();
  }, []);

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

      await createCampaign(formData);
      setSuccessMsg('Campaign created successfully!');
      
      // Reset form
      setCampaignName('');
      setSelectedTemplate('');
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
      setErrorMsg('Failed to create campaign. Check your inputs.');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async (campaignId: string) => {
    setErrorMsg('');
    setExportingId(campaignId);
    try {
      const { blob, filename } = await exportCampaignResponses(campaignId);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to export responses', error);
      setErrorMsg('Failed to export campaign responses.');
    } finally {
      setExportingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Campaigns</h1>
          <p className="text-gray-500 mt-1">Create and manage your broadcast messaging campaigns.</p>
        </div>
        
        <div className="bg-white p-1 rounded-xl border border-gray-200 shadow-sm inline-flex">
          <button
            onClick={() => setActiveTab('create')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
              activeTab === 'create' 
                ? 'bg-whatsapp-teal text-white shadow-sm' 
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            }`}
          >
            Create New
          </button>
          <button
            onClick={() => setActiveTab('list')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
              activeTab === 'list' 
                ? 'bg-whatsapp-teal text-white shadow-sm' 
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            }`}
          >
            History
          </button>
        </div>
      </div>

      {activeTab === 'create' ? (
        <Card className="max-w-3xl mx-auto">
          <CardHeader>
             <CardTitle>New Campaign Details</CardTitle>
          </CardHeader>
          <CardContent>
          {successMsg && (
              <div className="mb-6 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg flex items-center gap-2">
              <CheckCircle className="w-5 h-5" />
              {successMsg}
            </div>
          )}
          {errorMsg && (
              <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center gap-2">
              <AlertCircle className="w-5 h-5" />
              {errorMsg}
            </div>
          )}

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
                        className="w-full h-10 px-3 py-2 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-whatsapp-teal focus:border-transparent appearance-none"
              >
                <option value="">Select a template...</option>
                {templates.map(t => (
                  <option key={t.id} value={t.id}>
                    {t.name} ({t.language})
                  </option>
                ))}
              </select>
                    <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none">
                        <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                    </div>
                </div>
              {selectedTemplate && (
                  <div className="mt-3 p-4 bg-gray-50 rounded-lg border border-gray-100">
                    <div className="flex items-center gap-2 text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                       <FileText className="w-3 h-3" />
                       Message Preview
                    </div>
                    <p className="text-sm text-gray-700 whitespace-pre-wrap">
                      {(() => {
                    const t = templates.find(t => t.id === selectedTemplate);
                    return t?.content?.body || JSON.stringify(t?.content || {});
                  })()}
                </p>
                  </div>
              )}
            </div>

            {/* File Upload */}
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Upload Contacts (CSV)</label>
                <div 
                    className={`mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-dashed rounded-xl transition-colors ${
                        csvFile ? 'border-whatsapp-teal bg-teal-50/30' : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'
                    }`}
                >
                <div className="space-y-1 text-center">
                    <FileSpreadsheet className={`mx-auto h-12 w-12 ${csvFile ? 'text-whatsapp-teal' : 'text-gray-400'}`} />
                    <div className="flex text-sm text-gray-600 justify-center">
                    <label
                      htmlFor="csvInput"
                        className="relative cursor-pointer rounded-md font-medium text-whatsapp-teal hover:text-whatsapp-teal-dark focus-within:outline-none"
                    >
                      <span>Upload a file</span>
                      <input id="csvInput" name="file" type="file" accept=".csv" className="sr-only" onChange={handleFileChange} />
                    </label>
                    <p className="pl-1">or drag and drop</p>
                  </div>
                  <p className="text-xs text-gray-500">CSV up to 10MB</p>
                  {csvFile && (
                      <div className="flex items-center justify-center gap-2 mt-2 text-sm text-whatsapp-teal font-semibold">
                         <CheckCircle className="w-4 h-4" />
                         {csvFile.name}
                      </div>
                  )}
                </div>
              </div>
              <p className="mt-2 text-xs text-gray-500">
                  Required columns: <code className="bg-gray-100 px-1 py-0.5 rounded text-gray-700">Name</code>, <code className="bg-gray-100 px-1 py-0.5 rounded text-gray-700">PhoneNumber</code> (with country code)
              </p>
            </div>

            {/* Scheduling */}
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Schedule (Optional)</label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="datetime-local"
                  value={scheduledAt}
                  onChange={(e) => setScheduledAt(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-whatsapp-teal focus:border-transparent outline-none"
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">Leave blank to send immediately upon processing.</p>
            </div>

            {/* Submit Button */}
              <div className="pt-4 border-t border-gray-100">
                <Button
                type="submit"
                disabled={loading}
                  className="w-full"
                  size="lg"
              >
                {loading ? 'Creating Campaign...' : (
                  <>
                      <Send className="w-5 h-5 mr-2" />
                    Launch Campaign
                  </>
                )}
                </Button>
            </div>
          </form>
          </CardContent>
        </Card>
      ) : (
        <Card>
           {errorMsg && (
             <div className="m-6 mb-0 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center gap-2">
               <AlertCircle className="w-5 h-5" />
               {errorMsg}
             </div>
           )}
           {loadingList ? (
             <div className="p-12 text-center text-gray-500">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-whatsapp-teal mx-auto mb-4"></div>
                Loading campaigns...
             </div>
           ) : campaigns.length === 0 ? (
             <div className="p-16 text-center flex flex-col items-center">
               <div className="bg-gray-50 p-6 rounded-full mb-4">
                 <BarChart2 className="w-10 h-10 text-gray-300" />
               </div>
               <h3 className="text-lg font-medium text-gray-900">No campaigns yet</h3>
               <p className="text-gray-500 mt-1 max-w-sm">Create your first campaign to start reaching out to your customers.</p>
               <Button 
                 onClick={() => setActiveTab('create')}
                 className="mt-6"
               >
                 Create Campaign
               </Button>
             </div>
           ) : (
             <div className="overflow-x-auto">
               <table className="w-full text-left">
                 <thead className="bg-gray-50/50 border-b border-gray-100 text-gray-500">
                   <tr>
                     <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider">Campaign Name</th>
                     <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider">Status</th>
                     <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider">Scheduled At</th>
                     <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider">Progress</th>
                     <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider">Created At</th>
                     <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-right">Responses CSV</th>
                   </tr>
                 </thead>
                 <tbody className="divide-y divide-gray-100">
                   {campaigns.map((campaign) => (
                     <tr key={campaign.id} className="hover:bg-gray-50/50 transition-colors">
                       <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">
                         {campaign.name}
                       </td>
                       <td className="px-6 py-4 whitespace-nowrap">
                         <span className={`px-2.5 py-1 text-xs rounded-full font-medium border ${
                           campaign.status === 'COMPLETED' ? 'bg-green-50 text-green-700 border-green-100' :
                           campaign.status === 'FAILED' ? 'bg-red-50 text-red-700 border-red-100' :
                           campaign.status === 'RUNNING' ? 'bg-blue-50 text-blue-700 border-blue-100' :
                           'bg-yellow-50 text-yellow-700 border-yellow-100'
                         }`}>
                           {campaign.status}
                         </span>
                       </td>
                       <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                         {campaign.scheduledAt ? (
                           <div className="flex items-center gap-1.5">
                             <Clock className="w-3.5 h-3.5" />
                             {new Date(campaign.scheduledAt).toLocaleString()}
                           </div>
                         ) : (
                            <span className="text-gray-400 text-xs uppercase font-medium tracking-wide">Immediate</span>
                         )}
                       </td>
                       <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          <div className="flex items-center gap-2">
                             <div className="flex-1 w-24 bg-gray-200 rounded-full h-1.5">
                                <div 
                                    className="bg-whatsapp-teal h-1.5 rounded-full" 
                                    style={{ width: `${campaign.totalContacts > 0 ? (campaign.processedContacts / campaign.totalContacts) * 100 : 0}%` }}
                                ></div>
                             </div>
                             <span className="text-xs">{campaign.processedContacts || 0}/{campaign.totalContacts || 0}</span>
                          </div>
                       </td>
                       <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                         {campaign.createdAt ? new Date(campaign.createdAt).toLocaleDateString() : '-'}
                       </td>
                       <td className="px-6 py-4 whitespace-nowrap text-right">
                         <Button
                           variant="outline"
                           size="sm"
                           onClick={() => handleExport(campaign.id)}
                           disabled={exportingId === campaign.id}
                         >
                           {exportingId === campaign.id ? 'Exporting...' : 'Download CSV'}
                         </Button>
                       </td>
                     </tr>
                   ))}
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
