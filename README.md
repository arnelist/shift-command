# Shift Command

Pamainos vadovams (SM) skirtas valdymo skydelis, vienoje vietoje pateikiantis pamainos būklę ir kitos dienos grafiką.

## Funkcijos

- **SLA Watch** – aktyvi užklausa, kuriai liko mažiausiai laiko iki 24 val. SLA termino.
- **Current shift performance** – agentų workflow (išspręsta per grynąją darbo valandą), pamainos efektyvumas ir chat SLA pažeidimai (> 60 s); lentelę galima rikiuoti.
- **Breach dispute** – agento chat SLA pažeidimų peržiūra ir ginčo pateikimas Data komandai.
- **Last shift report** – praėjusios pamainos rodikliai su būsenomis („On target“, „Watch“, „Needs review“).
- **This month's results** – mėnesio WF, CSAT, išsprendimo rodiklis ir vidutinė pokalbio trukmė.
- **Next-Day Scheduler** – kitos dienos vakarinės pamainos grafikas: SM / Temp-SM parinkimas, pietų pertraukos, chat'ų dalys, papildomos užduotys ir Slack žinutės tekstas.
- **Prieiga tik SM** – HTTP Basic autentifikacija.

## Technologijos

Node.js, Express.js 5, HTML, CSS, JavaScript (Fetch API).

## Paleidimas

Reikia Node.js 20.6 ar naujesnės versijos.

```bash
npm install
cd backend
```

Sukurkite `backend/.env` failą su SM paskyromis (`vardas:slaptažodis`, atskirtos kableliais):

```
SM_USERS=vardas1:slaptazodis1,vardas2:slaptazodis2
```

Paleiskite serverį ir atidarykite http://localhost:3001:

```bash
node --env-file=.env server.js
```

## Struktūra

```
backend/
  server.js        REST API ir vartotojo sąsajos teikimas
  config.js        ataskaitos laiko taškas
  middleware/      prieigos kontrolė
  services/        verslo logika (SLA, našumas, ataskaitos, grafikas, ginčai)
  data/            Zendesk, Workofo ir Looker duomenų sluoksnis
frontend/
  index.html, style.css, app.js
```

## API

| Metodas | Adresas | Aprašymas |
|---|---|---|
| GET | `/api/sla-watch` | Artimiausias SLA pažeidimas |
| GET | `/api/performance` | Pamainos efektyvumas ir agentų rodikliai |
| GET | `/api/last-shift` | Praėjusios pamainos ataskaita |
| GET | `/api/monthly` | Mėnesio rezultatai |
| GET | `/api/next-day-schedule` | Kitos dienos grafikas |
| GET | `/api/agents/:agentId/breaches` | Agento chat SLA pažeidimai |
| POST | `/api/disputes` | Ginčo pateikimas |
