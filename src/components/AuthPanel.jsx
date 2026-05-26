import React, { useEffect, useState } from 'react';
import { LogIn, LogOut, UserPlus } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';

function AuthPanel({ session, profile, onProfileSaved }) {
  const [mode, setMode] = useState('login');
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
      if (mode === 'signup') {
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

  const handleProfileSave = async (event) => {
    event.preventDefault();
    if (!session?.user) return;
    setIsBusy(true);
    setMessage('');

    try {
      await saveUsername(session.user.id, username);
      setMessage('Username saved.');
    } catch (error) {
      setMessage(error.message);
    } finally {
      setIsBusy(false);
    }
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
          {mode === 'login' ? 'Log in to sync solves' : 'Create an account'}
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
        <input
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="Password"
          className="auth-input"
          minLength={6}
          required
        />
        <button type="submit" className="neon-button" disabled={isBusy}>
          {mode === 'login' ? <LogIn className="w-4 h-4 mr-2" /> : <UserPlus className="w-4 h-4 mr-2" />}
          {mode === 'login' ? 'Log in' : 'Sign up'}
        </button>
        <button
          type="button"
          onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}
          className="secondary-button"
          disabled={isBusy}
        >
          {mode === 'login' ? 'Need account?' : 'Have account?'}
        </button>
      </form>
      {message && <div className="auth-message">{message}</div>}
    </div>
  );
}

export default AuthPanel;
