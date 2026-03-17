# People Memory PoC+

Mobile-first WebApp (PWA) zum Speichern von Kontakten inkl. tiefer persönlicher und sozialer Kontextinfos.

## Highlights

- Freundliches, modernes Light-UI mit Farben, Emojis und Animationen
- Mobile-first Tabs: Home, Kontakte, Kategorien, Settings
- Home-Dashboard mit allgemeinen Infos, Kategorie-Balken und Geburtstagsliste
- Detaillierte Kontaktfelder inkl. Familie:
  - Ehepartner/in Name
  - Kinder Namen
  - Geschlechter der Kinder
- Verknüpfungen zwischen bestehenden Kontakten (Relationen)
- Eigene Kategorien erstellen
- Suche + Filter + Bearbeiten + Löschen
- Demo-Daten laden für direkten Schnelltest
- Lokale Speicherung (`localStorage`) + Offline-Cache (Service Worker)

## Start

```bash
python3 -m http.server 4173
```

Dann öffnen: <http://localhost:4173>

## Schnell testen

1. Tab **Settings** öffnen
2. **Demo-Daten laden** klicken
3. In **Kontakte** Details öffnen und Relationen prüfen
4. In **Kategorien** eigene Kategorie erstellen
5. In **Home** Dashboard-Infos ansehen
