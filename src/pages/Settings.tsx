import React, { useEffect, useState } from 'react';
import { Wifi, WifiOff, RefreshCw, AlertCircle, CheckCircle, Loader2, Bell, X, Shield, CreditCard } from 'lucide-react';
import { getWhatsAppStatus, retryProvisioning } from '../services/whatsappService';
import { getUnresolvedAlerts, resolveAlert, resolveAllAlerts } from '../services/alertService';
import type { WhatsAppStatus, OnboardingStatus, AccountAlert } from '../types';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { useAuth } from '../context/AuthContext';
import EmbeddedSignup from '../components/whatsapp/EmbeddedSignup';

const META_APP_ID = '3093323707495695';
const META_CONFIG_ID = '1384423560379918';

const STATUS_STEPS: { key: OnboardingStatus; label: string }[] = [
  { key: 'TOKEN_OBTAINED', label: 'Token Obtained' },
  { key: 'TOKEN_EXCHANGED', label: 'Long-lived Token' },
  { key: 'WEBHOOK_SUBSCRIBED', label: 'Webhook Subscribed' },
  { key: 'PROFILE_SYNCED', label: 'Profile Synced' },
  { key: 'READY', label: 'Ready' },
];

const STATUS_ORDER: OnboardingStatus[] = [
  'NOT_STARTED', 'TOKEN_OBTAINED', 'TOKEN_EXCHANGED',
  'WEBHOOK_SUBSCRIBED', 'PROFILE_SYNCED', 'READY',
];

function isStepComplete(current: OnboardingStatus | undefined, step: OnboardingStatus): boolean {
  if (!current) return false;
  if (current === 'FAILED') return false;
  return STATUS_ORDER.indexOf(current) >= STATUS_ORDER.indexOf(step);
}

const SEVERITY_STYLES = {
  CRITICAL: 'bg-red-50 border-red-200 text-red-800',
  WARNING: 'bg-yellow-50 border-yellow-200 text-yellow-800',
  INFO: 'bg-blue-50 border-blue-200 text-blue-800',
};

const SEVERITY_ICON_STYLES = {
  CRITICAL: 'text-red-500',
  WARNING: 'text-yellow-500',
  INFO: 'text-blue-500',
};

