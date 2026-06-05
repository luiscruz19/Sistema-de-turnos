import app from './www/app.js';
import './db/connection.js';
import CONFIG from './config/config.js';
import { startJobs } from './jobs/index.js';

const PORT = CONFIG.PORT;

app.listen(PORT, () => {
    console.info(`Servidor TURNOS/AGENDA corriendo en "http://localhost:` + PORT + '"');

    // Iniciar jobs programados (recordatorios de turnos)
    startJobs();
});
