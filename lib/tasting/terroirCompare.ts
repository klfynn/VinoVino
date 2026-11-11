// Vergleich deines Boden-Tipps mit dem Eintrag des Weins (reine Funktionen).
// Der Eintrag wird erst nach deiner Auswahl angezeigt und nie als Tipp vorausgefüllt,
// damit der Tipp nicht verfälscht wird. Der Vergleich ist eine Beobachtungsübung, keine Messung.
import { TERROIR } from './catalog';
import { bodenVorbelegung } from './wineRef';

/** Hinweis unter dem Vergleich. Der Boden wird nie als Ursache eines Geschmacks dargestellt. */
export const BODEN_HINWEIS =
  'Wie stark der Boden den Geschmack beeinflusst, ist unter Fachleuten umstritten. Nutze das hier als Beobachtungsübung.';

export type BodenVergleich =
  /** Kein Tipp abgegeben: nichts anzeigen */
  | { art: 'kein_tipp' }
  /** Wein hat keinen (bekannten) Boden im Eintrag: nichts vergleichen */
  | { art: 'kein_eintrag' }
  /** Tipp „weiß nicht“, Eintrag vorhanden */
  | { art: 'weiss_nicht'; eintrag: string }
  | { art: 'gleich'; eintrag: string }
  | { art: 'verschieden'; eintrag: string; tipp: string };

export function bodenLabel(id: string | null | undefined): string | null {
  if (!id) return null;
  return TERROIR.boeden.optionen.find((o) => o.id === id)?.label ?? null;
}

/**
 * Vergleicht den Tipp (ID aus terroir.json) mit dem eingetragenen Boden (`custom_wines.boden`).
 * Unbekannte, leere oder „weiß nicht“-Einträge zählen als kein Eintrag.
 */
export function compareBoden(tipp: string | null | undefined, eintragBoden: unknown): BodenVergleich {
  const tippLabel = bodenLabel(tipp);
  if (!tipp || !tippLabel) return { art: 'kein_tipp' };
  const eintragId = bodenVorbelegung({ boden: eintragBoden });
  const eintragLabel = bodenLabel(eintragId);
  if (!eintragId || !eintragLabel) return { art: 'kein_eintrag' };
  if (tipp === 'weiss_nicht') return { art: 'weiss_nicht', eintrag: eintragLabel };
  if (tipp === eintragId) return { art: 'gleich', eintrag: eintragLabel };
  return { art: 'verschieden', eintrag: eintragLabel, tipp: tippLabel };
}

/** Neutrale Zeile für die Anzeige oder `null`, wenn es nichts zu vergleichen gibt. */
export function bodenVergleichText(v: BodenVergleich): string | null {
  switch (v.art) {
    case 'gleich':
      return 'Dein Tipp stimmt mit dem Eintrag überein.';
    case 'verschieden':
      return `Im Eintrag dieses Weins steht: ${v.eintrag}. Dein Tipp: ${v.tipp}.`;
    case 'weiss_nicht':
      return `Im Eintrag dieses Weins steht: ${v.eintrag}.`;
    default:
      return null;
  }
}
