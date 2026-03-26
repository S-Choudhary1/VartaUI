import React, { useEffect, useState, useMemo } from 'react';
import {
  Plus, Trash2, Eye, Building2, X, Wifi, Shield, CreditCard,
  AlertCircle, CheckCircle, Clock, RefreshCw, Bell, ChevronRight,
  Activity, Phone, Zap, ExternalLink, Loader2, ArrowRight
} from 'lucide-react';
import {
  getAllClients, createClient, deleteClient, getClientAlerts,
  refreshClientData, retryClientProvisioning
} from '../../services/adminService';
import type { ClientDetail, ClientCreateRequest, AccountAlert } from '../../types';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Badge } from '../../components/ui/Badge';
import { Avatar } from '../../components/ui/Avatar';
import { Modal } from '../../components/ui/Modal';
import { SearchBar } from '../../components/ui/SearchBar';
import { EmptyState } from '../../components/ui/EmptyState';
import { cn } from '../../components/ui/Button';
import { useNavigate } from 'react-router-dom';

// Meta official doc links
const META_PAYMENT_URL = 'https://business.facebook.com/billing_hub/payment_settings';
const META_BUSINESS_VERIFICATION_URL = 'https://business.facebook.com/settings/security';
const META_BUSINESS_VERIFICATION_DOC = 'https://developers.facebook.com/docs/development/release/business-verification';
const META_WABA_OVERVIEW_DOC = 'https://developers.facebook.com/docs/whatsapp/overview';

const SEVERITY_STYLES: Record<string, string> = {
  CRITICAL: 'bg-red-50 border-red-200 text-red-800',
  WARNING: 'bg-amber-50 border-amber-200 text-amber-800',
  INFO: 'bg-blue-50 border-blue-200 text-blue-800',
};

function getOnboardingBadge(status?: string) {
  if (!status || status === 'NOT_STARTED') return <Badge variant="default">Not Started</Badge>;
  if (status === 'READY') return <Badge variant="success" dot>Ready</Badge>;
  if (status === 'FAILED') return <Badge variant="danger" dot>Failed</Badge>;
  return <Badge variant="warning" dot>In Progress</Badge>;
}

function getQualityBadge(quality?: string) {
  if (!quality) return <span className="text-xs text-gray-400">--</span>;
  if (quality === 'GREEN') return <Badge variant="success">Green</Badge>;
  if (quality === 'YELLOW') return <Badge variant="warning">Yellow</Badge>;
  if (quality === 'RED') return <Badge variant="danger">Red</Badge>;
  return <Badge variant="default">{quality}</Badge>;
}

