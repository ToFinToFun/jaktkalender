# Jaktkalender

En visuell svensk jaktkalender för **säsonger, plats och sol**.

Jaktkalendern visar fasta svenska jaktsäsonger som en tidslinje. Användaren väljer plats och arter och kan växla mellan jaktår, månad, vecka och dag. På vecka/dag räknas solstyrda tidsfönster ut för den valda platsen, så nattluckor och fasta specialperioder syns direkt.

> Projektet är en säsongskalender – inte en kontroll av om en viss person har rätt att jaga vid ett visst tillfälle. Kvoter, avlysningar, personliga tillstånd, jakträtt och tillfälliga beslut följs inte. Skyddsjakt enligt bilaga 4 ligger också utanför kalenderns scope.

## Funktioner

- jaktår, månad, vecka och dag
- platsanpassad soluppgång/solnedgång beräknad lokalt
- tidslinjer per art
- särskild markering för fasta delperioder, till exempel smyg-/vaktjakt
- fasta licensjaktsfönster för stora rovdjur
- artval och snabbval per artgrupp
- platsökning i Sverige
- kartnål och valfri webbläsarposition
- responsiv layout för mobil och desktop
- regelversioner för kända ändringar från 1 juli 2027
- officiella källor direkt i detaljvyn

## Datakällor

Primära källor:

- [Jaktförordning (1987:905), Sveriges riksdag](https://www.riksdagen.se/sv/dokument-och-lagar/dokument/svensk-forfattningssamling/jaktforordning-1987905_sfs-1987-905/)
- [NFS 2022:4, Naturvårdsverket](https://www.naturvardsverket.se/lagar-och-regler/foreskrifter-och-allmanna-rad/2022/nfs-2022-4/)

Se `docs/rule-audit.md` för avgränsningar och regelgranskning och `docs/data-sources.md` för datakällorna i appen.

## Teknik

Webbappen är medvetet byggd utan framework eller byggsteg:

- HTML
- modern CSS
- ES modules / JavaScript
- MapLibre GL JS för kartan
- OpenFreeMap för fria karttiles
- Nominatim för användarinitierad ortsökning/reverse geocoding
- Nginx i Docker för publicering

Regelmotorn och solberäkningen körs helt i webbläsaren. Kart- och ortsökning kräver internet men kalendern och beräkningarna har ingen serverbackend.

## Köra lokalt på Linux

Ingen lokal webbserver behöver installeras permanent. Från repot:

```bash
python3 -m http.server 8080
```

Öppna sedan `http://localhost:8080`.

För att testa från en telefon på samma nät:

```bash
python3 -m http.server 8080 --bind 0.0.0.0
```

och öppna datorns LAN-IP på port 8080.

## Docker

```bash
docker build -t jaktkalender .
docker run --rm -p 8080:80 jaktkalender
```

## Coolify

1. Skapa en ny resurs från GitHub-repot.
2. Välj Dockerfile-baserad deploy.
3. Intern port är `80`.
4. Lägg till önskad domän/subdomän.
5. Deploy.

Inga environment variables behövs.

## Geografiska specialområden

Vanliga län/kommuner hämtas från platsvalet. Några fasta jaktgeografier följer inte vanliga kommungränser, exempelvis gränsälvsområdet, lappmarksgränsen, odlingsgränsen och kronhjortsområden. För dessa finns explicita val i platsdialogen när de är relevanta. Det undviker att sidan låtsas ha större geografisk precision än kart-/adressuppgiften faktiskt ger.
