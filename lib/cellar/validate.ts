// Prüfen und Bereinigen der Eingaben für eigene Weine (reine Funktionen, ohne Nebenwirkungen).
import { isBodenId, isWeinartWert } from '../tasting/catalog';
import type { CustomWineErrors, CustomWineInput, CustomWineValues } from './types';

// Grenzen passend zu den Check-Constraints in 20261111100000_custom_wines.sql
export const NAME_MAX_LENGTH = 120;
export const TEXT_MAX_LENGTH = 120;
export const JAHRGANG_MAX_LENGTH = 20;
export const FLASCHENGROESSE_MAX_LENGTH = 20;
export const NOTIZ_MAX_LENGTH = 1000;
export const QUANTITY_MAX = 9999;
export const PREIS_MAX = 100000;
export const JAHRGANG_MIN = 1800;
/** Ohne Jahrgang (Non-Vintage). */
export const JAHRGANG_NV = 'NV';

const isObj = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

/** Text bereinigen: Leerzeichen am Rand und doppelte Leerzeichen entfernen; leer → null. */
function cleanText(v: unknown): string | null {
  if (typeof v === 'number' && Number.isFinite(v)) v = String(v);
  if (typeof v !== 'string') return null;
  const t = v.replace(/\s+/g, ' ').trim();
  return t ? t : null;
}

/** Zahl aus Text oder Zahl lesen; Komma als Dezimaltrenner erlaubt. Leer → null, kaputt → NaN. */
function parseNumber(v: unknown): number | null {
  if (v === undefined || v === null) return null;
  if (typeof v === 'number') return v;
  if (typeof v !== 'string') return NaN;
  const t = v.trim().replace(/\s/g, '').replace(/^€|€$/g, '');
  if (!t) return null;
  // Erlaubt: 12 · 12,5 · 12.50 · 1.234,50 (Tausenderpunkt nur zusammen mit Dezimalkomma)
  if (/^\d{1,3}(\.\d{3})+,\d{1,2}$/.test(t)) return Number(t.replace(/\./g, '').replace(',', '.'));
  if (/^\d+([.,]\d+)?$/.test(t)) return Number(t.replace(',', '.'));
  return NaN;
}

/** Jahrgang vereinheitlichen: „nv“, „n.v.“ → „NV“, sonst bereinigter Text. */
function normalizeJahrgang(v: unknown): string | null {
  const t = cleanText(v);
  if (!t) return null;
  if (/^n\.?\s?v\.?$/i.test(t)) return JAHRGANG_NV;
  return t;
}

/**
 * Bereinigt die Formularwerte, ohne zu prüfen: Texte getrimmt (leer → null), Zahlen gelesen
 * (kaputt → NaN, damit `validateCustomWineInput` sie meldet), Anzahl ohne Angabe = 1,
 * Boden „weiß nicht“ → null. Funktioniert auch mit kaputten Eingaben (z. B. null) und wirft nie.
 */
export function normalizeCustomWine(input: unknown): CustomWineValues {
  const o: CustomWineInput = isObj(input) ? input : {};
  const quantity = parseNumber(o.quantity);
  const preis = parseNumber(o.preis);
  const boden = cleanText(o.boden);
  return {
    name: cleanText(o.name) ?? '',
    weingut: cleanText(o.weingut),
    weinart: cleanText(o.weinart),
    jahrgang: normalizeJahrgang(o.jahrgang),
    herkunft: cleanText(o.herkunft),
    region: cleanText(o.region),
    rebsorte: cleanText(o.rebsorte),
    quantity: quantity === null ? 1 : quantity,
    preis: preis === null ? null : Math.round(preis * 100) / 100,
    boden: boden === 'weiss_nicht' ? null : boden,
    flaschengroesse: cleanText(o.flaschengroesse),
  };
}

function checkLength(errors: CustomWineErrors, field: keyof CustomWineValues, value: string | null, max: number, label: string) {
  if (value !== null && Array.from(value).length > max) errors[field] = `${label} darf höchstens ${max} Zeichen lang sein.`;
}

/**
 * Prüft die Eingaben für einen eigenen Wein. Liefert die bereinigten Werte und je Feld eine
 * deutsche Fehlermeldung. `ok` ist true, wenn es keine Fehler gibt.
 */
export function validateCustomWineInput(
  input: unknown,
  now: Date = new Date(),
): { ok: boolean; values: CustomWineValues; errors: CustomWineErrors } {
  const values = normalizeCustomWine(input);
  const errors: CustomWineErrors = {};

  if (!values.name) errors.name = 'Bitte gib einen Namen ein.';
  else checkLength(errors, 'name', values.name, NAME_MAX_LENGTH, 'Der Name');
  checkLength(errors, 'weingut', values.weingut, TEXT_MAX_LENGTH, 'Das Weingut');
  checkLength(errors, 'herkunft', values.herkunft, TEXT_MAX_LENGTH, 'Die Herkunft');
  checkLength(errors, 'region', values.region, TEXT_MAX_LENGTH, 'Die Region');
  checkLength(errors, 'rebsorte', values.rebsorte, TEXT_MAX_LENGTH, 'Die Rebsorte');
  checkLength(errors, 'flaschengroesse', values.flaschengroesse, FLASCHENGROESSE_MAX_LENGTH, 'Die Flaschengröße');

  if (values.weinart !== null && !isWeinartWert(values.weinart)) {
    errors.weinart = 'Bitte wähle eine Weinart aus der Liste.';
  }

  if (values.jahrgang !== null && values.jahrgang !== JAHRGANG_NV) {
    const maxJahr = now.getFullYear() + 1;
    const jahr = /^\d{4}$/.test(values.jahrgang) ? Number(values.jahrgang) : NaN;
    if (!(jahr >= JAHRGANG_MIN && jahr <= maxJahr)) {
      errors.jahrgang = `Bitte ein Jahr zwischen ${JAHRGANG_MIN} und ${maxJahr} oder „NV“ eingeben.`;
    }
  }

  if (!Number.isInteger(values.quantity) || values.quantity < 0 || values.quantity > QUANTITY_MAX) {
    errors.quantity = `Bitte eine ganze Zahl zwischen 0 und ${QUANTITY_MAX} eingeben.`;
  }

  if (values.preis !== null && !(Number.isFinite(values.preis) && values.preis >= 0 && values.preis <= PREIS_MAX)) {
    errors.preis = 'Bitte einen Preis wie 12,50 eingeben (ohne Minus).';
  }

  if (values.boden !== null && !isBodenId(values.boden)) {
    errors.boden = 'Bitte wähle einen Boden aus der Liste.';
  }

  return { ok: Object.keys(errors).length === 0, values, errors };
}

/** Prüft Sterne (1 bis 5) und Notiz; liefert eine Fehlermeldung oder `null`. */
export function validateRating(rating: unknown, notiz: unknown): string | null {
  if (!Number.isInteger(rating) || (rating as number) < 1 || (rating as number) > 5) {
    return 'Bitte vergib 1 bis 5 Sterne.';
  }
  if (notiz !== null && notiz !== undefined && typeof notiz !== 'string') return 'Ungültige Notiz.';
  if (typeof notiz === 'string' && Array.from(notiz).length > NOTIZ_MAX_LENGTH) {
    return `Die Notiz darf höchstens ${NOTIZ_MAX_LENGTH} Zeichen lang sein.`;
  }
  return null;
}
