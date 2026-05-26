import React, { useEffect, useState } from 'react';
import SmartTimer from './components/SmartTimer';
import AlgoTeacher from './components/AlgoTeacher';
import AuthPanel from './components/AuthPanel';
import { isSupabaseConfigured, supabase } from './lib/supabaseClient';

function App() {
  const [activeTab, setActiveTab] = useState('timer'); // 'timer' or 'teacher'
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    if (!isSupabaseConfigured) return undefined;

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
    });

    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!isSupabaseConfigured || !session?.user) {
      setProfile(null);
      return;
    }

    let isMounted = true;

    const loadProfile = async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, username')
        .eq('id', session.user.id)
        .maybeSingle();

      if (!isMounted) return;

      if (error) {
        console.warn('Unable to load profile:', error);
        setProfile(null);
        return;
      }

      setProfile(data);
    };

    loadProfile();

    return () => {
      isMounted = false;
    };
  }, [session]);

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-[var(--neon-green)]/10">
        <h1 className="text-2xl font-bold text-[var(--neon-green)]">VibeTimer & CubeTeacher</h1>
        {(!isSupabaseConfigured || session) && (
          <div className="flex space-x-2">
            <button
              className={`tab-button ${activeTab === 'timer' ? 'active' : ''}`}
              onClick={() => setActiveTab('timer')}
            >
              Smart Timer
            </button>
            <button
              className={`tab-button ${activeTab === 'teacher' ? 'active' : ''}`}
              onClick={() => setActiveTab('teacher')}
            >
              Algo Teacher
            </button>
          </div>
        )}
      </header>

      {/* Tab Content */}
      <main className="flex-1 p-6">
        {isSupabaseConfigured && !session ? (
          <div className="min-h-[70vh] flex items-center justify-center">
            <div className="w-full max-w-xl">
              <AuthPanel session={session} profile={profile} onProfileSaved={setProfile} />
            </div>
          </div>
        ) : !isSupabaseConfigured ? (
          <div className="max-w-4xl mx-auto mb-6 auth-panel">
            <div>
              <div className="text-sm text-[var(--text-muted)]">Cloud saves disabled</div>
              <div className="font-semibold text-[var(--text-light)]">
                Add Supabase environment variables to enable login and sync.
              </div>
            </div>
          </div>
        ) : (
          <div className="max-w-4xl mx-auto mb-6">
            <AuthPanel session={session} profile={profile} onProfileSaved={setProfile} />
          </div>
        )}

        {(!isSupabaseConfigured || session) && (
          <>
            {activeTab === 'timer' && (
              <section className="space-y-6">
                <SmartTimer session={session} />
              </section>
            )}
            {activeTab === 'teacher' && (
              <section className="space-y-6">
                <AlgoTeacher />
              </section>
            )}
          </>
        )}
      </main>
    </div>
  );
}

export default App;
