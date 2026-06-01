import React, { useState } from 'react';
import { supabase } from '../lib/supabaseClient';

function ResetPassword() {
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [isBusy, setIsBusy] = useState(false);

  const handleReset = async (e) => {
    e.preventDefault();
    setIsBusy(true);
    const { error } = await supabase.auth.updateUser({ password });
    if (error) setMessage(error.message);
    else setMessage('Password updated! You can now log in.');
    setIsBusy(false);
  };

  return (
    <div className="auth-screen">
      <div className="auth-screen-inner">
        <h1 className="auth-screen-title">Reset Password</h1>
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
          <button type="submit" className="neon-button" disabled={isBusy}>
            Update Password
          </button>
        </form>
        {message && <p className="auth-message mt-2">{message}</p>}
      </div>
    </div>
  );
}

export default ResetPassword;