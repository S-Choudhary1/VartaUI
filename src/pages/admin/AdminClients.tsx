import React, { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, LogIn, X } from 'lucide-react';
import { getAllClients, createClient, deleteClient } from '../../services/adminService';
import type { ClientDetail, ClientCreateRequest } from '../../types';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { useNavigate } from 'react-router-dom';

const AdminClients = () => {
  const [clients, setClients] = useState<ClientDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');
  const [form, setForm] = useState<ClientCreateRequest>({ name: '', adminUsername: '', adminPassword: '' });
  const navigate = useNavigate();

  const fetchClients = async () => {
    try {
      const data = await getAllClients();
      setClients(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load clients');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClients();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    setCreateError('');
    try {
      await createClient(form);
      setShowCreate(false);
      setForm({ name: '', adminUsername: '', adminPassword: '' });
      await fetchClients();
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : 'Failed to create client');
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this client?')) return;
    try {
      await deleteClient(id);
      setClients(clients.filter(c => c.id !== id));
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete client');
    }
  };

  const handleImpersonate = (clientId: string) => {
    localStorage.setItem('impersonatedClientId', clientId);
    navigate('/dashboard');
    window.location.reload();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-whatsapp-teal"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Clients</h1>
          <p className="text-gray-500 mt-1">Manage all tenant organizations.</p>
        </div>
        <Button onClick={() => setShowCreate(true)}>
          <Plus className="w-4 h-4 mr-2" />
          New Client
        </Button>
      </div>

      {error && <p className="text-red-600">{error}</p>}

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50/50 text-gray-500">
              <tr>
                <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider">Name</th>
                <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider">WABA ID</th>
                <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider">Phone Number ID</th>
                <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider">Created</th>
                <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {clients.map((client) => (
                <tr key={client.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">{client.name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{client.wabaId || '-'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{client.phoneNumberId || '-'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(client.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleImpersonate(client.id)}
                        className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Impersonate"
                      >
                        <LogIn className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(client.id)}
                        className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {clients.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                    No clients yet. Create your first one.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Create Client Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/40" onClick={() => setShowCreate(false)} />
          <div className="relative w-full max-w-md rounded-xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
              <h3 className="text-lg font-semibold text-gray-900">Create New Client</h3>
              <button onClick={() => setShowCreate(false)} className="p-1 text-gray-400 hover:bg-gray-100 rounded-md">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleCreate} className="px-6 py-5 space-y-4">
              {createError && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{createError}</p>}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Client Name</label>
                <input
                  type="text"
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-whatsapp-teal focus:border-transparent"
                  placeholder="Acme Corp"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Admin Username</label>
                <input
                  type="text"
                  required
                  value={form.adminUsername}
                  onChange={(e) => setForm({ ...form, adminUsername: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-whatsapp-teal focus:border-transparent"
                  placeholder="admin@acme"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Admin Password</label>
                <input
                  type="password"
                  required
                  value={form.adminPassword}
                  onChange={(e) => setForm({ ...form, adminPassword: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-whatsapp-teal focus:border-transparent"
                  placeholder="Strong password"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Language (optional)</label>
                <input
                  type="text"
                  value={form.language || ''}
                  onChange={(e) => setForm({ ...form, language: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-whatsapp-teal focus:border-transparent"
                  placeholder="en_US"
                />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <Button variant="outline" type="button" onClick={() => setShowCreate(false)}>Cancel</Button>
                <Button type="submit" disabled={creating}>
                  {creating ? 'Creating...' : 'Create Client'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminClients;
