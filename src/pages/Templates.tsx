import React, { useEffect, useState } from 'react';
import { Plus, Trash2, FileText, X, Edit2, Check, LayoutGrid, AlertCircle } from 'lucide-react';
import { getTemplates, createTemplate, deleteTemplate, updateTemplate } from '../services/templateService';
import type { Template, TemplateRequest } from '../types';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Card, CardContent } from '../components/ui/Card';

const Templates = () => {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  // Form State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [content, setContent] = useState('');
  const [languageCode, setLanguageCode] = useState<'en' | 'hi'>('en');
  const [type, setType] = useState<'TEXT' | 'MEDIA' | 'INTERACTIVE'>('TEXT');

  const fetchTemplates = async () => {
    try {
      const data = await getTemplates();
      setTemplates(data || []);
    } catch (error) {
      console.error('Failed to fetch templates', error);
      setTemplates([]); // Ensure templates is always an array on error
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTemplates();
  }, []);

  const openModal = (template?: Template) => {
    if (template) {
      setEditingId(template.id);
      setName(template.name);
      setContent(template.content.body || JSON.stringify(template.content));
      setType(template.type);
      setLanguageCode(template.language?.toLowerCase() === 'hi' ? 'hi' : 'en');
    } else {
      setEditingId(null);
      setName('');
      setContent('');
      setLanguageCode('en');
      setType('TEXT');
    }
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload: TemplateRequest = {
        name,
        content: { body: content },
        type: type, // Use the selected type from state
        languageCode,
      };

      if (editingId) {
        await updateTemplate(editingId, payload);
      } else {
        await createTemplate(payload);
      }
      
      setShowModal(false);
      fetchTemplates();
    } catch (error) {
      console.error('Failed to save template', error);
      alert('Failed to save template');
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this template?')) {
      try {
        await deleteTemplate(id);
        fetchTemplates();
      } catch (error) {
        console.error('Failed to delete template', error);
      }
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Message Templates</h1>
          <p className="text-gray-500 mt-1">Create and manage reusable message templates.</p>
        </div>
        <Button onClick={() => openModal()} className="flex items-center gap-2">
          <Plus className="w-5 h-5" />
          Create Template
        </Button>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
           <div className="col-span-full py-12 flex justify-center">
             <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-whatsapp-teal"></div>
           </div>
        ) : templates.length === 0 ? (
           <div className="col-span-full text-center py-16 bg-white rounded-xl border border-dashed border-gray-300">
              <div className="bg-gray-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                 <LayoutGrid className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900">No templates yet</h3>
              <p className="text-gray-500 mt-1 mb-6">Create your first template to start messaging.</p>
              <Button onClick={() => openModal()}>Create Template</Button>
           </div>
        ) : (
          templates.map((template) => (
            <Card key={template.id} className="flex flex-col h-full hover:shadow-md transition-shadow duration-200">
              <CardContent className="p-5 flex flex-col h-full">
              <div className="flex justify-between items-start mb-4">
                  <div className="p-2 bg-green-50 rounded-lg">
                    <FileText className="w-5 h-5 text-whatsapp-teal" />
                </div>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold tracking-wide uppercase
                    ${template.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                  }`}>
                    {template.active ? 'ACTIVE' : 'INACTIVE'}
                </span>
              </div>
              
                <h3 className="text-lg font-bold text-gray-900 mb-2 truncate" title={template.name}>{template.name}</h3>
                <div className="flex gap-2 mb-4">
                  <span className="text-xs font-medium px-2 py-1 bg-gray-100 text-gray-600 rounded uppercase tracking-wide">{template.type}</span>
              </div>

                <div className="bg-[#efeae2] p-3 rounded-lg mb-4 flex-1 overflow-hidden relative border border-[#d1d7db]">
                  <p className="text-sm text-gray-900 whitespace-pre-wrap leading-relaxed line-clamp-4">
                  {typeof template.content === 'string' ? template.content : (template.content.body || JSON.stringify(template.content))}
                </p>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-gray-100 mt-auto">
                <Button 
                  variant="ghost"
                  size="sm"
                  onClick={() => openModal(template)}
                  className="h-8 w-8 p-0 text-gray-500 hover:text-blue-600 hover:bg-blue-50"
                  title="Edit Template"
                >
                  <Edit2 className="w-4 h-4" />
                </Button>
                <Button 
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDelete(template.id)}
                  className="h-8 w-8 p-0 text-gray-500 hover:text-red-600 hover:bg-red-50"
                  title="Delete Template"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
          <div 
             className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm transition-opacity"
             onClick={() => setShowModal(false)}
          />
          
          <div className="relative w-full max-w-lg bg-white rounded-xl shadow-2xl transform transition-all">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
               <h2 className="text-xl font-bold text-gray-900">
                {editingId ? 'Edit Template' : 'Create New Template'}
              </h2>
            <button 
              onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              <div>
                <Input
                   label="Template Name"
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. welcome_message"
                />
                 <p className="text-xs text-gray-500 mt-1.5 flex items-center gap-1">
                   <AlertCircle className="w-3 h-3" />
                   Lowercase, underscores only.
                 </p>
              </div>

              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Type</label>
                   <div className="relative">
                  <select
                    value={type}
                        onChange={(e) => setType(e.target.value)}
                        className="w-full h-10 px-3 py-2 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-whatsapp-teal focus:border-transparent appearance-none"
                  >
                        <option value="TEXT">Text</option>
                        <option value="MEDIA">Media</option>
                        <option value="INTERACTIVE">Interactive</option>
                  </select>
                      <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none">
                        <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                    </div>
                </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Language</label>
                  <div className="relative">
                    <select
                      value={languageCode}
                      onChange={(e) => setLanguageCode(e.target.value as 'en' | 'hi')}
                      className="w-full h-10 px-3 py-2 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-whatsapp-teal focus:border-transparent appearance-none"
                    >
                      <option value="en">English</option>
                      <option value="hi">Hindi</option>
                    </select>
                    <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none">
                      <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Content</label>
                <textarea
                  required
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  rows={5}
                  placeholder="Hello {{1}}, welcome to VartaAI!"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-whatsapp-teal focus:border-transparent outline-none font-mono text-sm resize-none"
                />
                <p className="text-xs text-gray-500 mt-1.5">Use {'{{1}}'}, {'{{2}}'} for variables.</p>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setShowModal(false)}
                >
                  Cancel
                </Button>
                <Button type="submit">
                  {editingId ? 'Update Template' : 'Submit Template'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Templates;
