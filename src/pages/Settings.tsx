import React, { useEffect, useState } from 'react';
import {
  Wifi, WifiOff, RefreshCw, AlertCircle, CheckCircle, Loader2, Bell, X,
  Shield, CreditCard, Activity, Zap, Phone, ExternalLink,
  Clock, Globe, ArrowRight
} from 'lucide-react';
import { getWhatsAppStatus, retryProvisioning } from '../services/whatsappService';
import { getUnresolvedAlerts, resolveAlert, resolveAllAlerts } from '../services/alertService';
import type { WhatsAppStatus, OnboardingStatus, AccountAlert } from '../types';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { cn } from '../components/ui/Button';
import { useAuth } from '../context/AuthContext';
import EmbeddedSignup from '../components/whatsapp/EmbeddedSignup';

const META_APP_ID = '3093323707495695';
const META_CONFIG_ID = '1494192019089832';

// Meta official links
const META_PAYMENT_URL = 'https://business.facebook.com/billing_hub/payment_settings';
const META_BUSINESS_VERIFICATION_URL = 'https://business.facebook.com/settings/security';
const META_BUSINESS_VERIFICATION_DOC = 'https://developers.facebook.com/docs/development/release/business-verification';
const META_WABA_OVERVIEW_DOC = 'https://developers.facebook.com/docs/whatsapp/overview';

// ─── Onboarding step definitions ───
interface OnboardingStep {
  key: OnboardingStatus;
  label: string;
  description: string;
  icon: React.ElementType;
}

const ONBOARDING_STEPS: OnboardingStep[] = [
  { key: 'TOKEN_OBTAINED', label: 'Connect WhatsApp', description: 'Link your WhatsApp Business Account via Meta Embedded Signup', icon: Wifi },
  { key: 'TOKEN_EXCHANGED', label: 'Secure Token', description: 'Exchange for a long-lived access token (60 days)', icon: Shield },
  { key: 'WEBHOOK_SUBSCRIBED', label: 'Webhook Setup', description: 'Subscribe your app to receive WhatsApp notifications', icon: Bell },
  { key: 'PROFILE_SYNCED', label: 'Profile Sync', description: 'Fetch business profile, phone details, and messaging limits', icon: Globe },
  { key: 'READY', label: 'Messaging Ready', description: 'Your account is fully provisioned and ready to send messages', icon: CheckCircle },
];

const STATUS_ORDER: OnboardingStatus[] = [
  'NOT_STARTED', 'TOKEN_OBTAINED', 'TOKEN_EXCHANGED',
  'WEBHOOK_SUBSCRIBED', 'PROFILE_SYNCED', 'READY',
];

function getStepState(current: OnboardingStatus | undefined, step: OnboardingStatus): 'complete' | 'current' | 'failed' | 'upcoming' {
  if (!current || current === 'NOT_STARTED') {
    return step === 'TOKEN_OBTAINED' ? 'current' : 'upcoming';
  }
  if (current === 'FAILED') return 'failed';
  const currentIdx = STATUS_ORDER.indexOf(current);
  const stepIdx = STATUS_ORDER.indexOf(step);
  if (stepIdx <= currentIdx) return 'complete';
  if (stepIdx === currentIdx + 1) return 'current';
  return 'upcoming';
}

const SEVERITY_STYLES: Record<string, string> = {
  CRITICAL: 'bg-red-50 border-red-200 text-red-800',
  WARNING: 'bg-amber-50 border-amber-200 text-amber-800',
  INFO: 'bg-blue-50 border-blue-200 text-blue-800',
};

