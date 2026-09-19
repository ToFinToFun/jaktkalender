# Jaktkalender

En visuell svensk jaktkalender som visar **när jaktsäsonger infaller** för vald plats.

## Projektets scope

Jaktkalendern ska visa:

- vilka arter som har jaktsäsong under olika delar av året
- geografiska skillnader i fasta jakttider
- fasta skillnader för kön/ålder när de påverkar säsongen
- fasta dygnsbegränsningar
- solberoende tider beräknade för vald plats
- fasta delperioder, till exempel "endast smyg- eller vaktjakt"
- fasta nationella tidsramar för licensjakt på stora rovdjur

Jaktkalendern ska **inte** avgöra om jakt är tillåten för en viss person vid ett visst tillfälle.

Den ska därför inte följa eller bedöma:

- tilldelningar och kvoter
- avlysningar när kvoten är fylld
- personliga tillstånd
- jakträtt
- tillfälliga skyddsjaktsbeslut
- vapen- eller ammunitionsregler
- andra villkor som inte definierar själva säsongen eller tiden på dygnet

Tanken är att sidan ska vara relevant både för jägare och andra som vill kunna se exempelvis att det är älg-, rådjur- eller björnjaktsäsong på en viss plats.

## Arbetsordning

1. Verifiera och strukturera samtliga fasta jakttider från officiella källor.
2. Identifiera geografiska och tidsmässiga specialfall.
3. Låsa datamodellen.
4. Låsa plats- och solmodellen.
5. Ta fram visuell design.
6. Bygga responsiv webbapp för mobil och desktop.
7. Driftsätta via Coolify.

Se [docs/rule-audit.md](docs/rule-audit.md) för regelgranskningen.

## Status

**Fas 1: regelgranskning pågår. Ingen UI-kod är påbörjad ännu.**
