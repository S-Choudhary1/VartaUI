import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Lock, User, ArrowRight } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';

const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(username, password);
      navigate('/');
    } catch (err) {
      setError('Invalid credentials. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen w-full flex items-center justify-center p-4 relative overflow-hidden"
      style={{
        background: `
          radial-gradient(ellipse 80% 60% at 20% 10%, rgba(0, 128, 105, 0.15) 0%, transparent 50%),
          radial-gradient(ellipse 60% 50% at 80% 80%, rgba(0, 128, 105, 0.10) 0%, transparent 50%),
          radial-gradient(ellipse 50% 40% at 50% 50%, rgba(0, 80, 60, 0.06) 0%, transparent 60%),
          linear-gradient(160deg, #0a0f0d 0%, #111916 30%, #0d1210 60%, #0a0e0c 100%)
        `,
      }}
    >
      {/* Subtle grid pattern overlay */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
                            linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
          backgroundSize: '64px 64px',
        }}
      />

      {/* Card */}
      <div className="relative w-full max-w-md animate-slide-up">
        <div className="bg-white rounded-2xl shadow-xl shadow-black/20 p-8 sm:p-10">
          {/* Logo and tagline */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-[#008069] mb-4 shadow-lg shadow-[#008069]/20">
              <span className="text-white font-bold text-xl leading-none">V</span>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
              Welcome to VartaAI
            </h1>
            <p className="text-gray-500 text-sm mt-1.5">
              Sign in to manage your WhatsApp campaigns
            </p>
          </div>

          {/* Error */}
          {error && (
            <div className="mb-6 bg-red-50 border border-red-100 text-red-600 px-4 py-3 rounded-xl text-sm flex items-center">
              <div className="w-1.5 h-1.5 rounded-full bg-red-500 mr-2.5 flex-shrink-0" />
              {error}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-4">
              {/* Username field */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-gray-700 ml-0.5">Username</label>
                <div className="relative group">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 w-[18px] h-[18px] transition-colors group-focus-within:text-[#008069] pointer-events-none" />
                  <Input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Enter your username"
                    required
                    className="pl-11 h-12 bg-gray-50/80 border-gray-200 focus:bg-white focus:border-[#008069] focus:ring-2 focus:ring-[#008069]/10 rounded-xl transition-all"
                  />
                </div>
              </div>

              {/* Password field */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between ml-0.5">
                  <label className="text-sm font-medium text-gray-700">Password</label>
                  <a
                    href="#"
                    className="text-xs font-medium text-[#008069] hover:text-[#006e5a] transition-colors"
                  >
                    Forgot password?
                  </a>
                </div>
                <div className="relative group">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 w-[18px] h-[18px] transition-colors group-focus-within:text-[#008069] pointer-events-none" />
                  <Input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    required
                    className="pl-11 h-12 bg-gray-50/80 border-gray-200 focus:bg-white focus:border-[#008069] focus:ring-2 focus:ring-[#008069]/10 rounded-xl transition-all"
                  />
                </div>
              </div>
            </div>

            {/* Submit */}
            <Button
              type="submit"
              size="lg"
              className="w-full h-12 text-sm font-semibold rounded-xl shadow-md shadow-[#008069]/20 hover:shadow-lg hover:shadow-[#008069]/25 hover:-translate-y-0.5 transition-all duration-200"
              disabled={loading}
            >
              {loading ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Signing in...
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  Sign In
                  <ArrowRight className="w-4 h-4" />
                </div>
              )}
            </Button>
          </form>

          {/* Footer link */}
          <p className="text-center text-sm text-gray-500 mt-6">
            Don't have an account?{' '}
            <a
              href="#"
              className="font-semibold text-[#008069] hover:text-[#006e5a] transition-colors"
            >
              Contact Sales
            </a>
          </p>
        </div>

        {/* Subtle bottom text */}
        <p className="text-center text-xs text-gray-500/40 mt-6">
          &copy; 2026 VartaAI Inc. All rights reserved.
        </p>
      </div>
    </div>
  );
};

export default Login;
