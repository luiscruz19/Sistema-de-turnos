import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import dotenv from 'dotenv';
import sequelize from '../db/sequelize.js';
import routes from '../routes/index.js';
import notFound from '../middlewares/not-found.js';
import Authorization from '../middlewares/authorization.js';
import Debug from '../middlewares/debug.js';
import { listByUser, provision, searchByUserId } from '../controllers/administrator/administrator.js';

dotenv.config();

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(bodyParser.json());

app.use(Authorization);
app.use(Debug);

// Endpoints de sistema (sin prefijo de rol)
app.get('/system/administrators/by-user/:user_id', listByUser);
app.get('/system/administrators/get-by-user-id/:user_id', searchByUserId);
app.post('/system/administrators/provision', provision);

// Database connection
sequelize.authenticate()
    .then(() => console.log('Conexion a base de datos establecida (Turnos - Usuarios)'))
    .catch(err => console.error('Error conectando a la base de datos:', err));

// Routes
app.use('/', routes);

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'OK', service: 'turnos-usuarios' });
});

// 404 Handler (ultimo middleware)
app.use(notFound);

export default app;
