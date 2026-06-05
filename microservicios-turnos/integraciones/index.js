import app from './www/app.js';
import './db/connection.js';
import CONFIG from './config/config.js';

const PORT = CONFIG.PORT;

app.listen(PORT, () => {
    console.info('');
    console.info('-'.repeat(100));
    console.info(`Servidor TURNOS/INTEGRACIONES corriendo en "http://localhost:` + PORT + '"');
    console.info('-'.repeat(100));
    console.info('Ultimo cambio: ' + new Date().toString().slice(16, 25).trim() + 'hs');
    console.info('');
});