const Settings = () => {
  const { user } = useAuth();
  const [status, setStatus] = useState<WhatsAppStatus | null>(null);
  const [alerts, setAlerts] = useState<AccountAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [retrying, setRetrying] = useState(false);
  const [showSignup, setShowSignup] = useState(false);

  const fetchStatus = async () => {
    if (!user?.clientId) { setLoading(false); return; }
    try {
      const [statusData, alertData] = await Promise.all([
        getWhatsAppStatus(),
        getUnresolvedAlerts().catch(() => [] as AccountAlert[]),
      ]);
      setStatus(statusData);
      setAlerts(alertData);
    } catch (err) {
      console.error('Failed to fetch WhatsApp status', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchStatus(); }, []);

  const handleOnboardSuccess = (newStatus: WhatsAppStatus) => {
    setStatus(newStatus);
    setShowSignup(false);
  };

  const handleRetry = async () => {
    setRetrying(true);
    try {
      const data = await retryProvisioning();
      setStatus(data);
    } catch (err) {
      console.error('Retry provisioning failed', err);
    } finally {
      setRetrying(false);
    }
  };

  const handleResolveAlert = async (alertId: string) => {
    try {
      await resolveAlert(alertId);
      setAlerts(prev => prev.filter(a => a.id !== alertId));
    } catch (err) {
      console.error('Failed to resolve alert', err);
    }
  };

  const handleResolveAll = async () => {
    try { await resolveAllAlerts(); setAlerts([]); } catch {}
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#008069]"></div>
      </div>
    );
  }

  const isFullyReady = status?.onboardingStatus === 'READY';
  const isConnected = status?.connected;
  const isFailed = status?.onboardingStatus === 'FAILED';

  // ─── Build action items (same logic as admin drawer) ───
  type ActionItem = { label: string; desc: string; icon: React.ElementType; variant: 'danger' | 'warning' | 'info'; action?: () => void; href?: string };
  const actionItems: ActionItem[] = [];

  if (isFailed) {
    actionItems.push({ label: 'Provisioning Failed', desc: status?.provisioningError || 'Setup did not complete. Retry to continue.', icon: AlertCircle, variant: 'danger', action: handleRetry });
  } else if (!isConnected) {
    actionItems.push({ label: 'Connect WhatsApp', desc: 'Link your WhatsApp Business Account to get started.', icon: Wifi, variant: 'warning', action: () => setShowSignup(true) });
  } else if (isConnected && !isFullyReady && status?.onboardingStatus !== 'NOT_STARTED') {
    actionItems.push({ label: 'Provisioning Incomplete', desc: `Currently at: ${status?.onboardingStatus}. Retry to complete remaining steps.`, icon: RefreshCw, variant: 'warning', action: handleRetry });
  }

  if (isConnected && (!status?.businessVerificationStatus || status?.businessVerificationStatus === 'not_verified')) {
    actionItems.push({ label: 'Business Not Verified', desc: 'Business verification is required to unlock higher messaging limits and official account badge.', icon: Shield, variant: 'warning', href: META_BUSINESS_VERIFICATION_URL });
  }

  if (isConnected && (!status?.billingStatus || status?.billingStatus === 'NO_PAYMENT_METHOD' || status?.billingStatus === 'UNKNOWN')) {
    actionItems.push({ label: 'Payment Method Required', desc: 'Your account is in sandbox mode. Add a payment method in Meta Business Suite to send messages to real users.', icon: CreditCard, variant: 'warning', href: META_PAYMENT_URL });
  }

  if (isConnected && status?.qualityRating === 'RED') {
    actionItems.push({ label: 'Quality Rating Critical', desc: 'Phone number quality is RED — messaging may be restricted or limited.', icon: AlertCircle, variant: 'danger' });
  } else if (isConnected && status?.qualityRating === 'YELLOW') {
    actionItems.push({ label: 'Quality Rating Warning', desc: 'Phone number quality is YELLOW — improve to avoid future restrictions.', icon: AlertCircle, variant: 'warning' });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Settings</h1>
          <p className="text-sm text-gray-500 mt-0.5">Manage your WhatsApp connection, account health, and notifications.</p>
        </div>
        {isConnected && (
          <Button variant="outline" size="sm" onClick={handleRetry} disabled={retrying} title="Refresh data from Meta">
            {retrying ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
            Refresh
          </Button>
        )}
      </div>

      {/* ─── Action Items ─── */}
      {actionItems.length > 0 && (
        <div className="space-y-2">
          {actionItems.map((item, i) => {
            const Icon = item.icon;
            return (
              <div key={i} className={cn(
                'flex items-center justify-between gap-4 p-4 rounded-xl border',
                item.variant === 'danger' ? 'bg-red-50/80 border-red-200' :
                item.variant === 'warning' ? 'bg-amber-50/80 border-amber-200' :
                'bg-blue-50/80 border-blue-200'
              )}>
                <div className="flex items-start gap-3 min-w-0">
                  <div className={cn('p-2 rounded-lg shrink-0',
                    item.variant === 'danger' ? 'bg-red-100' : item.variant === 'warning' ? 'bg-amber-100' : 'bg-blue-100'
                  )}>
                    <Icon className={cn('w-5 h-5',
                      item.variant === 'danger' ? 'text-red-600' : item.variant === 'warning' ? 'text-amber-600' : 'text-blue-600'
                    )} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-900">{item.label}</p>
                    <p className="text-sm text-gray-600 mt-0.5">{item.desc}</p>
                  </div>
                </div>
                <div className="shrink-0">
                  {item.action && (
                    <Button size="sm" onClick={item.action} disabled={retrying}>
                      {retrying ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ArrowRight className="w-3.5 h-3.5" />}
                      {item.label.includes('Connect') ? 'Connect' : 'Fix Now'}
                    </Button>
                  )}
                  {item.href && (
                    <a href={item.href} target="_blank" rel="noopener noreferrer">
                      <Button size="sm" variant="outline">
                        <ExternalLink className="w-3.5 h-3.5" />Open
                      </Button>
                    </a>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ─── Onboarding Progress ─── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {isFullyReady ? <CheckCircle className="w-5 h-5 text-emerald-500" /> : <Activity className="w-5 h-5 text-gray-400" />}
            Onboarding Progress
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="space-y-0">
            {ONBOARDING_STEPS.map((step, idx) => {
              const Icon = step.icon;
              const state = getStepState(status?.onboardingStatus, step.key);
              const isLast = idx === ONBOARDING_STEPS.length - 1;
              return (
                <div key={step.key} className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <div className={cn(
                      'w-8 h-8 rounded-full flex items-center justify-center shrink-0 border-2 transition-all',
                      state === 'complete' ? 'bg-emerald-500 border-emerald-500' :
                      state === 'current' ? 'bg-white border-[#008069] shadow-sm' :
                      state === 'failed' ? 'bg-red-500 border-red-500' :
                      'bg-gray-100 border-gray-200'
                    )}>
                      {state === 'complete' ? <CheckCircle className="w-4 h-4 text-white" /> :
                       state === 'failed' ? <AlertCircle className="w-4 h-4 text-white" /> :
                       state === 'current' ? <Icon className="w-4 h-4 text-[#008069]" /> :
                       <Icon className="w-4 h-4 text-gray-400" />}
                    </div>
                    {!isLast && <div className={cn('w-0.5 h-full min-h-[32px]', state === 'complete' ? 'bg-emerald-300' : 'bg-gray-200')} />}
                  </div>
                  <div className={cn('pb-6', isLast && 'pb-0')}>
                    <div className="flex items-center gap-2">
                      <p className={cn('text-sm font-semibold',
                        state === 'complete' ? 'text-emerald-700' : state === 'current' ? 'text-gray-900' : state === 'failed' ? 'text-red-700' : 'text-gray-400'
                      )}>{step.label}</p>
                      {state === 'complete' && <Badge variant="success" size="sm">Done</Badge>}
                      {state === 'current' && !isFailed && <Badge variant="warning" size="sm" dot>Action Needed</Badge>}
                      {state === 'failed' && <Badge variant="danger" size="sm" dot>Failed</Badge>}
                    </div>
                    <p className={cn('text-xs mt-0.5', state === 'complete' || state === 'current' ? 'text-gray-500' : 'text-gray-400')}>{step.description}</p>
                    {state === 'current' && step.key === 'TOKEN_OBTAINED' && !isConnected && (
                      <Button size="sm" className="mt-2" onClick={() => setShowSignup(true)}><Wifi className="w-3.5 h-3.5" />Connect WhatsApp</Button>
                    )}
                    {state === 'current' && step.key !== 'TOKEN_OBTAINED' && (
                      <Button size="sm" variant="outline" className="mt-2" onClick={handleRetry} disabled={retrying}>
                        {retrying ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}Retry Setup
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* ─── Account Health ─── */}
      {isConnected && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Zap className="w-5 h-5 text-[#008069]" />Account Health</CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <HealthTile icon={Activity} label="Quality Rating" value={status?.qualityRating || '--'}
                color={status?.qualityRating === 'GREEN' ? 'emerald' : status?.qualityRating === 'YELLOW' ? 'amber' : status?.qualityRating === 'RED' ? 'red' : 'gray'} />
              <HealthTile icon={Zap} label="Messaging Limit" value={status?.messagingLimitTier || '--'} color="blue" />
              <HealthTile icon={Phone} label="Phone Status" value={status?.phoneStatus || '--'}
                color={status?.phoneStatus === 'CONNECTED' ? 'emerald' : status?.phoneStatus === 'FLAGGED' ? 'red' : 'gray'} />
              <HealthTile icon={Clock} label="Token Status" value={isFullyReady ? 'Active' : '--'}
                color={isFullyReady ? 'emerald' : 'amber'} />
            </div>
          </CardContent>
        </Card>
      )}

      {/* ─── Connection Details ─── */}
      {isConnected && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2"><Wifi className="w-5 h-5 text-emerald-500" />Connection Details</CardTitle>
              <Button variant="outline" size="sm" onClick={() => setShowSignup(true)}><RefreshCw className="w-3.5 h-3.5" />Reconnect</Button>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            <div className="bg-gray-50 rounded-xl p-4 space-y-3">
              <DetailRow label="WABA ID" value={status?.wabaId} mono />
              <DetailRow label="Phone Number ID" value={status?.phoneNumberId} mono />
              <DetailRow label="Business Name" value={status?.businessName} />
              <DetailRow label="Verified Name" value={status?.verifiedName} />
              <DetailRow label="Onboarding Status" badge={
                <Badge variant={isFullyReady ? 'success' : isFailed ? 'danger' : 'warning'} dot>{status?.onboardingStatus || 'Unknown'}</Badge>
              } />
            </div>
          </CardContent>
        </Card>
      )}

      {/* ─── Verification & Billing (with external links + docs) ─── */}
      {isConnected && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Shield className="w-5 h-5 text-[#008069]" />Verification & Billing</CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="bg-gray-50 rounded-xl p-4 space-y-4">
              {/* Business Verification */}
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">Business Verification</span>
                <div className="flex items-center gap-2">
                  {status?.businessVerificationStatus ? (
                    <Badge variant={status.businessVerificationStatus === 'verified' ? 'success' : status.businessVerificationStatus === 'rejected' ? 'danger' : 'warning'}>
                      {status.businessVerificationStatus}
                    </Badge>
                  ) : <Badge variant="default">Not Verified</Badge>}
                  {(!status?.businessVerificationStatus || status?.businessVerificationStatus !== 'verified') && (
                    <a href={META_BUSINESS_VERIFICATION_URL} target="_blank" rel="noopener noreferrer">
                      <Button size="sm" variant="ghost" title="Verify your business in Meta Business Suite">
                        <ExternalLink className="w-3 h-3" />
                      </Button>
                    </a>
                  )}
                </div>
              </div>
              {(!status?.businessVerificationStatus || status?.businessVerificationStatus !== 'verified') && (
                <a href={META_BUSINESS_VERIFICATION_DOC} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-700">
                  <ExternalLink className="w-3 h-3" />How to verify your business — Meta documentation
                </a>
              )}

              <div className="border-t border-gray-200" />

              {/* Account Review */}
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">Account Review</span>
                {status?.accountReviewStatus ? (
                  <Badge variant={status.accountReviewStatus === 'APPROVED' ? 'success' : 'warning'}>{status.accountReviewStatus}</Badge>
                ) : <span className="text-sm text-gray-400">--</span>}
              </div>

              <div className="border-t border-gray-200" />

              {/* Billing */}
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">Billing / Payment Method</span>
                <div className="flex items-center gap-2">
                  {status?.billingStatus ? (
                    <Badge variant={status.billingStatus === 'ACTIVE' ? 'success' : status.billingStatus === 'NO_PAYMENT_METHOD' ? 'danger' : 'warning'}>
                      {status.billingStatus}
                    </Badge>
                  ) : <Badge variant="default">Not Set</Badge>}
                  {(!status?.billingStatus || status?.billingStatus !== 'ATTACHED') && (
                    <a href={META_PAYMENT_URL} target="_blank" rel="noopener noreferrer">
                      <Button size="sm" variant="ghost" title="Add payment method in Meta Business Suite">
                        <ExternalLink className="w-3 h-3" />
                      </Button>
                    </a>
                  )}
                </div>
              </div>
              {(!status?.billingStatus || status?.billingStatus !== 'ATTACHED') && (
                <a href={META_WABA_OVERVIEW_DOC} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-700">
                  <ExternalLink className="w-3 h-3" />WhatsApp Business Platform billing documentation
                </a>
              )}

              <div className="border-t border-gray-200" />

              {/* Quality Rating */}
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">Quality Rating</span>
                {status?.qualityRating ? (
                  <Badge variant={status.qualityRating === 'GREEN' ? 'success' : status.qualityRating === 'YELLOW' ? 'warning' : status.qualityRating === 'RED' ? 'danger' : 'default'}>
                    {status.qualityRating}
                  </Badge>
                ) : <span className="text-sm text-gray-400">--</span>}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ─── Alerts ─── */}
      {alerts.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Bell className="w-5 h-5 text-amber-500" />Notifications <Badge variant="danger">{alerts.length}</Badge>
              </CardTitle>
              <Button variant="ghost" size="sm" onClick={handleResolveAll}>Dismiss All</Button>
            </div>
          </CardHeader>
          <CardContent className="p-4">
            <div className="space-y-2">
              {alerts.map(alert => (
                <div key={alert.id} className={cn('flex items-start justify-between gap-3 p-3 rounded-xl border', SEVERITY_STYLES[alert.severity])}>
                  <div className="flex items-start gap-3 min-w-0">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium">{alert.title}</p>
                      <p className="text-xs mt-0.5 opacity-80">{alert.message}</p>
                      <p className="text-xs mt-1 opacity-60">
                        {new Date(alert.createdAt).toLocaleString()}
                        {alert.category !== 'UNKNOWN' && ` · ${alert.category.replace(/_/g, ' ')}`}
                      </p>
                    </div>
                  </div>
                  <button onClick={() => handleResolveAlert(alert.id)} className="shrink-0 p-1 rounded-lg hover:bg-black/5"><X className="w-4 h-4" /></button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ─── Embedded Signup Modal ─── */}
      {showSignup && (
        <EmbeddedSignup onClose={() => setShowSignup(false)} onSuccess={handleOnboardSuccess} appId={META_APP_ID} configId={META_CONFIG_ID} />
      )}
    </div>
  );
};

// ─── Helper Components ───

const DetailRow = ({ label, value, mono, badge }: { label: string; value?: string; mono?: boolean; badge?: React.ReactNode }) => (
  <div className="flex items-center justify-between">
    <span className="text-sm text-gray-500">{label}</span>
    {badge ? badge : <span className={cn('text-sm text-gray-900', mono && 'font-mono text-xs')}>{value || '--'}</span>}
  </div>
);

const colorMap: Record<string, { bg: string; text: string; iconBg: string }> = {
  emerald: { bg: 'bg-emerald-50', text: 'text-emerald-700', iconBg: 'bg-emerald-100' },
  amber: { bg: 'bg-amber-50', text: 'text-amber-700', iconBg: 'bg-amber-100' },
  red: { bg: 'bg-red-50', text: 'text-red-700', iconBg: 'bg-red-100' },
  blue: { bg: 'bg-blue-50', text: 'text-blue-700', iconBg: 'bg-blue-100' },
  gray: { bg: 'bg-gray-50', text: 'text-gray-500', iconBg: 'bg-gray-100' },
};

const HealthTile = ({ icon: Icon, label, value, color }: { icon: React.ElementType; label: string; value: string; color: string }) => {
  const c = colorMap[color] || colorMap.gray;
  return (
    <div className={cn('rounded-xl border border-gray-100 p-4', c.bg)}>
      <div className="flex items-center gap-2 mb-2">
        <div className={cn('p-1.5 rounded-lg', c.iconBg)}><Icon className={cn('w-4 h-4', c.text)} /></div>
        <span className="text-xs text-gray-500 font-medium">{label}</span>
      </div>
      <p className={cn('text-lg font-bold', c.text)}>{value}</p>
    </div>
  );
};

export default Settings;
