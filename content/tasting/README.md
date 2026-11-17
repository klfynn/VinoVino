# Kataloge für den Verkostungsbogen

Diese Dateien sind statisch und werden mit der App gebündelt (nicht in Supabase gespeichert).

| Datei | Inhalt |
| --- | --- |
| `aromen.json` | Primär-, Sekundär- und Tertiäraromen in Familien, dazu die Fehlnoten (nur Stufe Profi) |
| `farben.json` | Farben je Weinkategorie von hell nach dunkel, dazu die Randfarben (nur Stufe Profi) |
| `skalen.json` | Skalen von 1 bis 5 mit Ankertexten, Weinkategorien und Mindeststufe |
| `terroir.json` | Eindrücke, Bodentipp und Klimaeindruck für den Terroir-Schritt |
| `abschnitte.json` | Die Schritte des Bogens und ihre passende Akademie-Lektion |
| `lektionen.json` | Zuordnung Lektion → Schwerpunkt, Stufe, Hinweis; optional `"blind": true` für die Blindverkostung |
| `rebsorten.json` | Rebsorten für die Tipp-Auswahl der Blindverkostung, mit `farbe` (`rot`/`weiss`) und `aliases` |
| `laender.json` | Weinländer für die Tipp-Auswahl der Blindverkostung, mit `aliases` |

## Wichtig: IDs nie umbenennen

Jeder Eintrag hat eine stabile `id` (nur Kleinbuchstaben a–z und Unterstrich, keine Umlaute, kein ß).
Diese IDs werden in `tasting_notes.data` gespeichert. Wird eine ID umbenannt oder gelöscht,
passen gespeicherte Verkostungen nicht mehr zum Katalog und die Werte gehen beim nächsten Speichern verloren.

- Texte (`label`, `erklaerung`, `anker` …) dürfen jederzeit verbessert werden.
- Neue Einträge dürfen hinzukommen, mit neuer, eindeutiger ID.
- Bestehende IDs bleiben, auch wenn ein Eintrag nicht mehr angezeigt werden soll.

Das gilt auch für `rebsorten.json` und `laender.json`: Die IDs stehen in gespeicherten
Blindverkostungen (`data.blind.rebsorten_tipp`, `land_tipp`, `wahrheit`). Neue Schreibweisen,
Sprachen und Synonyme kommen in `aliases`, nie in eine neue ID. Ein Alias darf nur bei einem
Eintrag vorkommen (prüft das Skript).

## Akademie-Verknüpfung

Das Feld `lektion` enthält die ID einer Lektion aus `content/academy/` (zum Beispiel `l03`) oder `null`.

## Prüfen

```bash
npm run check:tasting
```

Das Skript prüft unter anderem, dass alle IDs eindeutig sind, dem Schema folgen und jede `lektion` existiert.
