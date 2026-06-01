import React, { useState, useEffect } from 'react';
import { KeyRound } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';

function ResetPassword() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState('');
  const [isReady, setIsReady] = useState(false);
  const [isBusy, setIsBusy] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  useEffect(() => {
    // Supabase puts the token in the URL hash as #access_token=...&type=recovery
    // We need to listen for the session to be established from that token
    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        // Token is valid, show the password form
        setIsReady(true);
      }
    });

    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  const handleReset = async (e) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      setMessage('Passwords do not match.');
      return;
    }

    if (password.length < 6) {
      setMessage('Password must be at least 6 characters.');
      return;
    }

    setIsBusy(true);
    setMessage('');

    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      setMessage(error.message);
    } else {
      setIsSuccess(true);
      setMessage('Password updated successfully! Redirecting to login...');
      // Sign out and redirect to home after 2 seconds
      setTimeout(async () => {
        await supabase.auth.signOut();
        window.location.href = '/';
      }, 2000);
    }

    setIsBusy(false);
  };

  return (
    <div className="auth-screen">
      <div className="auth-screen-inner">
        <h1 className="auth-screen-title">CubeSense</h1>
        <p className="auth-screen-subtitle">Set a new password</p>

        {!isReady ? (
          <div className="auth-panel">
            <p className="auth-message">Verifying your reset link...</p>
          </div>
        ) : isSuccess ? (
          <div className="auth-panel">
            <p className="auth-message" style={{ color: 'var(--solve-green)' }}>{message}</p>
          </div>
        ) : (
          <form onSubmit={handleReset} className="auth-panel">
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="New password"
              className="auth-input"
              minLength={6}
              required
            />
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm new password"
              className="auth-input"
              minLength={6}
              required
            />
            <button type="submit" className="neon-button" disabled={isBusy}>
              <KeyRound className="w-4 h-4 mr-2" />
              {isBusy ? 'Updating...' : 'Update Password'}
            </button>
            {message && <p className="auth-message">{message}</p>}
          </form>
        )}
      </div>
    </div>
  );
}

export default ResetPassword;
