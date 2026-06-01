import React, { useEffect, useState } from 'react';
import { LogIn, LogOut, UserPlus, KeyRound } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';

function AuthPanel({ session, profile, onProfileSaved }) {
  const [mode, setMode] = useState('login'); // 'login' | 'signup' | 'forgot'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState(profile?.username || '');
  const [message, setMessage] = useState('');
  const [isBusy, setIsBusy] = useState(false);

  useEffect(() => {
    setUsername(profile?.username || '');
  }, [profile]);

  const saveUsername = async (userId, nextUsername) => {
    if (!nextUsername.trim()) return;

    const { error } = await supabase
      .from('profiles')
      .upsert({
        id: userId,
        username: nextUsername.trim(),
        updated_at: new Date().toISOString(),
      });

    if (error) throw error;
    onProfileSaved?.({ id: userId, username: nextUsername.trim() });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setIsBusy(true);
    setMessage('');

    try {
      if (mode === 'forgot') {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (error) throw error;
        setMessage('Password reset email sent! Check your inbox.');
      } else if (mode === 'signup') {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { username: username.trim() },
          },
        });

        if (error) throw error;

        if (data.user) {
          await saveUsername(data.user.id, username);
        }

        setMessage('Account created. If Supabase asks for email confirmation, check your inbox.');
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        setMessage('Signed in.');
      }
    } catch (error) {
      setMessage(error.message);
    } finally {
      setIsBusy(false);
    }
  };

  const handleSignOut = async () => {
    setIsBusy(true);
    await supabase.auth.signOut();
    setMessage('Signed out.');
    setIsBusy(false);
  };

  if (session?.user) {
    return (
      <button type="button" onClick={handleSignOut} className="logout-button" disabled={isBusy}>
        <LogOut className="w-4 h-4 mr-2" /> Log out
      </button>
    );
  }

  return (
    <div className="auth-panel">
      <div>
        <div className="text-sm text-[var(--text-muted)]">Cloud saves</div>
        <div className="font-semibold text-[var(--text-light)]">
          {mode === 'login' && 'Log in to sync solves'}
          {mode === 'signup' && 'Create an account'}
          {mode === 'forgot' && 'Reset your password'}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="auth-form">
        {mode === 'signup' && (
          <input
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            placeholder="Username"
            className="auth-input"
          />
        )}

        <input
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="Email"
          className="auth-input"
          required
        />

        {mode !== 'forgot' && (
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Password"
            className="auth-input"
            minLength={6}
            required
          />
        )}

        <button type="submit" className="neon-button" disabled={isBusy}>
          {mode === 'login' && <><LogIn className="w-4 h-4 mr-2" /> Log in</>}
          {mode === 'signup' && <><UserPlus className="w-4 h-4 mr-2" /> Sign up</>}
          {mode === 'forgot' && <><KeyRound className="w-4 h-4 mr-2" /> Send reset email</>}
        </button>

        {mode === 'login' && (
          <>
            <button
              type="button"
              onClick={() => { setMode('signup'); setMessage(''); }}
              className="secondary-button"
              disabled={isBusy}
            >
              Need account?
            </button>
            <button
              type="button"
              onClick={() => { setMode('forgot'); setMessage(''); }}
              className="secondary-button"
              disabled={isBusy}
            >
              Forgot password?
            </button>
          </>
        )}

        {mode === 'signup' && (
          <button
            type="button"
            onClick={() => { setMode('login'); setMessage(''); }}
            className="secondary-button"
            disabled={isBusy}
          >
            Have account?
          </button>
        )}

        {mode === 'forgot' && (
          <button
            type="button"
            onClick={() => { setMode('login'); setMessage(''); }}
            className="secondary-button"
            disabled={isBusy}
          >
            Back to login
          </button>
        )}
      </form>

      {message && <div className="auth-message">{message}</div>}
    </div>
  );
}

export default AuthPanel;