function formatDate(date?: string) {
  if (!date) return '--';
  return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

const AdminClients = () => {
  const [clients, setClients] = useState<ClientDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');
  const [form, setForm] = useState<ClientCreateRequest>({ name: '', adminUsername: '', adminPassword: '' });
  const [search, setSearch] = useState('');
  const [selectedClient, setSelectedClient] = useState<ClientDetail | null>(null);
  const [clientAlerts, setClientAlerts] = useState<AccountAlert[]>([]);
  const [alertsLoading, setAlertsLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [retryingProvision, setRetryingProvision] = useState(false);
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

  useEffect(() => { fetchClients(); }, []);

  const filteredClients = useMemo(() => {
    if (!search.trim()) return clients;
    const q = search.toLowerCase();
    return clients.filter(c =>
      c.name.toLowerCase().includes(q) ||
      (c.wabaId && c.wabaId.toLowerCase().includes(q)) ||
      (c.phoneNumberId && c.phoneNumberId.toLowerCase().includes(q)) ||
      (c.businessName && c.businessName.toLowerCase().includes(q))
    );
  }, [clients, search]);

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
      if (selectedClient?.id === id) setSelectedClient(null);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete client');
    }
  };

  const handleImpersonate = (clientId: string) => {
    localStorage.setItem('impersonatedClientId', clientId);
    navigate('/dashboard');
    window.location.reload();
  };

  const openClientDetail = async (client: ClientDetail) => {
    setSelectedClient(client);
    setAlertsLoading(true);
    try {
      const alerts = await getClientAlerts(client.id);
      setClientAlerts(alerts);
    } catch { setClientAlerts([]); }
    finally { setAlertsLoading(false); }
  };

  // Refresh client data from Meta APIs (sync phone details, profile, verification)
  const handleRefresh = async () => {
    if (!selectedClient) return;
    setRefreshing(true);
    try {
      const updated = await refreshClientData(selectedClient.id);
      setSelectedClient(updated);
      setClients(prev => prev.map(c => c.id === updated.id ? updated : c));
    } catch (err) {
      console.error('Refresh failed', err);
    } finally {
      setRefreshing(false);
    }
  };

  // Retry full provisioning pipeline for a client
  const handleRetryProvisioning = async () => {
    if (!selectedClient) return;
    setRetryingProvision(true);
    try {
      const updated = await retryClientProvisioning(selectedClient.id);
      setSelectedClient(updated);
      setClients(prev => prev.map(c => c.id === updated.id ? updated : c));
    } catch (err) {
      console.error('Retry provisioning failed', err);
    } finally {
      setRetryingProvision(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#008069]"></div>
      </div>
    );
  }

  // Build action items for the selected client
  const buildActionItems = (client: ClientDetail) => {
    const items: { label: string; desc: string; icon: React.ElementType; variant: 'danger' | 'warning' | 'info'; action?: () => void; href?: string }[] = [];

    if (client.onboardingStatus === 'FAILED') {
      items.push({ label: 'Provisioning Failed', desc: client.provisioningError || 'Setup did not complete. Retry to continue.', icon: AlertCircle, variant: 'danger', action: handleRetryProvisioning });
    } else if (client.onboardingStatus && client.onboardingStatus !== 'READY' && client.onboardingStatus !== 'NOT_STARTED') {
      items.push({ label: 'Provisioning Incomplete', desc: `Currently at: ${client.onboardingStatus}. Retry to complete remaining steps.`, icon: RefreshCw, variant: 'warning', action: handleRetryProvisioning });
    }

    if (client.wabaId && (!client.businessVerificationStatus || client.businessVerificationStatus === 'not_verified')) {
      items.push({ label: 'Business Not Verified', desc: 'Business verification is required to unlock higher messaging limits and official account badge.', icon: Shield, variant: 'warning', href: META_BUSINESS_VERIFICATION_URL });
    }

    if (client.wabaId && (!client.billingStatus || client.billingStatus === 'FAILED')) {
      items.push({ label: client.billingStatus === 'FAILED' ? 'Payment Setup Failed' : 'Payment Method Required', desc: 'A payment method must be attached to enable conversation-based billing.', icon: CreditCard, variant: client.billingStatus === 'FAILED' ? 'danger' : 'warning', href: META_PAYMENT_URL });
    }

    if (client.qualityRating === 'RED') {
      items.push({ label: 'Quality Rating Critical', desc: 'Phone number quality is RED — messaging may be restricted or limited.', icon: AlertCircle, variant: 'danger' });
    } else if (client.qualityRating === 'YELLOW') {
      items.push({ label: 'Quality Rating Warning', desc: 'Phone number quality is YELLOW — improve to avoid future restrictions.', icon: AlertCircle, variant: 'warning' });
    }

    if (client.tokenExpiresAt && new Date(client.tokenExpiresAt) < new Date(Date.now() + 7 * 86400000)) {
      items.push({ label: 'Token Expiring Soon', desc: `Token expires ${formatDate(client.tokenExpiresAt)}. Refresh to extend.`, icon: Clock, variant: 'danger', action: handleRefresh });
    }

    return items;
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Clients</h1>
          <p className="text-sm text-gray-500 mt-0.5">Manage all tenant organizations and monitor their health</p>
        </div>
        <Button onClick={() => setShowCreate(true)}><Plus className="w-4 h-4" />New Client</Button>
      </div>

      {error && <div className="text-sm text-red-600 bg-red-50 border border-red-200/60 px-4 py-3 rounded-xl">{error}</div>}

      <SearchBar placeholder="Search by name, business name, WABA ID, or phone..." value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-md" />

      {/* Client Cards Grid */}
      {clients.length === 0 ? (
        <EmptyState icon={Building2} title="No clients yet" description="Create your first tenant organization to get started."
          action={<Button onClick={() => setShowCreate(true)}><Plus className="w-4 h-4" />Create Client</Button>} />
      ) : filteredClients.length === 0 ? (
        <EmptyState icon={Building2} title="No matching clients" description="Try adjusting your search query." />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredClients.map((client) => (
            <Card key={client.id} className="hover:shadow-md transition-all duration-200 cursor-pointer group" onClick={() => openClientDetail(client)}>
              <div className="p-5">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <Avatar name={client.name} size="md" />
                    <div>
                      <h3 className="font-semibold text-gray-900 text-sm">{client.name}</h3>
                      {client.businessName && client.businessName !== client.name && <p className="text-xs text-gray-500">{client.businessName}</p>}
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-gray-500 transition-colors" />
                </div>
                <div className="flex items-center flex-wrap gap-2 mb-3">
                  {getOnboardingBadge(client.onboardingStatus)}
                  {getQualityBadge(client.qualityRating)}
                  {(client.unresolvedAlertCount ?? 0) > 0 && <Badge variant="danger" dot>{client.unresolvedAlertCount} alert{(client.unresolvedAlertCount ?? 0) > 1 ? 's' : ''}</Badge>}
                  {client.wabaId && !client.businessVerificationStatus && <Badge variant="warning">Unverified</Badge>}
                  {client.wabaId && (!client.billingStatus || client.billingStatus === 'FAILED') && <Badge variant="info">No Billing</Badge>}
                </div>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
                  <div className="text-gray-400">WABA ID</div>
                  <div className="text-gray-700 font-mono truncate">{client.wabaId || '--'}</div>
                  <div className="text-gray-400">Phone</div>
                  <div className="text-gray-700 font-mono truncate">{client.phoneNumberId || '--'}</div>
                  <div className="text-gray-400">Msg Limit</div>
                  <div className="text-gray-700">{client.messagingLimitTier || '--'}</div>
                  <div className="text-gray-400">Created</div>
                  <div className="text-gray-700">{new Date(client.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</div>
                </div>
                <div className="flex items-center gap-2 mt-4 pt-3 border-t border-gray-100">
                  <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); handleImpersonate(client.id); }}><Eye className="w-3.5 h-3.5" />View as</Button>
                  <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700 hover:bg-red-50" onClick={(e) => { e.stopPropagation(); handleDelete(client.id); }}><Trash2 className="w-3.5 h-3.5" /></Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* ═══ Client Detail Drawer ═══ */}
      {selectedClient && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="fixed inset-0 bg-black/40 animate-fade-in" onClick={() => setSelectedClient(null)} />
          <div className="relative w-full max-w-xl bg-white shadow-2xl overflow-y-auto animate-slide-up">
            {/* Drawer Header */}
            <div className="sticky top-0 bg-white z-10 border-b border-gray-100 px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Avatar name={selectedClient.name} size="lg" />
                <div>
                  <h2 className="text-lg font-bold text-gray-900">{selectedClient.name}</h2>
                  {selectedClient.businessName && <p className="text-sm text-gray-500">{selectedClient.businessName}</p>}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={handleRefresh} disabled={refreshing} title="Refresh data from Meta">
                  {refreshing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                </Button>
                <button onClick={() => setSelectedClient(null)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="px-6 py-5 space-y-6">
              {/* ─── Action Items ─── */}
              {(() => {
                const items = buildActionItems(selectedClient);
                if (items.length === 0) return null;
                return (
                  <div className="space-y-2">
                    <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-2">
                      <AlertCircle className="w-3.5 h-3.5" />Action Required
                    </h3>
                    {items.map((item, i) => {
                      const Icon = item.icon;
                      return (
                        <div key={i} className={cn(
                          'flex items-center justify-between gap-3 p-3 rounded-xl border',
                          item.variant === 'danger' ? 'bg-red-50 border-red-200' :
                          item.variant === 'warning' ? 'bg-amber-50 border-amber-200' :
                          'bg-blue-50 border-blue-200'
                        )}>
                          <div className="flex items-start gap-2.5 min-w-0">
                            <Icon className={cn('w-4 h-4 shrink-0 mt-0.5',
                              item.variant === 'danger' ? 'text-red-500' : item.variant === 'warning' ? 'text-amber-500' : 'text-blue-500'
                            )} />
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-gray-900">{item.label}</p>
                              <p className="text-xs text-gray-600 mt-0.5">{item.desc}</p>
                            </div>
                          </div>
                          {item.action && (
                            <Button size="sm" onClick={item.action} disabled={retryingProvision || refreshing} className="shrink-0">
                              {(retryingProvision || refreshing) ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ArrowRight className="w-3.5 h-3.5" />}
                              Fix
                            </Button>
                          )}
                          {item.href && (
                            <a href={item.href} target="_blank" rel="noopener noreferrer" className="shrink-0">
                              <Button size="sm" variant="outline">
                                <ExternalLink className="w-3.5 h-3.5" />Open
                              </Button>
                            </a>
                          )}
                        </div>
                      );
                    })}
                  </div>
                );
              })()}

              {/* ─── Onboarding Status ─── */}
              <div>
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <Activity className="w-3.5 h-3.5" />Onboarding Status
                </h3>
                <div className="flex items-center gap-3">
                  {getOnboardingBadge(selectedClient.onboardingStatus)}
                  {selectedClient.onboardingStatus !== 'READY' && selectedClient.onboardingStatus !== 'NOT_STARTED' && (
                    <Button size="sm" variant="outline" onClick={handleRetryProvisioning} disabled={retryingProvision}>
                      {retryingProvision ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                      Retry Provisioning
                    </Button>
                  )}
                </div>
                {selectedClient.provisioningError && (
                  <p className="text-xs text-red-600 mt-2 bg-red-50 p-2 rounded-lg">{selectedClient.provisioningError}</p>
                )}
              </div>

              {/* ─── Connection Details ─── */}
              <div>
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <Wifi className="w-3.5 h-3.5" />Connection Details
                </h3>
                <div className="bg-gray-50 rounded-xl p-4 space-y-3">
                  <DetailRow label="WABA ID" value={selectedClient.wabaId} mono />
                  <DetailRow label="Phone Number ID" value={selectedClient.phoneNumberId} mono />
                  <DetailRow label="Verified Name" value={selectedClient.verifiedName} />
                  <DetailRow label="Language" value={selectedClient.language} />
                  <DetailRow label="Client ID" value={selectedClient.id} mono />
                </div>
              </div>

              {/* ─── Health & Limits ─── */}
              <div>
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <Zap className="w-3.5 h-3.5" />Health & Limits
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  <HealthCard icon={Activity} label="Quality Rating" value={selectedClient.qualityRating || '--'}
                    color={selectedClient.qualityRating === 'GREEN' ? 'text-emerald-600 bg-emerald-50' : selectedClient.qualityRating === 'YELLOW' ? 'text-amber-600 bg-amber-50' : selectedClient.qualityRating === 'RED' ? 'text-red-600 bg-red-50' : 'text-gray-500 bg-gray-50'} />
                  <HealthCard icon={Zap} label="Messaging Limit" value={selectedClient.messagingLimitTier || '--'} color="text-blue-600 bg-blue-50" />
                  <HealthCard icon={Phone} label="Phone Status" value={selectedClient.phoneStatus || '--'}
                    color={selectedClient.phoneStatus === 'CONNECTED' ? 'text-emerald-600 bg-emerald-50' : selectedClient.phoneStatus === 'FLAGGED' ? 'text-red-600 bg-red-50' : 'text-gray-500 bg-gray-50'} />
                  <HealthCard icon={Clock} label="Token Expires"
                    value={selectedClient.tokenExpiresAt ? new Date(selectedClient.tokenExpiresAt).toLocaleDateString() : '--'}
                    color={selectedClient.tokenExpiresAt && new Date(selectedClient.tokenExpiresAt) < new Date(Date.now() + 7 * 86400000) ? 'text-red-600 bg-red-50' : 'text-gray-500 bg-gray-50'} />
                </div>
              </div>

              {/* ─── Verification & Billing (with action links) ─── */}
              <div>
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <Shield className="w-3.5 h-3.5" />Verification & Billing
                </h3>
                <div className="bg-gray-50 rounded-xl p-4 space-y-4">
                  {/* Business Verification */}
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500">Business Verification</span>
                    <div className="flex items-center gap-2">
                      {selectedClient.businessVerificationStatus ? (
                        <Badge variant={selectedClient.businessVerificationStatus === 'verified' ? 'success' : selectedClient.businessVerificationStatus === 'rejected' ? 'danger' : 'warning'}>
                          {selectedClient.businessVerificationStatus}
                        </Badge>
                      ) : <Badge variant="default">Not Verified</Badge>}
                      {(!selectedClient.businessVerificationStatus || selectedClient.businessVerificationStatus !== 'verified') && (
                        <a href={META_BUSINESS_VERIFICATION_URL} target="_blank" rel="noopener noreferrer">
                          <Button size="sm" variant="ghost" title="Open Meta Business Verification">
                            <ExternalLink className="w-3 h-3" />
                          </Button>
                        </a>
                      )}
                    </div>
                  </div>
                  {(!selectedClient.businessVerificationStatus || selectedClient.businessVerificationStatus !== 'verified') && (
                    <a href={META_BUSINESS_VERIFICATION_DOC} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-700">
                      <ExternalLink className="w-3 h-3" />View Meta verification documentation
                    </a>
                  )}

                  <div className="border-t border-gray-200" />

                  {/* Account Review */}
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500">Account Review</span>
                    {selectedClient.accountReviewStatus ? (
                      <Badge variant={selectedClient.accountReviewStatus === 'APPROVED' ? 'success' : 'warning'}>
                        {selectedClient.accountReviewStatus}
                      </Badge>
                    ) : <span className="text-sm text-gray-400">--</span>}
                  </div>

                  <div className="border-t border-gray-200" />

                  {/* Billing */}
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500">Billing</span>
                    <div className="flex items-center gap-2">
                      {selectedClient.billingStatus ? (
                        <Badge variant={selectedClient.billingStatus === 'ATTACHED' ? 'success' : selectedClient.billingStatus === 'FAILED' ? 'danger' : 'warning'}>
                          {selectedClient.billingStatus}
                        </Badge>
                      ) : <Badge variant="default">Not Set</Badge>}
                      {(!selectedClient.billingStatus || selectedClient.billingStatus !== 'ATTACHED') && (
                        <a href={META_PAYMENT_URL} target="_blank" rel="noopener noreferrer">
                          <Button size="sm" variant="ghost" title="Add payment method in Meta Business Suite">
                            <ExternalLink className="w-3 h-3" />
                          </Button>
                        </a>
                      )}
                    </div>
                  </div>
                  {(!selectedClient.billingStatus || selectedClient.billingStatus !== 'ATTACHED') && (
                    <a href={META_WABA_OVERVIEW_DOC} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-700">
                      <ExternalLink className="w-3 h-3" />WhatsApp Business Platform billing docs
                    </a>
                  )}
                </div>
              </div>

              {/* ─── Timeline ─── */}
              <div>
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <Clock className="w-3.5 h-3.5" />Timeline
                </h3>
                <div className="bg-gray-50 rounded-xl p-4 space-y-3">
                  <DetailRow label="Created" value={formatDate(selectedClient.createdAt)} />
                  <DetailRow label="Last Synced" value={formatDate(selectedClient.lastSyncedAt)} />
                  <DetailRow label="Token Expires" value={formatDate(selectedClient.tokenExpiresAt)} />
                </div>
              </div>

              {/* ─── Alerts ─── */}
              <div>
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <Bell className="w-3.5 h-3.5" />Alerts
                  {clientAlerts.length > 0 && <Badge variant="danger">{clientAlerts.length}</Badge>}
                </h3>
                {alertsLoading ? (
                  <div className="flex items-center justify-center py-6">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-[#008069]"></div>
                  </div>
                ) : clientAlerts.length === 0 ? (
                  <div className="text-center py-6 text-sm text-gray-400">
                    <CheckCircle className="w-8 h-8 text-gray-300 mx-auto mb-2" />No unresolved alerts
                  </div>
                ) : (
                  <div className="space-y-2">
                    {clientAlerts.map(alert => (
                      <div key={alert.id} className={cn('p-3 rounded-xl border text-sm', SEVERITY_STYLES[alert.severity])}>
                        <p className="font-medium">{alert.title}</p>
                        <p className="mt-0.5 opacity-80 text-xs">{alert.message}</p>
                        <p className="mt-1 text-xs opacity-60">
                          {new Date(alert.createdAt).toLocaleString()}
                          {alert.category !== 'UNKNOWN' && ` · ${alert.category.replace(/_/g, ' ')}`}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* ─── Bottom Actions ─── */}
              <div className="flex gap-3 pt-2 border-t border-gray-100">
                <Button variant="outline" className="flex-1" onClick={() => handleImpersonate(selectedClient.id)}>
                  <Eye className="w-4 h-4" />View as Client
                </Button>
                <Button variant="danger" onClick={() => handleDelete(selectedClient.id)}>
                  <Trash2 className="w-4 h-4" />Delete
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create Client Modal */}
      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Create New Client" description="Set up a new tenant organization with admin credentials." size="sm"
        footer={<><Button variant="outline" type="button" onClick={() => setShowCreate(false)}>Cancel</Button><Button type="submit" form="create-client-form" disabled={creating}>{creating ? 'Creating...' : 'Create Client'}</Button></>}>
        <form id="create-client-form" onSubmit={handleCreate} className="space-y-4">
          {createError && <div className="text-sm text-red-600 bg-red-50 border border-red-200/60 px-3 py-2 rounded-lg">{createError}</div>}
          <Input label="Client Name" type="text" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Acme Corp" />
          <Input label="Admin Username" type="text" required value={form.adminUsername} onChange={(e) => setForm({ ...form, adminUsername: e.target.value })} placeholder="admin@acme" />
          <Input label="Admin Password" type="password" required value={form.adminPassword} onChange={(e) => setForm({ ...form, adminPassword: e.target.value })} placeholder="Strong password" />
          <Input label="Language (optional)" type="text" value={form.language || ''} onChange={(e) => setForm({ ...form, language: e.target.value })} placeholder="en_US" />
        </form>
      </Modal>
    </div>
  );
};

// ─── Helper Components ───

const DetailRow = ({ label, value, mono }: { label: string; value?: string; mono?: boolean }) => (
  <div className="flex items-center justify-between">
    <span className="text-sm text-gray-500">{label}</span>
    <span className={cn('text-sm text-gray-900', mono && 'font-mono text-xs')}>{value || '--'}</span>
  </div>
);

const HealthCard = ({ icon: Icon, label, value, color }: { icon: React.ElementType; label: string; value: string; color: string }) => (
  <div className="bg-white border border-gray-100 rounded-xl p-3">
    <div className="flex items-center gap-2 mb-1.5">
      <div className={cn('p-1 rounded-md', color.split(' ')[1])}>
        <Icon className={cn('w-3.5 h-3.5', color.split(' ')[0])} />
      </div>
      <span className="text-xs text-gray-400">{label}</span>
    </div>
    <p className={cn('text-sm font-semibold', color.split(' ')[0])}>{value}</p>
  </div>
);

export default AdminClients;
