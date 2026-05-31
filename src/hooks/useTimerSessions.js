import { useCallback, useEffect, useMemo, useState } from 'react';
import { isSupabaseConfigured, supabase } from '../lib/supabaseClient';

function createSessionMeta(name) {
  return {
    id: crypto.randomUUID?.() || `${Date.now()}-${Math.random()}`,
    name,
    createdAt: new Date().toISOString(),
  };
}

function storageKey(userId) {
  return `cubesense-sessions-${userId || 'guest'}`;
}

function readLocal(userId) {
  try {
    const raw = localStorage.getItem(storageKey(userId));
    if (raw) return JSON.parse(raw);
  } catch {
    // ignore corrupt storage
  }
  return null;
}

function writeLocal(userId, payload) {
  localStorage.setItem(storageKey(userId), JSON.stringify(payload));
}

function dbRowToRecord(row) {
  return {
    id: row.id,
    type: row.type,
    penalty: row.penalty,
    time: row.raw_time_ms,
    finalTime: row.final_time_ms,
    scramble: row.scramble,
    date: new Date(row.solved_at).toLocaleTimeString(),
    solvedAt: row.solved_at,
    sessionId: row.session_id,
  };
}

export function useTimerSessions(authSession) {
  const userId = authSession?.user?.id;
  const [sessions, setSessions] = useState([]);
  const [activeSessionId, setActiveSessionId] = useState(null);
  const [solves, setSolves] = useState([]);
  const [loading, setLoading] = useState(true);

  const persistLocal = useCallback((nextSessions, nextActiveId, nextSolvesBySession) => {
    writeLocal(userId, {
      activeSessionId: nextActiveId,
      sessions: nextSessions,
      solvesBySession: nextSolvesBySession,
    });
  }, [userId]);

  const loadFromLocal = useCallback(() => {
    const stored = readLocal(userId);
    if (stored?.sessions?.length) {
      setSessions(stored.sessions);
      setActiveSessionId(stored.activeSessionId || stored.sessions[0].id);
      const sid = stored.activeSessionId || stored.sessions[0].id;
      setSolves(stored.solvesBySession?.[sid] || []);
      return stored;
    }

    const initial = createSessionMeta('New Session');
    const empty = { [initial.id]: [] };
    setSessions([initial]);
    setActiveSessionId(initial.id);
    setSolves([]);
    persistLocal([initial], initial.id, empty);
    return { activeSessionId: initial.id, sessions: [initial], solvesBySession: empty };
  }, [userId, persistLocal]);

  useEffect(() => {
    let isMounted = true;

    const load = async () => {
      setLoading(true);

      if (!isSupabaseConfigured || !userId) {
        loadFromLocal();
        if (isMounted) setLoading(false);
        return;
      }

      const local = readLocal(userId);

      const { data: sessionRows, error: sessionError } = await supabase
        .from('timing_sessions')
        .select('id, name, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: true });

      if (!isMounted) return;

      if (sessionError) {
        console.warn('Sessions table unavailable, using local storage:', sessionError.message);
        loadFromLocal();
        setLoading(false);
        return;
      }

      let nextSessions = sessionRows?.map((row) => ({
        id: row.id,
        name: row.name,
        createdAt: row.created_at,
      })) || [];

      let nextActiveId = local?.activeSessionId;

      if (!nextSessions.length) {
        const created = createSessionMeta('New Session');
        const { data: inserted, error: insertError } = await supabase
          .from('timing_sessions')
          .insert({ id: created.id, user_id: userId, name: created.name })
          .select('id, name, created_at')
          .single();

        if (insertError) {
          loadFromLocal();
          setLoading(false);
          return;
        }

        nextSessions = [{
          id: inserted.id,
          name: inserted.name,
          createdAt: inserted.created_at,
        }];
        nextActiveId = inserted.id;
      }

      if (!nextActiveId || !nextSessions.some((s) => s.id === nextActiveId)) {
        nextActiveId = nextSessions[0].id;
      }

      const { data: solveRows, error: solveError } = await supabase
        .from('solves')
        .select('id, type, raw_time_ms, final_time_ms, penalty, scramble, solved_at, session_id')
        .eq('user_id', userId)
        .eq('session_id', nextActiveId)
        .order('solved_at', { ascending: false });

      if (!isMounted) return;

      if (solveError) {
        console.warn('Unable to load solves:', solveError);
      }

      const loadedSolves = (solveRows || []).map(dbRowToRecord);
      const solvesBySession = { ...(local?.solvesBySession || {}), [nextActiveId]: loadedSolves };

      setSessions(nextSessions);
      setActiveSessionId(nextActiveId);
      setSolves(loadedSolves);
      persistLocal(nextSessions, nextActiveId, solvesBySession);
      setLoading(false);
    };

    load();

    return () => {
      isMounted = false;
    };
  }, [userId, loadFromLocal, persistLocal]);

  const switchSession = useCallback(async (sessionId) => {
    if (sessionId === activeSessionId) return;

    const local = readLocal(userId) || { solvesBySession: {} };

    if (local.solvesBySession?.[sessionId]) {
      setActiveSessionId(sessionId);
      setSolves(local.solvesBySession[sessionId]);
      persistLocal(sessions, sessionId, local.solvesBySession);
      return;
    }

    if (isSupabaseConfigured && userId) {
      const { data, error } = await supabase
        .from('solves')
        .select('id, type, raw_time_ms, final_time_ms, penalty, scramble, solved_at, session_id')
        .eq('user_id', userId)
        .eq('session_id', sessionId)
        .order('solved_at', { ascending: false });

      if (error) {
        console.warn('Unable to load session solves:', error);
        return;
      }

      const loaded = (data || []).map(dbRowToRecord);
      const solvesBySession = { ...local.solvesBySession, [sessionId]: loaded };
      setActiveSessionId(sessionId);
      setSolves(loaded);
      persistLocal(sessions, sessionId, solvesBySession);
      return;
    }

    setActiveSessionId(sessionId);
    setSolves([]);
    persistLocal(sessions, sessionId, { ...local.solvesBySession, [sessionId]: [] });
  }, [activeSessionId, sessions, userId, persistLocal]);

  const createSession = useCallback(async () => {
    const name = `Session ${sessions.length + 1}`;
    const meta = createSessionMeta(name);
    const nextSessions = [...sessions, meta];

    if (isSupabaseConfigured && userId) {
      const { error } = await supabase
        .from('timing_sessions')
        .insert({ id: meta.id, user_id: userId, name: meta.name });

      if (error) {
        console.warn('Unable to create cloud session:', error);
      }
    }

    const local = readLocal(userId) || { solvesBySession: {} };
    const solvesBySession = { ...local.solvesBySession, [meta.id]: [] };

    setSessions(nextSessions);
    setActiveSessionId(meta.id);
    setSolves([]);
    persistLocal(nextSessions, meta.id, solvesBySession);
  }, [sessions, userId, persistLocal]);

  const addSolve = useCallback(async (record) => {
    const recordWithMeta = {
      ...record,
      localId: crypto.randomUUID?.() || `${Date.now()}-${Math.random()}`,
      solvedAt: new Date().toISOString(),
      sessionId: activeSessionId,
    };

    setSolves((prev) => {
      const next = [recordWithMeta, ...prev];
      const local = readLocal(userId) || { solvesBySession: {} };
      persistLocal(sessions, activeSessionId, {
        ...local.solvesBySession,
        [activeSessionId]: next,
      });
      return next;
    });

    if (!isSupabaseConfigured || !userId || !activeSessionId) {
      return recordWithMeta;
    }

    const insertPayload = {
      user_id: userId,
      session_id: activeSessionId,
      type: record.type,
      raw_time_ms: Number.isFinite(record.time) ? Math.round(record.time) : null,
      final_time_ms: Number.isFinite(record.finalTime) ? Math.round(record.finalTime) : null,
      penalty: record.penalty,
      scramble: record.scramble,
      solved_at: recordWithMeta.solvedAt,
    };

    const { data, error } = await supabase
      .from('solves')
      .insert(insertPayload)
      .select()
      .single();

    if (error) {
      console.warn('Unable to save solve:', error);
      return recordWithMeta;
    }

    const saved = dbRowToRecord(data);
    setSolves((prev) => {
      const next = [saved, ...prev.filter((item) => item.localId !== recordWithMeta.localId)];
      const local = readLocal(userId) || { solvesBySession: {} };
      persistLocal(sessions, activeSessionId, {
        ...local.solvesBySession,
        [activeSessionId]: next,
      });
      return next;
    });

    return saved;
  }, [activeSessionId, sessions, userId, persistLocal]);

  const deleteSolve = useCallback(async (record) => {
    const key = record.id || record.localId;

    setSolves((prev) => {
      const next = prev.filter((item) => (item.id || item.localId) !== key);
      const local = readLocal(userId) || { solvesBySession: {} };
      persistLocal(sessions, activeSessionId, {
        ...local.solvesBySession,
        [activeSessionId]: next,
      });
      return next;
    });

    if (record.id && isSupabaseConfigured && userId) {
      const { error } = await supabase
        .from('solves')
        .delete()
        .eq('id', record.id)
        .eq('user_id', userId);

      if (error) {
        console.warn('Unable to delete solve:', error);
      }
    }
  }, [activeSessionId, sessions, userId, persistLocal]);

  const updatePenalty = useCallback(async (record, penalty) => {
    let finalTime = record.finalTime;
    if (penalty === 'DNF') {
      finalTime = null;
    } else if (penalty === '+2' && Number.isFinite(record.time)) {
      finalTime = record.time + 2000;
    } else if (!penalty && Number.isFinite(record.time)) {
      finalTime = record.time;
    }

    const updated = { ...record, penalty, finalTime };
    const key = record.id || record.localId;

    setSolves((prev) => {
      const next = prev.map((item) => ((item.id || item.localId) === key ? updated : item));
      const local = readLocal(userId) || { solvesBySession: {} };
      persistLocal(sessions, activeSessionId, {
        ...local.solvesBySession,
        [activeSessionId]: next,
      });
      return next;
    });

    if (record.id && isSupabaseConfigured && userId) {
      const { error } = await supabase
        .from('solves')
        .update({
          penalty,
          final_time_ms: Number.isFinite(finalTime) ? Math.round(finalTime) : null,
        })
        .eq('id', record.id)
        .eq('user_id', userId);

      if (error) {
        console.warn('Unable to update solve:', error);
      }
    }
  }, [activeSessionId, sessions, userId, persistLocal]);

  const activeSession = useMemo(
    () => sessions.find((s) => s.id === activeSessionId) || null,
    [sessions, activeSessionId],
  );

  return {
    sessions,
    activeSession,
    activeSessionId,
    solves,
    loading,
    createSession,
    switchSession,
    addSolve,
    deleteSolve,
    updatePenalty,
  };
}
