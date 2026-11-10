import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  deleteTastingNote,
  listRecentTastingNotes,
  listTastingNotes,
  RECENT_DEFAULT_LIMIT,
  saveTastingNote,
  updateTastingNote,
} from '../../services/tastingNotes';
import { profileFromTasting } from './validate';
import { sameWineRef } from './wineRef';
import { TastingNote, TastingNoteInput, TastingNotePatch, TastingProfile, WineRef } from './types';

type ActionResult = { ok: true; note?: TastingNote } | { ok: false; error: string };

const byTastedAtDesc = (a: TastingNote, b: TastingNote) => b.tastedAt.localeCompare(a.tastedAt);

/**
 * Verkostungen laden und speichern (ohne Oberfläche).
 * - Mit `ref`: alle Verkostungen dieses Weins (Marktplatz oder eigener Wein), neueste zuerst.
 * - Ohne `ref`: die letzten Verkostungen über alle Weine (`limit`, Standard 20).
 * Ohne Anmeldung bleibt die Liste leer; Speichern liefert eine verständliche Fehlermeldung.
 */
export function useTastingNotes(options: { ref?: WineRef | null; limit?: number } = {}) {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  // Aus den Einzelwerten neu bilden, damit ein neues Objekt mit gleichem Inhalt nichts neu lädt.
  const refKind = options.ref?.kind ?? null;
  const refId = options.ref?.id ?? null;
  const ref = useMemo<WineRef | null>(
    () => (refKind && refId ? { kind: refKind, id: refId } : null),
    [refKind, refId],
  );
  const limit = options.limit ?? RECENT_DEFAULT_LIMIT;

  const [notes, setNotes] = useState<TastingNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const hasLoaded = useRef(false);
  // Verhindert, dass eine ältere, langsame Antwort eine neuere überschreibt.
  const requestId = useRef(0);

  const refresh = useCallback(async () => {
    const current = ++requestId.current;
    if (!userId) {
      setNotes([]);
      setError(null);
      setLoading(false);
      return;
    }
    // Spinner nur beim ersten Laden; spätere Aktualisierungen laufen still.
    if (!hasLoaded.current) setLoading(true);
    const result = ref ? await listTastingNotes(ref) : await listRecentTastingNotes(limit);
    if (current !== requestId.current) return;
    if (result.ok) {
      setNotes(result.data);
      setError(null);
      hasLoaded.current = true;
    } else {
      setError(result.error);
    }
    setLoading(false);
  }, [userId, ref, limit]);

  useEffect(() => {
    hasLoaded.current = false;
    refresh();
  }, [refresh]);

  /** Neue Verkostung speichern. Ohne `ref` im Eingabeobjekt wird der Wein des Hooks verwendet. */
  const save = useCallback(
    async (input: Omit<TastingNoteInput, 'ref'> & { ref?: WineRef }): Promise<ActionResult> => {
      const targetRef = input.ref ?? ref;
      if (!targetRef) return { ok: false, error: 'Kein Wein für die Verkostung ausgewählt.' };
      setSaving(true);
      const result = await saveTastingNote({ ...input, ref: targetRef });
      setSaving(false);
      if (!result.ok) return result;
      // Nur in die Liste aufnehmen, wenn sie diesen Wein (oder alle Weine) zeigt.
      if (!ref || sameWineRef(result.data.ref, ref)) {
        setNotes((list) => {
          const next = [result.data, ...list.filter((n) => n.id !== result.data.id)].sort(byTastedAtDesc);
          return ref ? next : next.slice(0, limit);
        });
      }
      return { ok: true, note: result.data };
    },
    [ref, limit],
  );

  const update = useCallback(async (id: string, patch: TastingNotePatch): Promise<ActionResult> => {
    setSaving(true);
    const result = await updateTastingNote(id, patch);
    setSaving(false);
    if (!result.ok) return result;
    setNotes((list) => list.map((n) => (n.id === id ? result.data : n)).sort(byTastedAtDesc));
    return { ok: true, note: result.data };
  }, []);

  const remove = useCallback(async (id: string): Promise<ActionResult> => {
    setSaving(true);
    const result = await deleteTastingNote(id);
    setSaving(false);
    if (!result.ok) return result;
    setNotes((list) => list.filter((n) => n.id !== id));
    return { ok: true };
  }, []);

  const latest = notes[0] ?? null;
  const latestProfile = useMemo<TastingProfile | null>(
    () => (latest ? profileFromTasting(latest.data) : null),
    [latest],
  );

  return { notes, latest, latestProfile, loading, saving, error, refresh, save, update, remove };
}
