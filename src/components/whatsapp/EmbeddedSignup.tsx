import React, { useEffect, useState, useCallback } from 'react';
import { onboardWhatsApp } from '../../services/whatsappService';
import type { WhatsAppStatus } from '../../types';
import { Button } from '../ui/Button';
import { X, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';

interface EmbeddedSignupProps {
  onClose: () => void;
  onSuccess: (status: WhatsAppStatus) => void;
  appId: string;
  configId: string;
}

const EmbeddedSignup: React.FC<EmbeddedSignupProps> = ({ onClose, onSuccess, appId, configId }) => {
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [sdkLoaded, setSdkLoaded] = useState(false);

  // Load Facebook SDK
  useEffect(() => {
    if (document.getElementById('facebook-jssdk')) {
      setSdkLoaded(true);
      return;
    }

    window.fbAsyncInit = () => {
      console.log('[EmbeddedSignup] FB SDK loaded, initializing with appId:', appId);
      window.FB?.init({
        appId,
        cookie: true,
        xfbml: true,
        version: 'v22.0',
      });
      console.log('[EmbeddedSignup] FB.init() complete');
      setSdkLoaded(true);
    };

    const script = document.createElement('script');
    script.id = 'facebook-jssdk';
    script.src = 'https://connect.facebook.net/en_US/sdk.js';
    script.async = true;
    script.defer = true;
    document.body.appendChild(script);

    return () => {
      // Cleanup not needed — SDK persists
    };
  }, [appId]);

  // Listen for session info from Meta's Embedded Signup postMessage
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.origin !== 'https://www.facebook.com' && event.origin !== 'https://web.facebook.com') return;

      try {
        const data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
        console.log('[EmbeddedSignup] postMessage received:', { origin: event.origin, type: data.type, data });
        if (data.type === 'WA_EMBEDDED_SIGNUP') {
          const { data: signupData } = data;
          console.log('[EmbeddedSignup] WA_EMBEDDED_SIGNUP data:', signupData);
          if (signupData?.waba_id && signupData?.phone_number_id) {
            console.log('[EmbeddedSignup] Captured waba_id:', signupData.waba_id, 'phone_number_id:', signupData.phone_number_id);
            sessionStorage.setItem('wa_signup_waba_id', signupData.waba_id);
            sessionStorage.setItem('wa_signup_phone_number_id', signupData.phone_number_id);
          } else {
            console.warn('[EmbeddedSignup] WA_EMBEDDED_SIGNUP missing waba_id or phone_number_id:', signupData);
          }
        }
      } catch {
        // Not a JSON message — ignore
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const handleLogin = useCallback(() => {
    if (!window.FB) {
      console.error('[EmbeddedSignup] FB SDK not available');
      return;
    }

    console.log('[EmbeddedSignup] Starting FB.login with config_id:', configId);
    setStatus('loading');

    window.FB.login(
      function (response: FBLoginResponse) {
        console.log('[EmbeddedSignup] FB.login callback fired, status:', response.status);
        console.log('[EmbeddedSignup] authResponse:', response.authResponse);

        if (response.authResponse?.code) {
          console.log('[EmbeddedSignup] Got auth code:', response.authResponse.code.substring(0, 20) + '...');

          const wabaId = sessionStorage.getItem('wa_signup_waba_id') || '';
          const phoneNumberId = sessionStorage.getItem('wa_signup_phone_number_id') || '';
          console.log('[EmbeddedSignup] Session data — wabaId:', wabaId, 'phoneNumberId:', phoneNumberId);

          if (!wabaId || !phoneNumberId) {
            console.error('[EmbeddedSignup] Missing session data. wabaId:', wabaId, 'phoneNumberId:', phoneNumberId);
            setStatus('error');
            setErrorMsg('Could not retrieve WhatsApp Business Account details. Please try again.');
            return;
          }

          console.log('[EmbeddedSignup] Sending onboard request to backend...');
          onboardWhatsApp({
            code: response.authResponse.code,
            wabaId,
            phoneNumberId,
          }).then((result) => {
            console.log('[EmbeddedSignup] Onboard success:', result);
            sessionStorage.removeItem('wa_signup_waba_id');
            sessionStorage.removeItem('wa_signup_phone_number_id');
            setStatus('success');
            onSuccess(result);
          }).catch((err) => {
            console.error('[EmbeddedSignup] Onboard failed:', err);
            setStatus('error');
            setErrorMsg(err instanceof Error ? err.message : 'Onboarding failed');
          });
        } else {
          console.warn('[EmbeddedSignup] FB.login failed or cancelled. Full response:', response);
          setStatus('error');
          setErrorMsg('Facebook login was cancelled or failed.');
        }
      },
      {
        config_id: configId,
        response_type: 'code',
        override_default_response_type: true,
        extras: {
          featureType: 'whatsapp_business_app_onboarding',
          sessionInfoVersion: '3',
          version: 'v3',
          features: [
            { name: 'marketing_messages_lite' },
            { name: 'app_only_install' },
          ],
        },
      }
    );
  }, [configId, onSuccess]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-full max-w-md rounded-xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <h3 className="text-lg font-semibold text-gray-900">Connect WhatsApp</h3>
          <button onClick={onClose} className="p-1 text-gray-400 hover:bg-gray-100 rounded-md">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="px-6 py-8 text-center space-y-6">
          {status === 'idle' && (
            <>
              <p className="text-gray-600">
                Connect your WhatsApp Business Account to start sending and receiving messages.
              </p>
              <Button
                onClick={handleLogin}
                disabled={!sdkLoaded}
                className="w-full"
              >
                {sdkLoaded ? 'Login with Facebook' : 'Loading Facebook SDK...'}
              </Button>
            </>
          )}

          {status === 'loading' && (
            <div className="flex flex-col items-center gap-4">
              <Loader2 className="w-10 h-10 text-whatsapp-teal animate-spin" />
              <p className="text-gray-600">Connecting your WhatsApp Business Account...</p>
            </div>
          )}

          {status === 'success' && (
            <div className="flex flex-col items-center gap-4">
              <CheckCircle className="w-12 h-12 text-green-500" />
              <p className="text-gray-900 font-semibold">WhatsApp Connected Successfully!</p>
              <Button onClick={onClose}>Done</Button>
            </div>
          )}

          {status === 'error' && (
            <div className="flex flex-col items-center gap-4">
              <AlertCircle className="w-12 h-12 text-red-500" />
              <p className="text-red-600">{errorMsg}</p>
              <div className="flex gap-3">
                <Button variant="outline" onClick={onClose}>Cancel</Button>
                <Button onClick={() => { setStatus('idle'); setErrorMsg(''); }}>Try Again</Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default EmbeddedSignup;
