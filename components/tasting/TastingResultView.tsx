// Darstellung einer Verkostung: Abschlussbildschirm des Assistenten und Nur-Lesen-Ansicht im Weinkeller.
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, spacing } from '../../theme';
import { aromaLabel, getFarben, getSkala, TERROIR } from '../../lib/tasting/catalog';
import {
  KLARHEIT_LABELS,
  LAGERPOTENZIAL_LABELS,
  profileRows,
  selectedAromaIds,
  TRINKREIFE_LABELS,
  ZUSTAND_LABELS,
} from '../../lib/tasting/summary';
import { bodenLabel, bodenVergleichText, BODEN_HINWEIS, compareBoden } from '../../lib/tasting/terroirCompare';
import { sanitizeTastingData } from '../../lib/tasting/validate';
import type { TastingData, WeinKategorie } from '../../lib/tasting/types';
import { AromaChipList, ProfileBars, SectionTitle, tastingStyles } from './TastingUI';

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

export function TastingResultView({
  data,
  kategorie,
  bodenEintrag,
}: {
  data: TastingData;
  kategorie: WeinKategorie;
  /** Eingetragener Boden des Weins (nur eigene Weine), für den neutralen Vergleich */
  bodenEintrag?: string | null;
}) {
  const clean = sanitizeTastingData(data);
  const rows = profileRows(clean, kategorie);
  const aromen = selectedAromaIds(clean).map((id) => aromaLabel(id) ?? id);
  const fehler = (clean.riechen?.fehler ?? []).map((id) => aromaLabel(id) ?? id);
  const farbe = clean.sehen?.farbe ? getFarben(kategorie).find((f) => f.id === clean.sehen?.farbe)?.label : undefined;
  const eindruecke = (clean.terroir?.eindruecke ?? [])
    .map((id) => TERROIR.eindruecke.optionen.find((o) => o.id === id)?.label)
    .filter((x): x is string => !!x);
  const klima = TERROIR.klima_eindruck.optionen.find((o) => o.id === clean.terroir?.klima_eindruck)?.label;
  const tipp = bodenLabel(clean.terroir?.boden_tipp ?? null);
  const vergleich = bodenVergleichText(compareBoden(clean.terroir?.boden_tipp ?? null, bodenEintrag));
  const qualitaet = clean.fazit?.qualitaet;
  const qualitaetAnker = qualitaet ? getSkala('qualitaet')?.anker[qualitaet - 1] : undefined;

  const sehenZeilen: [string, string][] = [];
  if (clean.sehen?.klarheit) sehenZeilen.push(['Klarheit', KLARHEIT_LABELS[clean.sehen.klarheit]]);
  if (farbe) sehenZeilen.push(['Farbe', farbe]);
  if (clean.riechen?.zustand) sehenZeilen.push(['Nase', ZUSTAND_LABELS[clean.riechen.zustand]]);
  const fazitZeilen: [string, string][] = [];
  if (qualitaet) fazitZeilen.push(['Qualität', `${qualitaet} von 5${qualitaetAnker ? ` · ${qualitaetAnker}` : ''}`]);
  if (clean.fazit?.trinkreife) fazitZeilen.push(['Trinkreife', TRINKREIFE_LABELS[clean.fazit.trinkreife]]);
  if (clean.fazit?.lagerpotenzial) fazitZeilen.push(['Lagerpotenzial', LAGERPOTENZIAL_LABELS[clean.fazit.lagerpotenzial]]);

  return (
    <View style={styles.wrap}>
      <View style={tastingStyles.card}>
        <SectionTitle title="PROFIL" />
        <ProfileBars rows={rows} />
      </View>

      {aromen.length > 0 && (
        <View style={tastingStyles.card}>
          <SectionTitle title="AROMEN" />
          <AromaChipList labels={aromen} rest={0} />
        </View>
      )}

      {(sehenZeilen.length > 0 || fehler.length > 0) && (
        <View style={tastingStyles.card}>
          <SectionTitle title="EINDRUCK" />
          {sehenZeilen.map(([l, v]) => (
            <Row key={l} label={l} value={v} />
          ))}
          {fehler.length > 0 && <Row label="Fehlnoten" value={fehler.join(', ')} />}
        </View>
      )}

      {(eindruecke.length > 0 || klima || tipp) && (
        <View style={tastingStyles.card}>
          <SectionTitle title="TERROIR" />
          {eindruecke.length > 0 && <Row label="Eindrücke" value={eindruecke.join(', ')} />}
          {klima && <Row label="Klima" value={klima} />}
          {tipp && <Row label="Dein Tipp zum Boden" value={tipp} />}
          {vergleich && <Text style={styles.vergleich}>{vergleich}</Text>}
          {tipp && <Text style={styles.hinweis}>{BODEN_HINWEIS}</Text>}
        </View>
      )}

      {(fazitZeilen.length > 0 || clean.fazit?.notiz) && (
        <View style={tastingStyles.card}>
          <SectionTitle title="FAZIT" />
          {fazitZeilen.map(([l, v]) => (
            <Row key={l} label={l} value={v} />
          ))}
          {clean.fazit?.notiz ? <Text style={styles.notiz}>{clean.fazit.notiz}</Text> : null}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.md },
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.md, paddingVertical: 4 },
  rowLabel: { color: colors.textMuted, fontSize: 13 },
  rowValue: { color: colors.text, fontSize: 13, fontWeight: '600', flexShrink: 1, textAlign: 'right' },
  vergleich: { color: colors.text, fontSize: 13, lineHeight: 19, marginTop: spacing.sm },
  hinweis: { color: colors.textMuted, fontSize: 12, lineHeight: 17, marginTop: spacing.xs, fontStyle: 'italic' },
  notiz: { color: colors.text, fontSize: 14, lineHeight: 20, marginTop: spacing.sm, fontStyle: 'italic' },
});
