import { isSupabaseConfigured, supabase } from './supabaseClient';

const LOCAL_SESSION_KEY = 'cubesense_local_session';
const LOCAL_USERS_KEY = 'cubesense_local_users';

function getLocalUsers() {
  try {
    return JSON.parse(localStorage.getItem(LOCAL_USERS_KEY) || '[]');
  } catch {
    return [];
  }
}

function saveLocalUsers(users) {
  localStorage.setItem(LOCAL_USERS_KEY, JSON.stringify(users));
}

function getLocalSession() {
  try {
    const raw = localStorage.getItem(LOCAL_SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function setLocalSession(session) {
  if (session) {
    localStorage.setItem(LOCAL_SESSION_KEY, JSON.stringify(session));
  } else {
    localStorage.removeItem(LOCAL_SESSION_KEY);
  }
}

const listeners = new Set();
function notifyListeners(event, session) {
  listeners.forEach((fn) => {
    try {
      fn(event, session);
    } catch (e) {
      console.warn('Auth listener error:', e);
    }
  });
}

function generateLocalId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export const authService = {
  isCloudConfigured: isSupabaseConfigured,

  async getSession() {
    if (isSupabaseConfigured && supabase) {
      try {
        const { data } = await supabase.auth.getSession();
        if (data?.session) return data.session;
      } catch (err) {
        console.warn('Error fetching Supabase session, using local fallback:', err);
      }
    }
    return getLocalSession();
  },

  onAuthStateChange(callback) {
    listeners.add(callback);

    let supabaseSub = null;
    if (isSupabaseConfigured && supabase) {
      try {
        const { data } = supabase.auth.onAuthStateChange((event, session) => {
          if (session) {
            setLocalSession(null);
          }
          callback(event, session);
        });
        supabaseSub = data?.subscription;
      } catch (err) {
        console.warn('Supabase onAuthStateChange failed:', err);
      }
    }

    // If in local mode, trigger current session immediately
    const currentLocal = getLocalSession();
    if (!isSupabaseConfigured && currentLocal) {
      setTimeout(() => callback('SIGNED_IN', currentLocal), 0);
    }

    return {
      unsubscribe: () => {
        listeners.delete(callback);
        supabaseSub?.unsubscribe();
      },
    };
  },

  async signInWithGoogle() {
    if (isSupabaseConfigured && supabase) {
      return await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin,
        },
      });
    }

    throw new Error('SUPABASE_NOT_CONFIGURED');
  },

  async signInWithPassword({ email, password }) {
    if (isSupabaseConfigured && supabase) {
      const res = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (res.error) throw res.error;
      return res;
    }

    // Offline / Local auth fallback
    const users = getLocalUsers();
    const cleanEmail = email.trim().toLowerCase();
    const existing = users.find((u) => u.email.toLowerCase() === cleanEmail);

    if (!existing) {
      throw new Error('No account found with this email. Please switch to "Create Account" first.');
    }

    if (existing.password !== password) {
      throw new Error('Incorrect password. Please try again.');
    }

    const session = {
      user: {
        id: existing.id,
        email: existing.email,
        user_metadata: { username: existing.username },
      },
      expires_at: Math.floor(Date.now() / 1000) + 86400 * 30,
    };

    setLocalSession(session);
    notifyListeners('SIGNED_IN', session);
    return { data: { user: session.user, session }, error: null };
  },

  async signUp({ email, password, username }) {
    if (isSupabaseConfigured && supabase) {
      const res = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: { username: username?.trim() || '' },
        },
      });
      if (res.error) throw res.error;
      return res;
    }

    // Offline / Local auth fallback
    const users = getLocalUsers();
    const cleanEmail = email.trim().toLowerCase();
    const existing = users.find((u) => u.email.toLowerCase() === cleanEmail);

    if (existing) {
      throw new Error('An account with this email already exists. Please Sign In.');
    }

    const newUser = {
      id: generateLocalId(),
      email: cleanEmail,
      password,
      username: username?.trim() || cleanEmail.split('@')[0],
      createdAt: new Date().toISOString(),
    };

    users.push(newUser);
    saveLocalUsers(users);

    const session = {
      user: {
        id: newUser.id,
        email: newUser.email,
        user_metadata: { username: newUser.username },
      },
      expires_at: Math.floor(Date.now() / 1000) + 86400 * 30,
    };

    setLocalSession(session);
    notifyListeners('SIGNED_IN', session);
    return { data: { user: session.user, session }, error: null };
  },

  async resetPassword(email) {
    if (isSupabaseConfigured && supabase) {
      const res = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (res.error) throw res.error;
      return res;
    }

    const users = getLocalUsers();
    const exists = users.some((u) => u.email.toLowerCase() === email.trim().toLowerCase());
    if (!exists) {
      throw new Error('No account found with this email.');
    }
    return { data: {}, error: null };
  },

  async signOut() {
    setLocalSession(null);
    notifyListeners('SIGNED_OUT', null);

    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.auth.signOut();
      } catch (err) {
        console.warn('Supabase signOut error:', err);
      }
    }
    return { error: null };
  },
};
