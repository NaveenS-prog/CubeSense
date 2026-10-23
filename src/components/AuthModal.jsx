import React, { useState, useEffect } from 'react';
import {
  X,
  Mail,
  Lock,
  User,
  LogIn,
  UserPlus,
  KeyRound,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  Cloud,
  ExternalLink,
  Settings,
  Sparkles,
} from 'lucide-react';
import { supabase, isSupabaseConfigured, configureSupabaseCredentials } from '../lib/supabaseClient';
import { authService } from '../lib/authService';

export default function AuthModal({ isOpen, onClose, session, profile, onProfileSaved }) {
  const [mode, setMode] = useState('login'); // 'login' | 'signup' | 'forgot' | 'settings'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState(profile?.username || '');
  const [showPassword, setShowPassword] = useState(false);

  // Custom Supabase URL & Key inputs (for direct configuration)
  const [customUrl, setCustomUrl] = useState('');
  const [customKey, setCustomKey] = useState('');

  const [isBusy, setIsBusy] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    if (profile?.username) {
      setUsername(profile.username);
    }
  }, [profile]);

  // Handle ESC key to close
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // 1. Google OAuth Sign-In
  const handleGoogleSignIn = async () => {
    setIsBusy(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      await authService.signInWithGoogle();
    } catch (err) {
      if (err.message === 'SUPABASE_NOT_CONFIGURED') {
        setErrorMsg(
          'Google OAuth requires your Supabase Project URL and Public Anon Key. Please paste them below to enable Google Sign-In and Cloud Sync.'
        );
        setMode('settings');
      } else {
        setErrorMsg(err.message || 'Failed to authenticate with Google.');
      }
      setIsBusy(false);
    }
  };

  // 2. Email & Password Sign-In / Sign-Up / Reset
  const handleSubmit = async (e) => {
    e.preventDefault();

    setIsBusy(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      if (mode === 'forgot') {
        await authService.resetPassword(email.trim());
        setSuccessMsg('Password reset link sent! Please check your email inbox.');
      } else if (mode === 'signup') {
        const { data, error } = await authService.signUp({
          email: email.trim(),
          password,
          username: username.trim(),
        });

        if (error) throw error;

        if (data?.user && username.trim() && isSupabaseConfigured) {
          try {
            await supabase.from('profiles').upsert({
              id: data.user.id,
              username: username.trim(),
              updated_at: new Date().toISOString(),
            });
            onProfileSaved?.({ id: data.user.id, username: username.trim() });
          } catch {
            // Profile upsert fallback
          }
        }

        setSuccessMsg('Account created successfully! You are now signed in.');
        setTimeout(() => onClose(), 900);
      } else {
        // Login mode
        const { error } = await authService.signInWithPassword({
          email: email.trim(),
          password,
        });

        if (error) throw error;
        setSuccessMsg('Signed in successfully! Loading your solves...');
        setTimeout(() => onClose(), 800);
      }
    } catch (err) {
      setErrorMsg(err.message || 'Authentication error.');
    } finally {
      setIsBusy(false);
    }
  };

  // 3. Direct Supabase configuration save
  const handleSaveCredentials = (e) => {
    e.preventDefault();
    if (!customUrl.trim() || !customKey.trim()) {
      setErrorMsg('Please enter both Supabase Project URL and Anon Public Key.');
      return;
    }

    const success = configureSupabaseCredentials(customUrl, customKey);
    if (!success) {
      setErrorMsg('Failed to save credentials.');
    }
  };

  const handleSignOut = async () => {
    setIsBusy(true);
    try {
      await authService.signOut();
      onClose();
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setIsBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-fade-in">
      <div
        className="relative w-full max-w-md bg-[var(--bg-surface-elevated)] border border-[var(--border-strong)] rounded-2xl shadow-2xl overflow-hidden p-6 text-[var(--text-primary)]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between mb-5">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[var(--border-subtle)] border border-[var(--border-medium)] flex items-center justify-center font-bold text-xs tracking-tight">
              CS
            </div>
            <div>
              <h2 className="text-base font-semibold text-white tracking-tight">
                {session?.user
                  ? 'Your Account'
                  : mode === 'signup'
                  ? 'Create an Account'
                  : mode === 'forgot'
                  ? 'Reset Password'
                  : mode === 'settings'
                  ? 'Supabase Connection'
                  : 'Welcome to CubeSense'}
              </h2>
              <p className="text-xs text-[var(--text-muted)]">
                {session?.user
                  ? 'Cloud synchronization active'
                  : 'Sync solves and records across devices'}
              </p>
            </div>
          </div>
          <button
            type="button"
            className="p-1 rounded-lg text-[var(--text-muted)] hover:text-white hover:bg-[var(--bg-hover)] transition-colors"
            onClick={onClose}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Status Messages */}
        {errorMsg && (
          <div className="mb-4 p-3 rounded-lg bg-rose-500/10 border border-rose-500/25 flex items-start gap-2.5 text-xs text-rose-300">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <div className="leading-relaxed">{errorMsg}</div>
          </div>
        )}

        {successMsg && (
          <div className="mb-4 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/25 flex items-start gap-2.5 text-xs text-emerald-300">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <div className="leading-relaxed">{successMsg}</div>
          </div>
        )}

        {/* ALREADY SIGNED IN VIEW */}
        {session?.user ? (
          <div className="space-y-4">
            <div className="p-3.5 rounded-xl bg-[var(--bg-tertiary)] border border-[var(--border-subtle)] space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-[var(--text-muted)]">Signed in as</span>
                <span className="text-emerald-400 font-mono text-[11px] flex items-center gap-1">
                  <Cloud className="w-3 h-3" /> Cloud Synced
                </span>
              </div>
              <div className="text-sm font-semibold text-white truncate">
                {session.user.email}
              </div>
              {profile?.username && (
                <div className="text-xs text-[var(--text-dim)]">
                  Username: <span className="text-white font-mono">{profile.username}</span>
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={handleSignOut}
              disabled={isBusy}
              className="w-full py-2.5 px-4 rounded-xl text-xs font-semibold text-rose-300 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 transition-colors"
            >
              Sign Out
            </button>
          </div>
        ) : mode === 'settings' ? (
          /* SUPABASE CREDENTIALS DIRECT SETUP */
          <form onSubmit={handleSaveCredentials} className="space-y-3.5">
            <div className="text-xs text-[var(--text-secondary)] leading-relaxed">
              Connect your Supabase project to enable real-time cloud solve synchronization and Google OAuth.
            </div>

            <div>
              <label className="block text-[11px] font-medium text-[var(--text-dim)] uppercase tracking-wider mb-1">
                Project URL
              </label>
              <input
                type="url"
                value={customUrl}
                onChange={(e) => setCustomUrl(e.target.value)}
                placeholder="https://your-project.supabase.co"
                className="w-full px-3 py-2 text-xs rounded-lg bg-[var(--bg-tertiary)] border border-[var(--border-subtle)] focus:border-[var(--accent-cyan)] text-white outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-[11px] font-medium text-[var(--text-dim)] uppercase tracking-wider mb-1">
                Anon Public Key
              </label>
              <input
                type="password"
                value={customKey}
                onChange={(e) => setCustomKey(e.target.value)}
                placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6..."
                className="w-full px-3 py-2 text-xs rounded-lg bg-[var(--bg-tertiary)] border border-[var(--border-subtle)] focus:border-[var(--accent-cyan)] text-white outline-none"
                required
              />
            </div>

            <button
              type="submit"
              className="w-full py-2.5 px-4 rounded-xl text-xs font-semibold bg-white text-black hover:bg-neutral-200 transition-colors"
            >
              Save Credentials & Connect
            </button>

            <button
              type="button"
              onClick={() => setMode('login')}
              className="w-full text-xs text-[var(--text-muted)] hover:text-white transition-colors"
            >
              Back to Sign In
            </button>
          </form>
        ) : (
          /* AUTH FORM (LOGIN / SIGNUP / FORGOT) */
          <div className="space-y-4">
            {/* GOOGLE SIGN-IN BUTTON */}
            {mode !== 'forgot' && (
              <>
                <button
                  type="button"
                  onClick={handleGoogleSignIn}
                  disabled={isBusy}
                  className="w-full flex items-center justify-center py-2.5 px-4 rounded-xl text-xs font-medium text-white bg-[var(--bg-tertiary)] hover:bg-[var(--bg-hover)] border border-[var(--border-subtle)] hover:border-[var(--border-medium)] transition-all shadow-sm"
                >
                  <svg className="w-4 h-4 mr-2.5" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                    />
                  </svg>
                  <span>Continue with Google</span>
                </button>

                <div className="relative flex items-center justify-center my-3">
                  <div className="border-t border-[var(--border-subtle)] w-full" />
                  <span className="bg-[var(--bg-surface-elevated)] px-2.5 text-[10px] text-[var(--text-muted)] uppercase tracking-widest font-mono">
                    or with email
                  </span>
                </div>
              </>
            )}

            {/* EMAIL / PASSWORD FORM */}
            <form onSubmit={handleSubmit} className="space-y-3">
              {mode === 'signup' && (
                <div>
                  <label className="block text-[11px] font-medium text-[var(--text-dim)] uppercase tracking-wider mb-1">
                    Username
                  </label>
                  <div className="relative">
                    <User className="w-3.5 h-3.5 text-[var(--text-muted)] absolute left-3 top-3" />
                    <input
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="cubemaster99"
                      className="w-full pl-9 pr-3 py-2 text-xs rounded-lg bg-[var(--bg-tertiary)] border border-[var(--border-subtle)] focus:border-[var(--accent-cyan)] text-white outline-none"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-[11px] font-medium text-[var(--text-dim)] uppercase tracking-wider mb-1">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="w-3.5 h-3.5 text-[var(--text-muted)] absolute left-3 top-3" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="speedcuber@example.com"
                    className="w-full pl-9 pr-3 py-2 text-xs rounded-lg bg-[var(--bg-tertiary)] border border-[var(--border-subtle)] focus:border-[var(--accent-cyan)] text-white outline-none"
                    required
                  />
                </div>
              </div>

              {mode !== 'forgot' && (
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[11px] font-medium text-[var(--text-dim)] uppercase tracking-wider">
                      Password
                    </label>
                    {mode === 'login' && (
                      <button
                        type="button"
                        onClick={() => {
                          setMode('forgot');
                          setErrorMsg('');
                          setSuccessMsg('');
                        }}
                        className="text-[11px] text-[var(--text-muted)] hover:text-white transition-colors"
                      >
                        Forgot?
                      </button>
                    )}
                  </div>
                  <div className="relative">
                    <Lock className="w-3.5 h-3.5 text-[var(--text-muted)] absolute left-3 top-3" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      minLength={6}
                      className="w-full pl-9 pr-9 py-2 text-xs rounded-lg bg-[var(--bg-tertiary)] border border-[var(--border-subtle)] focus:border-[var(--accent-cyan)] text-white outline-none"
                      required
                    />
                    <button
                      type="button"
                      className="absolute right-3 top-2.5 text-[var(--text-muted)] hover:text-white"
                      onClick={() => setShowPassword((v) => !v)}
                    >
                      {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={isBusy}
                className="w-full py-2.5 px-4 mt-2 rounded-xl text-xs font-semibold bg-white text-black hover:bg-neutral-200 transition-colors shadow-sm disabled:opacity-50"
              >
                {isBusy
                  ? 'Please wait...'
                  : mode === 'signup'
                  ? 'Create Account'
                  : mode === 'forgot'
                  ? 'Send Reset Link'
                  : 'Sign In'}
              </button>
            </form>

            {/* Mode Switchers */}
            <div className="pt-2 text-center text-xs text-[var(--text-muted)] border-t border-[var(--border-subtle)] flex items-center justify-between">
              {mode === 'login' ? (
                <>
                  <span>New to CubeSense?</span>
                  <button
                    type="button"
                    onClick={() => {
                      setMode('signup');
                      setErrorMsg('');
                      setSuccessMsg('');
                    }}
                    className="font-medium text-white hover:underline"
                  >
                    Create Account
                  </button>
                </>
              ) : (
                <>
                  <span>Already have an account?</span>
                  <button
                    type="button"
                    onClick={() => {
                      setMode('login');
                      setErrorMsg('');
                      setSuccessMsg('');
                    }}
                    className="font-medium text-white hover:underline"
                  >
                    Sign In
                  </button>
                </>
              )}
            </div>

            {/* Supabase connection indicator / custom config toggle */}
            <div className="pt-1 flex items-center justify-between text-[11px] text-[var(--text-dim)]">
              <span className="flex items-center gap-1.5">
                <span
                  className={`w-2 h-2 rounded-full ${
                    isSupabaseConfigured ? 'bg-emerald-400' : 'bg-amber-400'
                  }`}
                />
                {isSupabaseConfigured ? 'Supabase Connected' : 'Supabase Not Connected'}
              </span>
              <button
                type="button"
                onClick={() => setMode('settings')}
                className="hover:text-white flex items-center gap-1 text-[10px]"
              >
                <Settings className="w-3 h-3" /> Configure Keys
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
