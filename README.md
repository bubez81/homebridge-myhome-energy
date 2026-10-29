# Homebridge MyHome Eve

Misuratori BTicino MyHome OpenWebNet WHO=18, con letture HAP per Eve e letture standard Matter. Il plugin supporta inoltre i dispositivi MyHome elencati nella schermata di configurazione.

## Configurazione dei misuratori

Ogni `MHPowerMeter` usa un indirizzo OpenWebNet univoco. Il polling legge potenza e totale energetico ogni 60 secondi; potenza in W ed energia in kWh sono convertite nelle milliunità richieste da Matter. Gli aggiornamenti Matter vengono serializzati per misuratore.

`matterDeviceType` seleziona esclusivamente la rappresentazione Matter:

- `outlet` (predefinito): presa virtuale con letture, per compatibilità con le tessere Casa. Non comanda il circuito e i comandi ON/OFF sono fittizi.
- `electricalMeter`: contatore nativo senza ON/OFF. Richiede l'API ElectricalMeter di Homebridge, verificata dalla 2.4.1-beta.17. Cambiare tipo può modificare la presentazione in Casa e lasciare temporaneamente vecchie tessere.

`matterDiagnostics: true` registra le letture inviate a Matter. Non registra password.

## Topologia standard e limiti Apple Casa

Il plugin non personalizza PowerTopology: Homebridge compone i cluster elettrici e applica il proprio standard TREE. Ogni misuratore è un accessorio separato senza endpoint figli. Non viene dichiarata alcuna gerarchia fra generale ed elettrodomestici. Nome e indirizzo non assegnano ruoli elettrici.

La comparsa nell'elenco Energia non garantisce che Casa sommi i contatori o riconosca consumi già inclusi. Nelle prove con due ElectricalMeter è stata osservata un'alternanza dei valori, non una somma affidabile. Questo plugin non promette deduplicazione né calcola un totale aggregato.

## Migrazione 1.2.0

Eliminati `matterPowerTopologyExperiment`, `matterPowerTopologyDiagnostics`, `matterPowerTopology` e il controllo sperimentale `matterTopology`. Le vecchie configurazioni vengono normalizzate in memoria: il flag diagnostico diventa `matterDiagnostics`; le personalizzazioni topologiche vengono rimosse. I tipi già scelti restano invariati; quelli omessi restano `outlet`. Salvare una configurazione migrata elimina i campi obsoleti dal file.

Restano invariati UUID, indirizzi, seriali e credenziali del bridge. Homebridge può ricostruire gli endpoint con le caratteristiche standard; la migrazione SET→TREE viene testata con cache reale e riavvii. La visualizzazione Apple resta una verifica sul controller.

Non cancellare i dati di pairing o la cache per questa migrazione. Lo script `scripts/repair-power-topology-cache.js` è conservato solo per riparazioni storiche della 1.1.16, non fa parte della normale migrazione.

## Verifica

`npm test` esegue i test locali. Impostando `HOMEBRIDGE_TEST_ROOT` al percorso del pacchetto Homebridge installato si includono prove isolate con Matter reale, senza usare storage e abbinamenti di produzione.
