# People Memory PoC

Mobile-first WebApp (PWA) für das strukturierte Speichern von Personenkontakten inkl. Gesprächsrelevanter Details.

## Features

- Freundliches, modernes, helles UI mit sanften Animationen
- Mobile-first Navigation mit Tabs: Home, Kontakte, Kategorien, Settings
- Kontakte mit Stammdaten (Name, Adresse, Geburtstag, Beruf)
- Zusätzliche Themenfelder: Privates, Berufliches, Sport, Politik, Hobbys, Familie, Beziehungskontext
- Kategorien (Beruf, Privat, Freunde, Familie, Verein)
- Suche und Kategorie-Filter
- Kontakt bearbeiten & löschen
- Demo-Daten per Klick laden (schnell testbar)
- Lokale Persistenz via `localStorage`
- Offline-Cache via Service Worker

## Starten

```bash
python3 -m http.server 4173
```

Dann öffnen: <http://localhost:4173>

## Schnelltest

1. Home öffnen
2. Auf **Demo-Daten laden** klicken
3. Zu **Kontakte** wechseln und Suche/Filter testen
4. In **Settings** optional Export/Reset testen
