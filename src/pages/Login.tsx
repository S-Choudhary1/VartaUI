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
    <div className="min-h-screen w-full flex bg-white">
      {/* Left Side - Hero/Branding */}
      <div className="hidden lg:flex w-1/2 bg-whatsapp-dark relative overflow-hidden flex-col justify-between p-12">
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-xl bg-whatsapp-teal flex items-center justify-center text-white font-bold text-xl shadow-lg">
              V
            </div>
            <span className="text-2xl font-bold text-white tracking-tight">VartaAI</span>
          </div>
          <h1 className="text-5xl font-bold text-white leading-tight mb-6">
            Supercharge your <br />
            <span className="text-whatsapp-teal">WhatsApp Marketing</span>
          </h1>
          <p className="text-gray-400 text-lg max-w-md leading-relaxed">
            Connect with your customers where they are. Automate campaigns, manage contacts, and grow your business with the power of AI.
          </p>
        </div>

        {/* Abstract Visual Elements */}
        <div className="absolute top-1/2 right-0 transform translate-x-1/3 -translate-y-1/2 w-[600px] h-[600px] bg-whatsapp-teal/5 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 transform -translate-x-1/3 translate-y-1/3 w-[500px] h-[500px] bg-blue-500/5 rounded-full blur-3xl pointer-events-none"></div>

        <div className="relative z-10 text-sm text-gray-500">
          © 2025 VartaAI Inc. All rights reserved.
        </div>
      </div>

      {/* Right Side - Login Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 sm:p-12 lg:p-24 bg-gray-50/30">
        <div className="w-full max-w-sm space-y-8">
          <div className="text-center lg:text-left">
            <div className="lg:hidden flex flex-col items-center justify-center mb-6 gap-2">
              <div className="w-12 h-12 rounded-xl bg-whatsapp-teal flex items-center justify-center text-white font-bold text-2xl shadow-lg">
                V
              </div>
              <span className="text-lg font-bold text-gray-900 tracking-tight">VartaAI</span>
            </div>
            <h2 className="text-3xl font-bold text-gray-900 tracking-tight">Welcome Back</h2>
            <p className="text-gray-500 mt-2">Enter your details to access your dashboard.</p>
        </div>

        {error && (
            <div className="bg-red-50 border border-red-100 text-red-600 px-4 py-3 rounded-xl text-sm flex items-center animate-in fade-in slide-in-from-top-2">
              <div className="w-1.5 h-1.5 rounded-full bg-red-600 mr-2"></div>
            {error}
          </div>
        )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-gray-700 ml-1">Username</label>
                <div className="relative group">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5 transition-colors group-focus-within:text-whatsapp-teal" />
                  <Input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter your username"
              required
                    className="pl-10 h-12 bg-white border-gray-200 focus:border-whatsapp-teal focus:ring-4 focus:ring-whatsapp-teal/10 rounded-xl transition-all"
            />
          </div>
              </div>
              
              <div className="space-y-1.5">
                 <div className="flex items-center justify-between ml-1">
                    <label className="text-sm font-medium text-gray-700">Password</label>
                    <a href="#" className="text-xs font-medium text-whatsapp-teal hover:text-whatsapp-teal-dark transition-colors">Forgot password?</a>
                 </div>
                 <div className="relative group">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5 transition-colors group-focus-within:text-whatsapp-teal" />
                  <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              required
                    className="pl-10 h-12 bg-white border-gray-200 focus:border-whatsapp-teal focus:ring-4 focus:ring-whatsapp-teal/10 rounded-xl transition-all"
            />
          </div>
              </div>
            </div>

            <Button
            type="submit"
              className="w-full h-12 text-base font-semibold rounded-xl shadow-lg hover:-translate-y-0.5 transition-all duration-200"
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

          <p className="text-center text-sm text-gray-500">
            Don't have an account? <a href="#" className="font-semibold text-whatsapp-teal hover:text-whatsapp-teal-dark transition-colors">Contact Sales</a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
