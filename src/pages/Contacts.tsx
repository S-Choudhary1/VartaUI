import React, { useEffect, useState } from 'react';
import { Plus, Search, Trash2, Phone, Mail, Edit2, X, AlertCircle, Filter, Users } from 'lucide-react';
import { getContacts, createContact, updateContact, deleteContact } from '../services/contactService';
import type { ContactResponse } from '../types';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Card, CardHeader } from '../components/ui/Card';

const Contacts = () => {
  const [contacts, setContacts] = useState<ContactResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [error, setError] = useState('');
  
  // Form State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newEmail, setNewEmail] = useState('');

  const fetchContacts = async () => {
    try {
      const data = await getContacts();
      setContacts(data || []);
    } catch (error) {
      console.error('Failed to fetch contacts', error);
      setError('Failed to load contacts.');
      setContacts([]); // Ensure contacts is always an array on error
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchContacts();
  }, []);

  const openModal = (contact?: ContactResponse) => {
    setError('');
    if (contact) {
      setEditingId(contact.id);
      setNewName(contact.name);
      setNewPhone(contact.phone);
      setNewEmail(contact.email || '');
    } else {
      setEditingId(null);
      setNewName('');
      setNewPhone('');
      setNewEmail('');
    }
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      const contactData: any = {
        name: newName,
        phone: newPhone.trim().replace(/^\+/, ''),
        metadata: newEmail ? { email: newEmail } : {}
      };

      if (editingId) {
        await updateContact(editingId, contactData);
      } else {
        await createContact(contactData);
      }
      
      setShowModal(false);
      fetchContacts();
    } catch (error) {
      console.error('Failed to save contact', error);
      setError('Failed to save contact. Please try again.');
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this contact?')) {
      try {
        await deleteContact(id);
        fetchContacts();
      } catch (error) {
        console.error('Failed to delete contact', error);
        alert('Failed to delete contact');
      }
    }
  };

  const filteredContacts = contacts.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    c.phone.includes(searchTerm)
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Contacts</h1>
          <p className="text-gray-500 mt-1">Manage your customer list and details.</p>
        </div>
        <Button onClick={() => openModal()} className="flex items-center gap-2">
          <Plus className="w-5 h-5" />
          Add Contact
        </Button>
      </div>

      {/* Error Display */}
      {error && !showModal && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center gap-2">
          <AlertCircle className="w-5 h-5" />
          {error}
        </div>
      )}

      <Card>
        <CardHeader className="border-b border-gray-100 p-4">
          <div className="flex flex-col sm:flex-row gap-4">
             <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
        <input 
          type="text"
                placeholder="Search contacts by name or phone..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-whatsapp-teal focus:border-transparent outline-none transition-all"
        />
      </div>
            <Button variant="outline" className="flex items-center gap-2">
              <Filter className="w-4 h-4" />
              Filter
            </Button>
          </div>
        </CardHeader>
        
        <div className="overflow-x-auto">
        <table className="w-full text-left">
            <thead className="bg-gray-50/50 text-gray-500">
            <tr>
                <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider">Name</th>
                <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider">Phone</th>
                <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider">Email</th>
                <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider">Created At</th>
                <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-right">Actions</th>
            </tr>
          </thead>
            <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                    <div className="flex justify-center items-center gap-2">
                       <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-500"></div>
                       Loading contacts...
                    </div>
                  </td>
              </tr>
            ) : filteredContacts.length === 0 ? (
              <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                    <div className="flex flex-col items-center">
                       <div className="bg-gray-50 p-4 rounded-full mb-3">
                         <Users className="w-8 h-8 text-gray-300" />
                       </div>
                       <p className="font-medium text-gray-900">No contacts found</p>
                       <p className="text-sm text-gray-500 mt-1">Try adjusting your search or add a new contact.</p>
                    </div>
                  </td>
              </tr>
            ) : (
              filteredContacts.map((contact) => (
                  <tr key={contact.id} className="hover:bg-gray-50/50 transition-colors group">
                    <td className="px-6 py-4 whitespace-nowrap">
                       <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center text-gray-600 font-bold text-xs">
                             {contact.name.charAt(0).toUpperCase()}
                          </div>
                          <span className="font-medium text-gray-900">{contact.name}</span>
                       </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-gray-600">
                      <div className="flex items-center gap-2">
                        <Phone className="w-3.5 h-3.5 text-gray-400" />
                        {contact.phone}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-600">
                      {(contact.email || (contact.metadata && contact.metadata.email)) ? (
                        <div className="flex items-center gap-2">
                          <Mail className="w-3.5 h-3.5 text-gray-400" />
                          {contact.email || contact.metadata?.email}
                        </div>
                      ) : (
                        <span className="text-gray-400 text-sm">-</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-gray-500 text-sm">
                      {contact.createdAt ? new Date(contact.createdAt).toLocaleDateString() : 'N/A'}
                  </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                        onClick={() => openModal(contact)}
                          className="h-8 w-8 p-0"
                      >
                          <Edit2 className="w-4 h-4 text-blue-600" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm"
                        onClick={() => handleDelete(contact.id)}
                          className="h-8 w-8 p-0 hover:bg-red-50"
                      >
                          <Trash2 className="w-4 h-4 text-red-600" />
                        </Button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
        <div className="border-t border-gray-100 p-4 bg-gray-50/30">
           <div className="flex items-center justify-between text-sm text-gray-500">
              <span>Showing {filteredContacts.length} contacts</span>
              {/* Pagination Placeholder */}
              <div className="flex gap-1">
                 <Button variant="outline" size="sm" disabled>Previous</Button>
                 <Button variant="outline" size="sm" disabled>Next</Button>
              </div>
           </div>
        </div>
      </Card>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
          <div 
            className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm transition-opacity" 
            onClick={() => setShowModal(false)}
          />
          
          <div className="relative w-full max-w-md bg-white rounded-xl shadow-2xl transform transition-all scale-100">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h2 className="text-xl font-bold text-gray-900">
                {editingId ? 'Edit Contact' : 'Add New Contact'}
              </h2>
            <button 
              onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            </div>
            
            {error && (
              <div className="mx-6 mt-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}
            
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <Input
                label="Full Name"
                type="text"
                required
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="e.g. John Doe"
              />
              
              <div>
                <Input
                  label="Phone Number"
                  type="tel"
                  required
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                  placeholder="911234567890"
                />
                <p className="text-xs text-gray-500 mt-1">Add country code 91 (no +).</p>
              </div>

              <Input
                label="Email Address (Optional)"
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="john@example.com"
              />

              <div className="flex justify-end gap-3 pt-4">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setShowModal(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                >
                  {editingId ? 'Update Contact' : 'Save Contact'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Contacts;