const Settings = () => {
  const { user } = useAuth();
  const [status, setStatus] = useState<WhatsAppStatus | null>(null);
  const [alerts, setAlerts] = useState<AccountAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [retrying, setRetrying] = useState(false);
  const [showSignup, setShowSignup] = useState(false);

  const fetchStatus = async () => {
    if (!user?.clientId) {
      setLoading(false);
      return;
    }
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

  useEffect(() => {
    fetchStatus();
  }, []);

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
    try {
      await resolveAllAlerts();
      setAlerts([]);
    } catch (err) {
      console.error('Failed to resolve all alerts', err);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-whatsapp-teal"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Settings</h1>
        <p className="text-gray-500 mt-1">Manage your WhatsApp connection and account settings.</p>
      </div>

      {/* Alerts Card */}
      {alerts.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Bell className="w-5 h-5 text-yellow-500" />
                Notifications ({alerts.length})
              </CardTitle>
              <Button variant="outline" onClick={handleResolveAll}>
                Dismiss All
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-3">
              {alerts.map(alert => (
                <div
                  key={alert.id}
                  className={`flex items-start justify-between gap-3 p-3 rounded-lg border ${SEVERITY_STYLES[alert.severity]}`}
                >
                  <div className="flex items-start gap-3">
                    <AlertCircle className={`w-5 h-5 shrink-0 mt-0.5 ${SEVERITY_ICON_STYLES[alert.severity]}`} />
                    <div>
                      <p className="text-sm font-medium">{alert.title}</p>
                      <p className="text-sm mt-0.5 opacity-80">{alert.message}</p>
                      <p className="text-xs mt-1 opacity-60">
                        {new Date(alert.createdAt).toLocaleString()}
                        {alert.category !== 'UNKNOWN' && ` \u00b7 ${alert.category.replace(/_/g, ' ')}`}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleResolveAlert(alert.id)}
                    className="shrink-0 p-1 rounded hover:bg-black/5"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* WhatsApp Connection Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {status?.connected ? (
              <Wifi className="w-5 h-5 text-green-500" />
            ) : (
              <WifiOff className="w-5 h-5 text-gray-400" />
            )}
            WhatsApp Connection
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          {status?.connected ? (
            <div className="space-y-6">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-green-50 text-green-700 border border-green-100">
                  {status.onboardingStatus === 'READY' ? 'Fully Provisioned' : 'Connected'}
                </span>
              </div>

              {/* Provisioning Progress */}
              {status.onboardingStatus && status.onboardingStatus !== 'NOT_STARTED' && (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-gray-700">Provisioning Status</p>
                  <div className="flex items-center gap-1">
                    {STATUS_STEPS.map((step) => {
                      const complete = isStepComplete(status.onboardingStatus, step.key);
                      const failed = status.onboardingStatus === 'FAILED';
                      return (
                        <div key={step.key} className="flex items-center gap-1">
                          <div className="flex flex-col items-center">
                            {complete ? (
                              <CheckCircle className="w-4 h-4 text-green-500" />
                            ) : failed ? (
                              <AlertCircle className="w-4 h-4 text-red-400" />
                            ) : (
                              <div className="w-4 h-4 rounded-full border-2 border-gray-300" />
                            )}
                            <span className={`text-xs mt-1 ${complete ? 'text-green-700' : 'text-gray-400'}`}>
                              {step.label}
                            </span>
                          </div>
                          {step.key !== 'READY' && (
                            <div className={`w-6 h-0.5 mb-4 ${complete ? 'bg-green-400' : 'bg-gray-200'}`} />
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Error Banner */}
              {status.onboardingStatus === 'FAILED' && status.provisioningError && (
                <div className="flex items-start gap-3 p-3 rounded-lg bg-red-50 border border-red-100">
                  <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-red-800">Provisioning Failed</p>
                    <p className="text-sm text-red-600 mt-0.5">{status.provisioningError}</p>
                  </div>
                </div>
              )}

              {/* Account Details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
                <div>
                  <p className="text-gray-500">WABA ID</p>
                  <p className="font-medium text-gray-900 mt-0.5">{status.wabaId || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-gray-500">Phone Number ID</p>
                  <p className="font-medium text-gray-900 mt-0.5">{status.phoneNumberId || 'N/A'}</p>
                </div>
                {status.businessName && (
                  <div>
                    <p className="text-gray-500">Business Name</p>
                    <p className="font-medium text-gray-900 mt-0.5">{status.businessName}</p>
                  </div>
                )}
                {status.verifiedName && (
                  <div>
                    <p className="text-gray-500">Verified Name</p>
                    <p className="font-medium text-gray-900 mt-0.5">{status.verifiedName}</p>
                  </div>
                )}
                {status.qualityRating && (
                  <div>
                    <p className="text-gray-500">Quality Rating</p>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                      status.qualityRating === 'GREEN' ? 'bg-green-50 text-green-700' :
                      status.qualityRating === 'YELLOW' ? 'bg-yellow-50 text-yellow-700' :
                      status.qualityRating === 'RED' ? 'bg-red-50 text-red-700' :
                      'bg-gray-50 text-gray-700'
                    }`}>
                      {status.qualityRating}
                    </span>
                  </div>
                )}
                {status.messagingLimitTier && (
                  <div>
                    <p className="text-gray-500">Messaging Limit</p>
                    <p className="font-medium text-gray-900 mt-0.5">{status.messagingLimitTier}</p>
                  </div>
                )}
                {status.phoneStatus && (
                  <div>
                    <p className="text-gray-500">Phone Status</p>
                    <p className="font-medium text-gray-900 mt-0.5">{status.phoneStatus}</p>
                  </div>
                )}
              </div>

              {/* Verification & Billing */}
              {(status.businessVerificationStatus || status.billingStatus) && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm pt-2 border-t">
                  {status.businessVerificationStatus && (
                    <div className="flex items-center gap-2">
                      <Shield className="w-4 h-4 text-gray-400" />
                      <div>
                        <p className="text-gray-500">Business Verification</p>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                          status.businessVerificationStatus === 'verified' ? 'bg-green-50 text-green-700' :
                          status.businessVerificationStatus === 'rejected' ? 'bg-red-50 text-red-700' :
                          'bg-yellow-50 text-yellow-700'
                        }`}>
                          {status.businessVerificationStatus}
                        </span>
                      </div>
                    </div>
                  )}
                  {status.billingStatus && (
                    <div className="flex items-center gap-2">
                      <CreditCard className="w-4 h-4 text-gray-400" />
                      <div>
                        <p className="text-gray-500">Billing</p>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                          status.billingStatus === 'ATTACHED' ? 'bg-green-50 text-green-700' :
                          status.billingStatus === 'FAILED' ? 'bg-red-50 text-red-700' :
                          'bg-yellow-50 text-yellow-700'
                        }`}>
                          {status.billingStatus}
                        </span>
                      </div>
                    </div>
                  )}
                  {status.accountReviewStatus && (
                    <div className="flex items-center gap-2">
                      <Shield className="w-4 h-4 text-gray-400" />
                      <div>
                        <p className="text-gray-500">Account Review</p>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                          status.accountReviewStatus === 'APPROVED' ? 'bg-green-50 text-green-700' :
                          'bg-yellow-50 text-yellow-700'
                        }`}>
                          {status.accountReviewStatus}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="flex gap-3">
                {status.onboardingStatus === 'FAILED' && (
                  <Button onClick={handleRetry} disabled={retrying}>
                    {retrying ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <RefreshCw className="w-4 h-4 mr-2" />
                    )}
                    Retry Provisioning
                  </Button>
                )}
                <Button variant="outline" onClick={() => setShowSignup(true)}>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Reconnect
                </Button>
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <WifiOff className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900">Not Connected</h3>
              <p className="text-gray-500 mt-1 mb-6">Connect your WhatsApp Business Account to get started.</p>
              <Button onClick={() => setShowSignup(true)}>Connect WhatsApp</Button>
            </div>
          )}
        </CardContent>
      </Card>

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

export default Settings;
