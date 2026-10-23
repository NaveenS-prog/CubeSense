import { useCallback, useEffect, useMemo, useState } from 'react';
import { isSupabaseConfigured, supabase } from '../lib/supabaseClient';

const LEGACY_SESSION_ID = 'legacy-default';

function generateUUID() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function isValidUUID(str) {
  return typeof str === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(str);
}

function createSessionMeta(name) {
  return {
    id: generateUUID(),
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

function mergeSolvesByKey(cloudSolves, localSolves) {
  const byKey = new Map();

  [...localSolves, ...cloudSolves].forEach((solve) => {
    const key = solve.id || solve.localId || `${solve.solvedAt}-${solve.finalTime}`;
    const existing = byKey.get(key);
    if (!existing || (solve.id && !existing.id)) {
      byKey.set(key, solve);
    }
  });

  return [...byKey.values()].sort(
    (a, b) => new Date(b.solvedAt).getTime() - new Date(a.solvedAt).getTime(),
  );
}

export function useTimerSessions(authSession) {
  const userId = authSession?.user?.id;
  const [sessions, setSessions] = useState([]);
  const [activeSessionId, setActiveSessionId] = useState(null);
  const [solves, setSolves] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cloudSessionsEnabled, setCloudSessionsEnabled] = useState(false);

  const persistLocal = useCallback((nextSessions, nextActiveId, nextSolvesBySession) => {
    writeLocal(userId, {
      activeSessionId: nextActiveId,
      sessions: nextSessions,
      solvesBySession: nextSolvesBySession,
    });
  }, [userId]);

  const applySessionState = useCallback((nextSessions, nextActiveId, nextSolves, solvesBySession) => {
    setSessions(nextSessions);
    setActiveSessionId(nextActiveId);
    setSolves(nextSolves);
    persistLocal(nextSessions, nextActiveId, solvesBySession);
  }, [persistLocal]);

  const loadFromLocal = useCallback(() => {
    let stored = readLocal(userId);

    // If signed in, but no user solves exist yet, check guest storage and migrate them
    if (userId && (!stored || !stored.sessions?.length)) {
      const guestStored = readLocal('guest');
      if (guestStored?.sessions?.length) {
        stored = guestStored;
        writeLocal(userId, guestStored);
      }
    }

    if (stored?.sessions?.length) {
      const sid = stored.activeSessionId || stored.sessions[0].id;
      applySessionState(
        stored.sessions,
        sid,
        stored.solvesBySession?.[sid] || [],
        stored.solvesBySession || {},
      );
      return stored;
    }

    const initial = createSessionMeta('New Session');
    const empty = { [initial.id]: [] };
    applySessionState([initial], initial.id, [], empty);
    return { activeSessionId: initial.id, sessions: [initial], solvesBySession: empty };
  }, [userId, applySessionState]);

  const fetchCloudSolves = useCallback(async (sessionId, includeLegacy = true) => {
    if (!isSupabaseConfigured || !userId) return { data: [], error: null };

    let query = supabase
      .from('solves')
      .select('id, type, raw_time_ms, final_time_ms, penalty, scramble, solved_at, session_id')
      .eq('user_id', userId)
      .order('solved_at', { ascending: false });

    const hasValidUuid = isValidUUID(sessionId);
    if (hasValidUuid && includeLegacy) {
      query = query.or(`session_id.eq.${sessionId},session_id.is.null`);
    } else if (hasValidUuid) {
      query = query.eq('session_id', sessionId);
    }

    const { data, error } = await query;
    return { data: (data || []).map(dbRowToRecord), error };
  }, [userId]);

  const backfillLegacySolves = useCallback(async (sessionId) => {
    if (!isSupabaseConfigured || !userId || !sessionId || sessionId === LEGACY_SESSION_ID) return;

    await supabase
      .from('solves')
      .update({ session_id: sessionId })
      .eq('user_id', userId)
      .is('session_id', null);
  }, [userId]);

  const uploadMissingLocalSolves = useCallback(async (sessionId, mergedSolves, withSessionId = false) => {
    if (!isSupabaseConfigured || !userId) return mergedSolves;

    const uploaded = await Promise.all(mergedSolves.map(async (solve) => {
      if (solve.id) return solve;

      const payload = {
        user_id: userId,
        type: solve.type,
        raw_time_ms: Number.isFinite(solve.time) ? Math.round(solve.time) : null,
        final_time_ms: Number.isFinite(solve.finalTime) ? Math.round(solve.finalTime) : null,
        penalty: solve.penalty,
        scramble: solve.scramble,
        solved_at: solve.solvedAt || new Date().toISOString(),
      };

      if (withSessionId && sessionId && sessionId !== LEGACY_SESSION_ID) {
        payload.session_id = sessionId;
      }

      let { data, error } = await supabase.from('solves').insert(payload).select().single();

      if (error && payload.session_id) {
        const fallback = { ...payload };
        delete fallback.session_id;
        ({ data, error } = await supabase.from('solves').insert(fallback).select().single());
      }

      if (error) {
        console.warn('Unable to upload local solve:', error);
        return solve;
      }

      return dbRowToRecord(data);
    }));

    return uploaded.sort(
      (a, b) => new Date(b.solvedAt).getTime() - new Date(a.solvedAt).getTime(),
    );
  }, [userId]);

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
      const localSolvesForSession = local?.solvesBySession?.[local?.activeSessionId] || [];

      const { data: sessionRows, error: sessionError } = await supabase
        .from('timing_sessions')
        .select('id, name, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: true });

      if (!isMounted) return;

      if (sessionError) {
        console.warn('Sessions table unavailable, loading solves by user:', sessionError.message);
        setCloudSessionsEnabled(false);

        const legacySession = {
          id: LEGACY_SESSION_ID,
          name: 'All Solves',
          createdAt: new Date().toISOString(),
        };

        const { data: allSolves, error: solveError } = await supabase
          .from('solves')
          .select('id, type, raw_time_ms, final_time_ms, penalty, scramble, solved_at, session_id')
          .eq('user_id', userId)
          .order('solved_at', { ascending: false });

        if (solveError) {
          console.warn('Unable to load cloud solves:', solveError);
          loadFromLocal();
          if (isMounted) setLoading(false);
          return;
        }

        const cloudSolves = (allSolves || []).map(dbRowToRecord);
        const merged = mergeSolvesByKey(cloudSolves, localSolvesForSession);
        const synced = await uploadMissingLocalSolves(LEGACY_SESSION_ID, merged, false);
        const solvesBySession = { [LEGACY_SESSION_ID]: synced };

        if (isMounted) {
          applySessionState([legacySession], LEGACY_SESSION_ID, synced, solvesBySession);
          setLoading(false);
        }
        return;
      }

      setCloudSessionsEnabled(true);

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
          console.warn('Unable to create cloud session:', insertError);
          setCloudSessionsEnabled(false);
          loadFromLocal();
          if (isMounted) setLoading(false);
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

      await backfillLegacySolves(nextActiveId);

      const { data: cloudSolves, error: solveError } = await fetchCloudSolves(nextActiveId, true);

      if (solveError) {
        console.warn('Unable to load solves:', solveError);
      }

      const localForActive = local?.solvesBySession?.[nextActiveId] || localSolvesForSession;
      const merged = mergeSolvesByKey(cloudSolves || [], localForActive);
      const synced = await uploadMissingLocalSolves(nextActiveId, merged, true);

      const solvesBySession = {
        ...(local?.solvesBySession || {}),
        [nextActiveId]: synced,
      };

      if (isMounted) {
        applySessionState(nextSessions, nextActiveId, synced, solvesBySession);
        setLoading(false);
      }
    };

    load();

    return () => {
      isMounted = false;
    };
  }, [
    userId,
    loadFromLocal,
    applySessionState,
    fetchCloudSolves,
    backfillLegacySolves,
    uploadMissingLocalSolves,
  ]);

  const switchSession = useCallback(async (sessionId) => {
    if (sessionId === activeSessionId) return;

    const local = readLocal(userId) || { solvesBySession: {} };

    if (local.solvesBySession?.[sessionId] && !isSupabaseConfigured) {
      applySessionState(sessions, sessionId, local.solvesBySession[sessionId], local.solvesBySession);
      return;
    }

    if (isSupabaseConfigured && userId) {
      if (cloudSessionsEnabled && sessionId !== LEGACY_SESSION_ID) {
        await backfillLegacySolves(sessionId);
      }

      const { data: cloudSolves, error } = await fetchCloudSolves(
        sessionId === LEGACY_SESSION_ID ? null : sessionId,
        sessionId !== LEGACY_SESSION_ID,
      );

      if (error) {
        console.warn('Unable to load session solves:', error);
        return;
      }

      const localForSession = local.solvesBySession?.[sessionId] || [];
      const merged = mergeSolvesByKey(cloudSolves || [], localForSession);
      const synced = await uploadMissingLocalSolves(
        sessionId,
        merged,
        cloudSessionsEnabled && sessionId !== LEGACY_SESSION_ID,
      );
      const solvesBySession = { ...local.solvesBySession, [sessionId]: synced };
      applySessionState(sessions, sessionId, synced, solvesBySession);
      return;
    }

    applySessionState(
      sessions,
      sessionId,
      local.solvesBySession?.[sessionId] || [],
      { ...local.solvesBySession, [sessionId]: local.solvesBySession?.[sessionId] || [] },
    );
  }, [
    activeSessionId,
    sessions,
    userId,
    cloudSessionsEnabled,
    applySessionState,
    fetchCloudSolves,
    backfillLegacySolves,
    uploadMissingLocalSolves,
  ]);

  const createSession = useCallback(async () => {
    const name = `Session ${sessions.length + 1}`;
    const meta = createSessionMeta(name);
    const nextSessions = [...sessions, meta];

    if (isSupabaseConfigured && userId && cloudSessionsEnabled) {
      const { error } = await supabase
        .from('timing_sessions')
        .insert({ id: meta.id, user_id: userId, name: meta.name });

      if (error) {
        console.warn('Unable to create cloud session:', error);
      }
    }

    const local = readLocal(userId) || { solvesBySession: {} };
    const solvesBySession = { ...local.solvesBySession, [meta.id]: [] };

    applySessionState(nextSessions, meta.id, [], solvesBySession);
  }, [sessions, userId, cloudSessionsEnabled, applySessionState]);

  const addSolve = useCallback(async (record) => {
    let currentSessionId = activeSessionId;
    let currentSessions = sessions;

    if (!currentSessionId || !currentSessions.length) {
      const defaultSession = createSessionMeta('New Session');
      currentSessions = [defaultSession];
      currentSessionId = defaultSession.id;
      setSessions(currentSessions);
      setActiveSessionId(currentSessionId);
    }

    const localId = generateUUID();
    const recordWithMeta = {
      ...record,
      id: record.id || localId,
      localId,
      solvedAt: record.solvedAt || new Date().toISOString(),
      sessionId: currentSessionId,
    };

    setSolves((prev) => {
      const next = [recordWithMeta, ...prev];
      const local = readLocal(userId) || { solvesBySession: {} };
      persistLocal(currentSessions, currentSessionId, {
        ...(local.solvesBySession || {}),
        [currentSessionId]: next,
      });
      return next;
    });

    if (!isSupabaseConfigured || !userId) {
      return recordWithMeta;
    }

    const insertPayload = {
      user_id: userId,
      type: record.type || 'solve',
      raw_time_ms: Number.isFinite(record.time) ? Math.round(record.time) : null,
      final_time_ms: Number.isFinite(record.finalTime) ? Math.round(record.finalTime) : null,
      penalty: record.penalty || null,
      scramble: record.scramble || '',
      solved_at: recordWithMeta.solvedAt,
    };

    if (cloudSessionsEnabled && isValidUUID(currentSessionId) && currentSessionId !== LEGACY_SESSION_ID) {
      insertPayload.session_id = currentSessionId;
    }

    let { data, error } = await supabase
      .from('solves')
      .insert(insertPayload)
      .select()
      .single();

    if (error && insertPayload.session_id) {
      const fallbackPayload = { ...insertPayload };
      delete fallbackPayload.session_id;
      ({ data, error } = await supabase
        .from('solves')
        .insert(fallbackPayload)
        .select()
        .single());
    }

    if (error) {
      console.warn('Unable to save solve to cloud:', error);
      return recordWithMeta;
    }

    const saved = dbRowToRecord(data);
    setSolves((prev) => {
      const next = [saved, ...prev.filter((item) => item.localId !== localId && item.id !== localId)];
      const local = readLocal(userId) || { solvesBySession: {} };
      persistLocal(currentSessions, currentSessionId, {
        ...(local.solvesBySession || {}),
        [currentSessionId]: next,
      });
      return next;
    });

    return saved;
  }, [activeSessionId, sessions, userId, cloudSessionsEnabled, persistLocal]);

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

  const clearCurrentSession = useCallback(async () => {
    setSolves([]);
    const local = readLocal(userId) || { solvesBySession: {} };
    persistLocal(sessions, activeSessionId, {
      ...local.solvesBySession,
      [activeSessionId]: [],
    });

    if (isSupabaseConfigured && userId && activeSessionId) {
      const { error } = await supabase
        .from('solves')
        .delete()
        .eq('session_id', activeSessionId)
        .eq('user_id', userId);

      if (error) {
        console.warn('Unable to clear cloud solves:', error);
      }
    }
  }, [activeSessionId, sessions, userId, persistLocal]);

  const renameSession = useCallback(async (newName) => {
    if (!newName?.trim()) return;
    const trimmed = newName.trim();

    setSessions((prev) => {
      const next = prev.map((s) => (s.id === activeSessionId ? { ...s, name: trimmed } : s));
      const local = readLocal(userId) || { solvesBySession: {} };
      persistLocal(next, activeSessionId, local.solvesBySession || {});
      return next;
    });

    if (isSupabaseConfigured && userId && cloudSessionsEnabled && activeSessionId) {
      await supabase
        .from('timing_sessions')
        .update({ name: trimmed })
        .eq('id', activeSessionId)
        .eq('user_id', userId);
    }
  }, [activeSessionId, userId, cloudSessionsEnabled, persistLocal]);

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
    clearCurrentSession,
    renameSession,
  };
}
