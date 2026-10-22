import React, { useEffect, useState } from 'react';
import SmartTimer from './components/SmartTimer';
import AlgoTeacher from './components/AlgoTeacher';
import AuthPanel from './components/AuthPanel';
import Sidebar from './components/layout/Sidebar';
import ResetPassword from './components/ResetPassword';
import { isSupabaseConfigured, supabase } from './lib/supabaseClient';

function App() {
  const [activeTab, setActiveTab] = useState('timer');
  const [practiceCase, setPracticeCase] = useState(null);
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  if (window.location.pathname === '/reset-password') {
    return <ResetPassword />;
  }

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

  return (
    <div className="app-shell">
      <Sidebar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed((v) => !v)}
        profile={profile}
        onSignOut={isSupabaseConfigured && session ? handleSignOut : null}
      />

      <div className="app-content">
        {activeTab === 'timer' && (
          <SmartTimer
            session={session}
            practiceCase={practiceCase}
            onExitPractice={() => setPracticeCase(null)}
          />
        )}
        {activeTab === 'teacher' && (
          <div className="teacher-page">
            <AlgoTeacher
              onStartPractice={(caseObj) => {
                setPracticeCase(caseObj);
                setActiveTab('timer');
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
