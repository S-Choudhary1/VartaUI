import React, { useEffect, useState } from 'react';
import {
  Wifi, WifiOff, RefreshCw, AlertCircle, CheckCircle, Loader2, Bell, X,
  Shield, CreditCard, Activity, Zap, Phone, ChevronRight, ExternalLink,
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

// ─── Onboarding step definitions ───
interface OnboardingStep {
  key: OnboardingStatus;
  label: string;
  description: string;
  icon: React.ElementType;
  actionLabel?: string;
}

const ONBOARDING_STEPS: OnboardingStep[] = [
  { key: 'TOKEN_OBTAINED', label: 'Connect WhatsApp', description: 'Link your WhatsApp Business Account via Meta Embedded Signup', icon: Wifi, actionLabel: 'Connect Now' },
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
  if (stepIdx < currentIdx) return 'complete';
  if (stepIdx === currentIdx) return 'complete';
  // Next step after current is the "current" action item
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
  const needsAction = !isFullyReady;
  const isFailed = status?.onboardingStatus === 'FAILED';

  // Determine pending action items beyond provisioning
  const actionItems: { label: string; description: string; icon: React.ElementType; badgeVariant: 'warning' | 'danger' | 'info'; action?: () => void }[] = [];

  if (isFailed) {
    actionItems.push({
      label: 'Provisioning Failed',
      description: status?.provisioningError || 'An error occurred during setup. Retry to continue.',
      icon: AlertCircle,
      badgeVariant: 'danger',
      action: handleRetry,
    });
  } else if (!isConnected) {
    actionItems.push({
      label: 'Connect WhatsApp',
      description: 'Link your WhatsApp Business Account to get started.',
      icon: Wifi,
      badgeVariant: 'warning',
      action: () => setShowSignup(true),
    });
  } else if (isConnected && !isFullyReady) {
    actionItems.push({
      label: 'Complete Provisioning',
      description: 'Some setup steps are still pending. Retry to finish provisioning.',
      icon: RefreshCw,
      badgeVariant: 'warning',
      action: handleRetry,
    });
  }

  if (isConnected && !status?.businessVerificationStatus) {
    actionItems.push({
      label: 'Business Verification Pending',
      description: 'Verify your business with Meta to unlock higher messaging limits.',
      icon: Shield,
      badgeVariant: 'info',
    });
  }

  if (isConnected && (!status?.billingStatus || status?.billingStatus === 'FAILED')) {
    actionItems.push({
      label: status?.billingStatus === 'FAILED' ? 'Billing Setup Failed' : 'Billing Not Configured',
      description: 'Attach a payment method to enable message-based billing.',
      icon: CreditCard,
      badgeVariant: status?.billingStatus === 'FAILED' ? 'danger' : 'info',
    });
  }

  if (isConnected && status?.qualityRating === 'RED') {
    actionItems.push({
      label: 'Quality Rating Critical',
      description: 'Your phone number quality is RED. Messaging may be restricted.',
      icon: AlertCircle,
      badgeVariant: 'danger',
    });
  } else if (isConnected && status?.qualityRating === 'YELLOW') {
    actionItems.push({
      label: 'Quality Rating Warning',
      description: 'Your phone number quality is YELLOW. Improve to avoid restrictions.',
      icon: AlertCircle,
      badgeVariant: 'warning',
    });
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Settings</h1>
        <p className="text-sm text-gray-500 mt-0.5">Manage your WhatsApp connection, account health, and notifications.</p>
      </div>

      {/* ─── Action Items Banner ─── */}
      {actionItems.length > 0 && (
        <div className="space-y-3">
          {actionItems.map((item, i) => {
            const Icon = item.icon;
            return (
              <div key={i} className={cn(
                'flex items-center justify-between gap-4 p-4 rounded-xl border',
                item.badgeVariant === 'danger' ? 'bg-red-50/80 border-red-200' :
                item.badgeVariant === 'warning' ? 'bg-amber-50/80 border-amber-200' :
                'bg-blue-50/80 border-blue-200'
              )}>
                <div className="flex items-start gap-3">
                  <div className={cn(
                    'p-2 rounded-lg shrink-0',
                    item.badgeVariant === 'danger' ? 'bg-red-100' :
                    item.badgeVariant === 'warning' ? 'bg-amber-100' : 'bg-blue-100'
                  )}>
                    <Icon className={cn(
                      'w-5 h-5',
                      item.badgeVariant === 'danger' ? 'text-red-600' :
                      item.badgeVariant === 'warning' ? 'text-amber-600' : 'text-blue-600'
                    )} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{item.label}</p>
                    <p className="text-sm text-gray-600 mt-0.5">{item.description}</p>
                  </div>
                </div>
                {item.action && (
                  <Button size="sm" onClick={item.action} disabled={retrying}>
                    {retrying && item.label.includes('Provisioning') ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <ArrowRight className="w-3.5 h-3.5" />
                    )}
                    {item.label.includes('Connect') ? 'Connect' : 'Fix Now'}
                  </Button>
                )}
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
                  {/* Timeline line + dot */}
                  <div className="flex flex-col items-center">
                    <div className={cn(
                      'w-8 h-8 rounded-full flex items-center justify-center shrink-0 border-2 transition-all',
                      state === 'complete' ? 'bg-emerald-500 border-emerald-500' :
                      state === 'current' ? 'bg-white border-[#008069] shadow-sm' :
                      state === 'failed' ? 'bg-red-500 border-red-500' :
                      'bg-gray-100 border-gray-200'
                    )}>
                      {state === 'complete' ? (
                        <CheckCircle className="w-4 h-4 text-white" />
                      ) : state === 'failed' ? (
                        <AlertCircle className="w-4 h-4 text-white" />
                      ) : state === 'current' ? (
                        <Icon className="w-4 h-4 text-[#008069]" />
                      ) : (
                        <Icon className="w-4 h-4 text-gray-400" />
                      )}
                    </div>
                    {!isLast && (
                      <div className={cn(
                        'w-0.5 h-full min-h-[32px]',
                        state === 'complete' ? 'bg-emerald-300' : 'bg-gray-200'
                      )} />
                    )}
                  </div>
                  {/* Content */}
                  <div className={cn('pb-6', isLast && 'pb-0')}>
                    <div className="flex items-center gap-2">
                      <p className={cn(
                        'text-sm font-semibold',
                        state === 'complete' ? 'text-emerald-700' :
                        state === 'current' ? 'text-gray-900' :
                        state === 'failed' ? 'text-red-700' :
                        'text-gray-400'
                      )}>
                        {step.label}
                      </p>
                      {state === 'complete' && <Badge variant="success" size="sm">Done</Badge>}
                      {state === 'current' && !isFailed && <Badge variant="warning" size="sm" dot>Action Needed</Badge>}
                      {state === 'failed' && <Badge variant="danger" size="sm" dot>Failed</Badge>}
                    </div>
                    <p className={cn('text-xs mt-0.5', state === 'complete' || state === 'current' ? 'text-gray-500' : 'text-gray-400')}>
                      {step.description}
                    </p>
                    {/* Inline action for the current step */}
                    {state === 'current' && step.key === 'TOKEN_OBTAINED' && !isConnected && (
                      <Button size="sm" className="mt-2" onClick={() => setShowSignup(true)}>
                        <Wifi className="w-3.5 h-3.5" />Connect WhatsApp
                      </Button>
                    )}
                    {state === 'current' && step.key !== 'TOKEN_OBTAINED' && (
                      <Button size="sm" variant="outline" className="mt-2" onClick={handleRetry} disabled={retrying}>
                        {retrying ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                        Retry Setup
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* ─── Account Health (only show when connected) ─── */}
      {isConnected && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-[#008069]" />
              Account Health
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <HealthTile
                icon={Activity}
                label="Quality Rating"
                value={status?.qualityRating || '--'}
                color={
                  status?.qualityRating === 'GREEN' ? 'emerald' :
                  status?.qualityRating === 'YELLOW' ? 'amber' :
                  status?.qualityRating === 'RED' ? 'red' : 'gray'
                }
              />
              <HealthTile icon={Zap} label="Messaging Limit" value={status?.messagingLimitTier || '--'} color="blue" />
              <HealthTile
                icon={Phone}
                label="Phone Status"
                value={status?.phoneStatus || '--'}
                color={status?.phoneStatus === 'CONNECTED' ? 'emerald' : status?.phoneStatus === 'FLAGGED' ? 'red' : 'gray'}
              />
              <HealthTile
                icon={Clock}
                label="Token Expires"
                value={status?.qualityRating ? 'Active' : '--'}
                color={isFullyReady ? 'emerald' : 'amber'}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* ─── Connection Details (only show when connected) ─── */}
      {isConnected && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Wifi className="w-5 h-5 text-emerald-500" />
                Connection Details
              </CardTitle>
              <Button variant="outline" size="sm" onClick={() => setShowSignup(true)}>
                <RefreshCw className="w-3.5 h-3.5" />Reconnect
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-y-4 gap-x-8">
              <DetailItem label="WABA ID" value={status?.wabaId} mono />
              <DetailItem label="Phone Number ID" value={status?.phoneNumberId} mono />
              <DetailItem label="Business Name" value={status?.businessName} />
              <DetailItem label="Verified Name" value={status?.verifiedName} />
              <DetailItem label="Onboarding Status" badge={
                <Badge
                  variant={isFullyReady ? 'success' : isFailed ? 'danger' : 'warning'}
                  dot
                >
                  {status?.onboardingStatus || 'Unknown'}
                </Badge>
              } />
              <DetailItem label="Account Review" badge={
                status?.accountReviewStatus ? (
                  <Badge variant={status.accountReviewStatus === 'APPROVED' ? 'success' : 'warning'}>
                    {status.accountReviewStatus}
                  </Badge>
                ) : undefined
              } />
            </div>

            {/* Verification & Billing row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-y-4 gap-x-8 mt-4 pt-4 border-t border-gray-100">
              <DetailItem label="Business Verification" badge={
                status?.businessVerificationStatus ? (
                  <Badge variant={status.businessVerificationStatus === 'verified' ? 'success' : status.businessVerificationStatus === 'rejected' ? 'danger' : 'warning'}>
                    {status.businessVerificationStatus}
                  </Badge>
                ) : undefined
              } />
              <DetailItem label="Billing Status" badge={
                status?.billingStatus ? (
                  <Badge variant={status.billingStatus === 'ATTACHED' ? 'success' : status.billingStatus === 'FAILED' ? 'danger' : 'warning'}>
                    {status.billingStatus}
                  </Badge>
                ) : undefined
              } />
              <DetailItem label="Quality Rating" badge={
                status?.qualityRating ? (
                  <Badge variant={status.qualityRating === 'GREEN' ? 'success' : status.qualityRating === 'YELLOW' ? 'warning' : status.qualityRating === 'RED' ? 'danger' : 'default'}>
                    {status.qualityRating}
                  </Badge>
                ) : undefined
              } />
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
                <Bell className="w-5 h-5 text-amber-500" />
                Notifications
                <Badge variant="danger">{alerts.length}</Badge>
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
                      <p className="text-xs mt-0.5 opacity-80 truncate">{alert.message}</p>
                      <p className="text-xs mt-1 opacity-60">
                        {new Date(alert.createdAt).toLocaleString()}
                        {alert.category !== 'UNKNOWN' && ` · ${alert.category.replace(/_/g, ' ')}`}
                      </p>
                    </div>
                  </div>
                  <button onClick={() => handleResolveAlert(alert.id)} className="shrink-0 p-1 rounded-lg hover:bg-black/5">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ─── Embedded Signup Modal ─── */}
      {showSignup && (
        <EmbeddedSignup
          onClose={() => setShowSignup(false)}
          onSuccess={handleOnboardSuccess}
          appId={META_APP_ID}
          configId={META_CONFIG_ID}
        />
      )}
    </div>
  );
};

// ─── Sub-components ───

const DetailItem = ({ label, value, mono, badge }: { label: string; value?: string; mono?: boolean; badge?: React.ReactNode }) => (
  <div>
    <p className="text-xs text-gray-400 uppercase tracking-wider font-medium">{label}</p>
    <div className="mt-1">
      {badge ? badge : (
        <p className={cn('text-sm text-gray-900', mono && 'font-mono text-xs')}>{value || '--'}</p>
      )}
    </div>
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
        <div className={cn('p-1.5 rounded-lg', c.iconBg)}>
          <Icon className={cn('w-4 h-4', c.text)} />
        </div>
        <span className="text-xs text-gray-500 font-medium">{label}</span>
      </div>
      <p className={cn('text-lg font-bold', c.text)}>{value}</p>
    </div>
  );
};

export default Settings;
