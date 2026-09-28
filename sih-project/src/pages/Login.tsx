import React, { useState } from 'react';
import { useSentinelStore } from '../store/useSentinelStore';
import { Shield, Lock, Mail, ArrowRight, CheckCircle2, AlertCircle } from 'lucide-react';

export const Login: React.FC = () => {
  const [email, setEmail] = useState('admin@sentinel.ai');
  const [password, setPassword] = useState('sentinel123');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const login = useSentinelStore((state) => state.login);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const success = await login(email, password);
      if (!success) {
        setError('Invalid email or password.');
      }
    } catch {
      setError('Connection failed. Make sure backend server is running.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-screen bg-sentinel-bg flex items-center justify-center p-4 font-sans relative overflow-hidden">
      {/* Background Cyber Grid Effects */}
      <div className="absolute inset-0 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:24px_24px] opacity-30"></div>
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-cyan-600/10 rounded-full blur-3xl pointer-events-none"></div>

      <div className="w-full max-w-md bg-sentinel-surface/90 border border-sentinel-border rounded-2xl p-8 shadow-2xl backdrop-blur-xl relative z-10 font-mono space-y-6">
        {/* Logo & Header */}
        <div className="text-center space-y-2">
          <div className="w-14 h-14 mx-auto rounded-xl bg-blue-500/20 border border-blue-500/40 flex items-center justify-center shadow-[0_0_20px_rgba(59,130,246,0.3)]">
            <Shield className="w-7 h-7 text-sentinel-cyan" />
          </div>
          <h1 className="text-xl font-extrabold tracking-widest text-white mt-2">
            SENTINEL <span className="text-sentinel-cyan">SIH26153</span>
          </h1>
          <p className="text-xs text-gray-400">
            Predictive Network Attack Forecasting Platform
          </p>
        </div>

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/40 rounded-lg flex items-center gap-2 text-rose-300 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="space-y-1">
            <label className="text-[11px] text-gray-400 uppercase tracking-wider block">SOC Analyst Email</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-gray-500 absolute left-3 top-3" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full bg-sentinel-surface-card border border-sentinel-border rounded-lg py-2 pl-9 pr-3 text-sm text-gray-100 placeholder-gray-600 focus:outline-none focus:border-sentinel-cyan"
                placeholder="analyst@sentinel.ai"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[11px] text-gray-400 uppercase tracking-wider block">Access Key / Password</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-gray-500 absolute left-3 top-3" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full bg-sentinel-surface-card border border-sentinel-border rounded-lg py-2 pl-9 pr-3 text-sm text-gray-100 placeholder-gray-600 focus:outline-none focus:border-sentinel-cyan"
                placeholder="••••••••"
              />
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white font-bold py-2.5 rounded-lg shadow-lg flex items-center justify-center gap-2 text-sm transition-all duration-200"
            >
              {loading ? (
                <span>Authenticating...</span>
              ) : (
                <>
                  <span>AUTHENTICATE SESSION</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </form>

        {/* Prototype Credential Callout */}
        <div className="p-3 bg-sentinel-surface-card/60 border border-sentinel-border rounded-lg text-[11px] text-gray-400 space-y-1">
          <div className="flex items-center gap-1.5 text-emerald-400 font-bold">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Prototype Gate Enabled</span>
          </div>
          <p className="text-gray-500 text-[10px]">
            Default credentials pre-filled for evaluators (<span className="text-gray-300">sentinel123</span>).
          </p>
        </div>
      </div>
    </div>
  );
};
