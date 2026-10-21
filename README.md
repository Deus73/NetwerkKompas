# NetwerkKompas · v2.2.0

Een Nederlandstalige webapp die je helpt internetproblemen te onderzoeken. Geen installatie of account nodig. Werkt op desktop en mobiel.

## Gebruik

Open de GitHub Pages-link bij **About** in deze repository. Klik op **Start verbindingscheck** of kies je klacht bij **Storingshulp**.

## Nieuw in 2.2.0

- Geavanceerd tab met uitgebreide netwerktools
- Uitgebreide speedtest, ping, jitter meting
- DNS lookup en traceroute simulatie
- Dark mode met automatische voorkeurdetectie en toggle
- Verbeterde mobiele weergave en toegankelijkheid
- Installeerbaar als PWA op ondersteunde browsers; offline storingshulp na een eerste succesvol bezoek.
- Monitoring van 5, 15 of 30 minuten met instelbaar interval.
- Verbindingslabels voor vergelijken van wifi, netwerkkabel, mobiele data en VPN.
- Samenvatting van responstijden en geslaagde externe meetrondes.
- Tijdlijn met meetproblemen, browserstatus en eigen notities.
- Optioneel lokaal bewaren van maximaal 300 meetrondes en 200 gebeurtenissen/notities.
- JSON, CSV en afdrukbaar rapport (via Afdrukken ook als PDF te bewaren).
- Domeincontrole via Google DNS, directe HTTPS-check en optionele 5 MB-downloadindicatie.
- Uitleesopdrachten voor Windows, Linux/ParrotOS en macOS.

## Zelf draaien

```sh
python3 -m http.server 8080 --directory docs
```

Open http://localhost:8080. Geen dependencies of buildstap nodig. De broncode en gepubliceerde app staan in `docs/`. De oude `dist/`-indeling is vervangen door `docs/` voor GitHub Pages.

## GitHub Pages

Publicatiebron: **main**, map **/docs**. Wijzigingen in deze map worden door GitHub Pages gepubliceerd. HTTPS is vereist voor PWA-installatie en offline opslag buiten localhost.

## Wat wordt er gemeten?

Drie HTTP-verzoeken naar een herkenbaar testbestand op de app-host, plus twee externe meetpunten (Cloudflare en Google DNS). De weergegeven mediaan betreft de HTTP-tijd naar de app-host, inclusief browser- en serveroverhead. De externe succesratio is geen uptimegarantie of pakketverliesmeting. De downloadindicatie gebruikt één bestand van 5 MB; dit is geen volledige speedtest.

Geen echte ICMP-ping, traceroute, wifi-scan, routerinspectie of packet capture. Een browser kan niet zelfstandig bewijzen dat een storing bij je provider ligt. CORS, VPN, DNS, browserextensies, TLS, caching van DNS en de testdiensten beïnvloeden resultaten. Een geslaagde Google DNS-query test niet de resolver van je apparaat. Achtergrondtabs kunnen timers vertragen; monitoring stopt als de app sluit.

## Privacy en offline werking

Zonder opt-in staan resultaten alleen in het tabbladgeheugen. Met lokaal bewaren aan gebruikt de app localStorage, uitsluitend op jouw apparaat. Gebruik **Geschiedenis wissen** om metingen en notities te verwijderen. Geen analytics, accounts of centrale opslag van meetresultaten. Hosting- en testdiensten kunnen normale toegangslogs bijhouden en ontvangen je IP-adres; een gecontroleerd domein wordt naar Google DNS gestuurd.

De service worker bewaart alleen appbestanden. `probe.json`, externe aanvragen en aanvragen met queryparameters gaan altijd naar het netwerk. Offline beschikbaarheid is geen succesvolle internetmeting. Nieuwe service-worker-versies activeren nadat oude appvensters zijn gesloten.

Zie [CHANGELOG.md](CHANGELOG.md) en [VERSION](VERSION).


## Screenshots

![NetwerkKompas Overview](screenshots/overview.png)

![NetwerkKompas Mobile](screenshots/mobile.png)
