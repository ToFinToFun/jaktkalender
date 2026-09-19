# Regelgranskning

Senast uppdaterad: 2026-09-19

Det här dokumentet är arbetsunderlaget för den statiska regelmotor som ska driva Jaktkalendern. UI byggs först när regeltyperna är verifierade.

## Princip

Kalendern beskriver **säsong och tidsfönster**, inte om en viss jägare har rätt att jaga vid ett visst tillfälle.

Vi tar med regler som direkt formar tidslinjen:

- art
- geografiskt område
- start- och slutdatum
- kön/ålder när det skapar en egen säsongsperiod
- tid på dygnet
- solrelaterad start/slut
- fast följdregel som gäller under en del av tidsfönstret, t.ex. endast smyg-/vaktjakt

Vi tar inte med kvoter, avlysningar, personliga tillstånd, jakträtt, vapenklass, belysning eller andra utföranderegler.

## Primära källor

1. **Jaktförordning (1987:905)**, Sveriges riksdag  
   https://www.riksdagen.se/sv/dokument-och-lagar/dokument/svensk-forfattningssamling/jaktforordning-1987905_sfs-1987-905/

2. **NFS 2022:4 – Naturvårdsverkets föreskrifter om förvaltning av stora rovdjur**  
   https://www.naturvardsverket.se/lagar-och-regler/foreskrifter-och-allmanna-rad/2022/nfs-2022-4/

3. Naturvårdsverkets artsidor används som kontrolläsning, men författningstexten är huvudkälla.

## Bekräftade regeltyper

### Allmän jakt – bilaga 1

Bilaga 1 innehåller de normala allmänna jakttiderna och visar att datamodellen måste kunna hantera:

- hela landet
- grupper av län
- enskilda kommuner
- "övriga delar av landet"
- specialområden, t.ex. gränsälvsområdet
- flera säsongsperioder per art
- kön/ålder som egna perioder
- särskilda jaktformer under vissa delperioder
- ett explicit klockslag i periodstart (gränsälvsområdet: kl. 11.00)
- skottår, 28/29 februari

Exempel på bekräftade specialfall:

- **Rödräv:** flera regionala slutdatum.
- **Bäver:** 15 maj i sex nordliga län, 10 maj i övriga landet.
- **Vildsvin:** årsunge 1 juli–30 juni; övriga vildsvin 1 april–31 januari, med undantag för sugga som följs av små kultingar.
- **Dovhjort:** flera perioder per kön/ålder; vissa endast smyg-/vaktjakt.
- **Rådjur:** hornbärande, kid och generell period skiljer sig; vissa perioder endast smyg-/vaktjakt.
- **Kronhjort:** bilaga 1 och bilaga 3 samverkar beroende på område.
- **Änder/gäss:** flera arter har regionala skillnader och gränsälvsområdet har egen starttid.
- **Dal-/fjällripa:** flera geografiska zoner.
- **Orre/tjäder:** kön och region skapar flera säsongssegment.

### Dygnstider – 9 § jaktförordningen

Följande är verifierat:

- Bläsand, gräsand, ejder, knipa, kricka, sjöorre, storskrake, vigg, bläsgås, grågås, kanadagås, sädgås och vitkindad gås: **1 timme före soluppgång till 1 timme efter solnedgång**.
- Björn: **1 timme före soluppgång till 2 timmar före solnedgång**.
- Varg, järv, lo, älg, dovhjort, kronhjort och rådjur: **1 timme före soluppgång till 1 timme efter solnedgång**.
- För varg, järv, lo, älg, dovhjort, kronhjort och rådjur är timmen efter solnedgång **endast smyg- eller vaktjakt**.
- Arter som inte omfattas av 9 § får inte automatiskt en solbegränsning i vår modell. Exempelvis blir vildsvinets säsongsrad därför dygnstäckande.

### Älg – bilaga 2

Grundregeln har två huvudsakliga säsongsstarter:

- 1 september–31 januari i de områden som räknas upp i bilaga 2.
- 8 oktober–31 januari i övriga delar av landet.

