# NetwerkKompas

Nederlandstalige, mobiele webapp voor browsergebaseerde netwerkdiagnose.

## Starten
Serveer `dist/` met een gewone statische webserver (HTTPS aanbevolen). Er zijn geen dependencies of buildstappen. Voor lokaal gebruik: `python3 -m http.server 8080 --directory dist` en open http://localhost:8080.

## Functies
- Drie HTTP-metingen naar een herkenbaar eigen testbestand en twee externe meetpunten.
- Mediaan HTTP-responstijd, bereikbaarheid en maximaal vijf minuten monitoring.
- DNS over HTTPS via Google en directe HTTPS-check met expliciete CORS-beperking.
- Optionele 5 MB downloadindicatie via Cloudflare.
- Gerichte storingshulp en uitleesopdrachten voor Linux/ParrotOS, Windows en macOS.
- JSON-rapportexport. Metingen bestaan uitsluitend in het geheugen van de browser.

## Grenzen en privacy
Geen ICMP-ping, wifi-scan, routerinspectie, poortscan, traceroute, uploadmeting of pakketverliesmeting. De app kan een fout niet automatisch aan de provider toeschrijven. De browserstatus is slechts een hint. Externe endpoints kunnen uitvallen of door CORS, CSP, extensies of netwerkfilters onbereikbaar zijn. DNS over HTTPS test niet de DNS-resolver van het apparaat. De korte downloadtest is geen volledige speedtest.

Na het starten van tests zien de testdiensten het IP-adres van de bezoeker. Een ingevoerde domeinnaam wordt naar Google DNS gestuurd. Er zijn geen analytics, accounts of serveropslag van meetresultaten. De hostingprovider kan normale toegangslogs bijhouden. Achtergrondtabs kunnen timers vertragen.

## GitHub Pages
Publiceer de inhoud van `dist` als GitHub Pages-artifact. `.openai/hosting.json` is voor Sites-hosting en niet nodig voor GitHub Pages. Voeg nooit tokens of meetrapporten toe aan de repository.
