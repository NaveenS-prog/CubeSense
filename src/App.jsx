import React, { useEffect, useState } from 'react';
import SmartTimer from './components/SmartTimer';
import AlgoTeacher from './components/AlgoTeacher';
import AuthPanel from './components/AuthPanel';
import Sidebar from './components/layout/Sidebar';
import { isSupabaseConfigured, supabase } from './lib/supabaseClient';

function App() {
  const [activeTab, setActiveTab] = useState('timer');
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

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

  const handleSignOut = async () => {
    if (isSupabaseConfigured) {
      await supabase.auth.signOut();
    }
  };

  const showApp = !isSupabaseConfigured || session;

  return (
    <div className="app-shell">
      {showApp && (
        <Sidebar
          activeTab={activeTab}
          onTabChange={setActiveTab}
          collapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed((v) => !v)}
          profile={profile}
          onSignOut={isSupabaseConfigured && session ? handleSignOut : null}
        />
      )}

      <div className="app-content">
        {isSupabaseConfigured && !session ? (
          <div className="auth-screen">
            <div className="auth-screen-inner">
              <h1 className="auth-screen-title">CubeSense</h1>
              <p className="auth-screen-subtitle">Sign in to sync solves across devices</p>
              <AuthPanel session={session} profile={profile} onProfileSaved={setProfile} />
            </div>
          </div>
        ) : (
          <>
            {!isSupabaseConfigured && (
              <div className="cloud-banner">
                Cloud sync disabled — add Supabase env vars to enable login and sync.
              </div>
            )}

            {activeTab === 'timer' && <SmartTimer session={session} />}
            {activeTab === 'teacher' && (
              <div className="teacher-page">
                <AlgoTeacher />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default App;
