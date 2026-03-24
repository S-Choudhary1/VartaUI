import React, { useEffect, useState } from 'react';
import { Plus, Trash2, Phone, Mail, Edit2, AlertCircle, Upload, Users, Tag } from 'lucide-react';
import { getContacts, createContact, updateContact, deleteContact } from '../services/contactService';
import type { ContactResponse } from '../types';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Card, CardHeader } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { EmptyState } from '../components/ui/EmptyState';
import { Avatar } from '../components/ui/Avatar';
import { SearchBar } from '../components/ui/SearchBar';

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
  const [newTags, setNewTags] = useState('');

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
      setNewTags(contact.tags ? contact.tags.join(', ') : '');
    } else {
      setEditingId(null);
      setNewName('');
      setNewPhone('');
      setNewEmail('');
      setNewTags('');
    }
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      const parsedTags = newTags
        .split(',')
        .map(t => t.trim())
        .filter(t => t.length > 0);
      const contactData: any = {
        name: newName,
        phone: newPhone,
        tags: parsedTags.length > 0 ? parsedTags : undefined,
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

  const tagColors: Array<'success' | 'info' | 'warning' | 'danger' | 'default'> = ['success', 'info', 'warning', 'danger', 'default'];
  const getTagVariant = (tag: string) => {
    let hash = 0;
    for (let i = 0; i < tag.length; i++) {
      hash = tag.charCodeAt(i) + ((hash << 5) - hash);
    }
    return tagColors[Math.abs(hash) % tagColors.length];
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Contacts</h1>
          <p className="text-sm text-gray-500 mt-1">Manage your customer list and details.</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" className="gap-2">
            <Upload className="w-4 h-4" />
            Import CSV
          </Button>
          <Button onClick={() => openModal()} className="gap-2">
            <Plus className="w-4 h-4" />
            Add Contact
          </Button>
        </div>
      </div>

      {/* Error Display */}
      {error && !showModal && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl flex items-center gap-2 text-sm">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      {/* Search + Filter Bar */}
      <Card>
        <CardHeader className="p-4">
          <div className="flex flex-col sm:flex-row items-center gap-3">
            <SearchBar
              placeholder="Search by name or phone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1"
            />
            {searchTerm && (
              <Badge variant="outline" className="shrink-0">
                {filteredContacts.length} result{filteredContacts.length !== 1 ? 's' : ''}
              </Badge>
            )}
          </div>
        </CardHeader>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-gray-100/80">
                <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Contact</th>
                <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Phone</th>
                <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Tags</th>
                <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
                <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-16 text-center">
                    <div className="flex justify-center items-center gap-2 text-sm text-gray-500">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-[#008069]"></div>
                      Loading contacts...
                    </div>
                  </td>
                </tr>
              ) : filteredContacts.length === 0 ? (
                <tr>
                  <td colSpan={6}>
                    <EmptyState
                      icon={Users}
                      title="No contacts found"
                      description={searchTerm ? 'Try adjusting your search term.' : 'Add your first contact to get started.'}
                      action={
                        !searchTerm ? (
                          <Button onClick={() => openModal()} className="gap-2">
                            <Plus className="w-4 h-4" />
                            Add Contact
                          </Button>
                        ) : undefined
                      }
                    />
                  </td>
                </tr>
              ) : (
                filteredContacts.map((contact) => (
                  <tr key={contact.id} className="group hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <Avatar name={contact.name} size="sm" />
                        <span className="text-sm font-medium text-gray-900">{contact.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Phone className="w-3.5 h-3.5 text-gray-400" />
                        {contact.phone}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {(contact.email || (contact.metadata && contact.metadata.email)) ? (
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Mail className="w-3.5 h-3.5 text-gray-400" />
                          {contact.email || contact.metadata?.email}
                        </div>
                      ) : (
                        <span className="text-sm text-gray-300">--</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {contact.tags && contact.tags.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {contact.tags.slice(0, 3).map((tag, idx) => (
                            <Badge key={idx} variant={getTagVariant(tag)} size="sm">
                              {tag}
                            </Badge>
                          ))}
                          {contact.tags.length > 3 && (
                            <Badge variant="outline" size="sm">
                              +{contact.tags.length - 3}
                            </Badge>
                          )}
                        </div>
                      ) : (
                        <span className="text-sm text-gray-300">--</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {contact.createdAt
                        ? new Date(contact.createdAt).toLocaleDateString(undefined, {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                          })
                        : 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openModal(contact)}
                          className="h-8 w-8 p-0"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(contact.id)}
                          className="h-8 w-8 p-0 hover:bg-red-50 hover:text-red-600"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Footer / Pagination */}
        {!loading && filteredContacts.length > 0 && (
          <div className="border-t border-gray-100/80 px-6 py-3 bg-gray-50/30">
            <div className="flex items-center justify-between text-sm text-gray-500">
              <span>
                Showing <span className="font-medium text-gray-700">{filteredContacts.length}</span> of{' '}
                <span className="font-medium text-gray-700">{contacts.length}</span> contacts
              </span>
              <div className="flex gap-1">
                <Button variant="outline" size="sm" disabled>Previous</Button>
                <Button variant="outline" size="sm" disabled>Next</Button>
              </div>
            </div>
          </div>
        )}
      </Card>

      {/* Add / Edit Modal */}
      <Modal
        open={showModal}
        onClose={() => setShowModal(false)}
        title={editingId ? 'Edit Contact' : 'Add New Contact'}
        description={editingId ? 'Update the contact details below.' : 'Fill in the details to add a new contact.'}
        size="md"
        footer={
          <>
            <Button variant="ghost" onClick={() => setShowModal(false)}>
              Cancel
            </Button>
            <Button type="submit" form="contact-form">
              {editingId ? 'Update Contact' : 'Save Contact'}
            </Button>
          </>
        }
      >
        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            {error}
          </div>
        )}

        <form id="contact-form" onSubmit={handleSubmit} className="space-y-4">
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
              placeholder="+1234567890"
            />
            <p className="text-xs text-gray-400 mt-1.5">Include country code (e.g. 91 for India)</p>
          </div>

          <Input
            label="Email Address (Optional)"
            type="email"
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
            placeholder="john@example.com"
          />

          <div>
            <label className="flex items-center gap-1.5 text-sm font-medium text-gray-700 mb-1.5">
              <Tag className="w-3.5 h-3.5" />
              Tags
            </label>
            <input
              type="text"
              value={newTags}
              onChange={(e) => setNewTags(e.target.value)}
              placeholder="e.g. VIP, Lead, Newsletter"
              className="flex h-10 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#008069] focus:border-transparent transition-all duration-200"
            />
            <p className="text-xs text-gray-400 mt-1.5">Separate multiple tags with commas</p>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default Contacts;
