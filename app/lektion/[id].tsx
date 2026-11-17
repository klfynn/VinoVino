// Lektionsansicht als eigene Route im Wurzel-Stapel (Teil C).
// Der Verkostungs-Assistent (/tasting/[id]) liegt im Wurzel-Stapel über den Tabs. Ein Sprung nach
// /academy/lesson/[id] würde in die Tabs wechseln und den Assistenten verlassen oder eine zweite
// Tab-Ansicht anlegen. Diese Route legt dieselbe, unveränderte Lektionsansicht direkt auf den Stapel,
// „Zurück“ führt wieder in den Assistenten.
export { default } from '../(tabs)/academy/lesson/[id]';
