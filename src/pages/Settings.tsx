import React, { useEffect, useState } from 'react';
import { Wifi, WifiOff, RefreshCw } from 'lucide-react';
import { getWhatsAppStatus } from '../services/whatsappService';
import type { WhatsAppStatus } from '../types';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { useAuth } from '../context/AuthContext';
import EmbeddedSignup from '../components/whatsapp/EmbeddedSignup';

const META_APP_ID = '3093323707495695';
const META_CONFIG_ID = '1384423560379918';

const Settings = () => {
  const { user } = useAuth();
  const [status, setStatus] = useState<WhatsAppStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [showSignup, setShowSignup] = useState(false);

  const fetchStatus = async () => {
    if (!user?.clientId) {
      setLoading(false);
      return;
    }
    try {
      const data = await getWhatsAppStatus();
      setStatus(data);
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
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-green-50 text-green-700 border border-green-100">
                  Connected
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-500">WABA ID</p>
                  <p className="font-medium text-gray-900 mt-0.5">{status.wabaId || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-gray-500">Phone Number ID</p>
                  <p className="font-medium text-gray-900 mt-0.5">{status.phoneNumberId || 'N/A'}</p>
                </div>
              </div>
              <Button variant="outline" onClick={() => setShowSignup(true)}>
                <RefreshCw className="w-4 h-4 mr-2" />
                Reconnect
              </Button>
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
