import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import dotenv from 'dotenv';
import sequelize from '../db/sequelize.js';
import routes from '../routes/index.js';
import notFound from '../middlewares/not-found.js';
import Authorization from '../middlewares/authorization.js';
import Debug from '../middlewares/debug.js';
import { callback as googleOAuthCallback } from '../controllers/google-calendar/google-calendar.js';

dotenv.config();

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(bodyParser.json());

app.use(Authorization);
app.use(Debug);

// OAuth callback de Google Calendar —
app.get('/system/oauth/google/callback', googleOAuthCallback);


// Database connection
sequelize.authenticate()
    .then(() => console.log('Conexion a base de datos establecida (Turnos - Integraciones)'))
    .catch(err => console.error('Error conectando a la base de datos:', err));

// Routes
app.use('/', routes);

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'OK', service: 'turnos-integraciones' });
});

// 404 Handler
app.use(notFound);

export default app;