Norrbottens län hör till 1 september–31 januari enligt den gällande bilagan.

Det finns dessutom möjligheter för länsstyrelser att besluta om avvikande start eller uppehåll. Dessa är **inte en del av den statiska kärnan** och ska inte hämtas löpande. Grundperioden i författningen är vad kalendern utgår från.

### Kronhjort – bilaga 3

Bilaga 3 kräver stöd för områdestyp:

- Skåne län inom kronhjortsområden.
- Övriga landet inom kronhjortsskötselområden.
- Bilaga 1 innehåller också kronhjortsregler utanför vissa sådana områden.

Datamodellen måste därför kunna uttrycka områden som inte enbart är kommun/län.

### Stora rovdjur – NFS 2022:4, 5 kap.

Fasta nationella/regionala tidsramar finns i föreskrift:

- **Björn:** beslut om licensjakt ska gälla minst 30 dagar inom 21 augusti–15 oktober. Väster om odlingsgränsen i Norrbotten: minst 20 dagar inom 21 augusti–30 september.
- **Varg:** 2 januari–15 februari.
- **Järv:** 1 oktober–31 december.
- **Lodjur:** 1 mars–15 april i norra rovdjursförvaltningsområdet, 1 mars–31 mars i övriga landet.

För kalendern är detta säsongs-/licensjaktsfönster. Kalendern följer inte kvot eller avlysning.

## Regelversioner

Jaktförordningens nuvarande bilaga 1 och bilaga 2 är markerade att upphöra 2027-07-01 och ersättas av nya versioner samma datum.

Datamodellen ska därför ha:

- `valid_from`
- `valid_to`
- flera versioner av samma regel

Det gör att ett datum i 2026 och ett datum efter 1 juli 2027 kan räknas mot rätt regelpaket.

## Geografier som behöver stöd

Bekräftat behov:

- Sverige
- län
- kommun
- del av kommun
- gränsälvsområdet
- ovan/nedanför lappmarksgränsen
- väster/öster om odlingsgränsen
- inlandsområde/kustområde
- kronhjortsområde/kronhjortsskötselområde
- rovdjursförvaltningsområde
- älgförvaltningsområde kan påverka start i gränsfall

Vissa av dessa kan lösas med statiska polygoner. Några är administrativa jaktområden som inte lämpar sig för vanlig ortsgeokodning och måste hanteras varsamt i UI:t.

## Frågor som ska lösas innan UI byggs

### 1. Björnens visualisering

Den fasta föreskriften anger ett tillåtet **ramfönster** där länsstyrelsens beslut ska ligga; för björn måste beslutet inte omfatta hela ramfönstret.

Förslag: visa raden som "licensjaktsfönster" 21 aug–15 okt (30 sep väster om odlingsgränsen i Norrbotten), inte som ett påstående om ett års beslut.

### 2. Älg – lokala beslut

Bilaga 2 ger en statisk grundperiod men tillåter vissa regionala beslut om jaktstart/upplägg.

Förslag: kalendern visar författningens grundperiod och ignorerar årsvisa/tillfälliga beslut, i linje med projektets scope.

### 3. Administrativa områden

Kronhjortsområden och älgförvaltningsområden kan inte alltid härledas från bara ort + kommun.

Vi behöver besluta om:
- kartlager/polygoner finns i öppna data, eller
- kalendern visar grundregeln för platsen och förklarar att särskilt administrativt område kan ha annan period.

### 4. Polarnatt/midnattssol

Solmotorn måste returnera semantiskt korrekta resultat när solen inte går upp eller inte går ned under ett dygn. Därefter ska regelmotorn tillämpa författningens soluttryck utan att hitta på artificiella klockslag.

Detta ska testas explicit för norra Sverige.

## Nästa steg

1. Transkribera bilaga 1, 2 och 3 till strukturerad regeldata.
2. Transkribera NFS 2022:4:s fasta rovdjurstider.
3. Jämföra regelpaketet före/efter 2027-07-01.
4. Verifiera samtliga geografiska specialfall.
5. Presentera kvarvarande oklarheter innan UI-kod börjar.
