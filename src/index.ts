
import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import swaggerUi from 'swagger-ui-express';
// @ts-ignore
import swaggerJSDoc from 'swagger-jsdoc';
import { connectDB } from './utils/mongodb';
import {
  AUTH_RATE_LIMIT_MAX,
  API_RATE_LIMIT_MAX,
  API_RATE_LIMIT_WINDOW_MS,
  PORT,
} from './config';
import userRoutes from './routes/userRoutes';
import authRoutes from './routes/authRoutes';
import profileRoutes from './routes/profileRoutes';
import adminRoutes from './routes/adminRoutes';
import coachRoutes from './routes/coachRoutes';
import routineRoutes from './routes/routineRoutes';
import exerciseRoutes from './routes/exerciseRoutes';
import progressRoutes from './routes/progressRoutes';
import dayRoutes from './routes/dayRoutes';
import videoRoutes from './routes/videoRoutes';
import clientRoutes from './routes/clientRoutes';
import chatBotRoutes from './routes/chatBotRoutes';
import appRoutes from './routes/appRoutes';
import { errorHandler } from './middleware/errorHandler';
import { createCorsOptions } from './utils/corsOptions';


const app = express();

const apiLimiter = rateLimit({
  windowMs: API_RATE_LIMIT_WINDOW_MS,
  max: API_RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Demasiadas solicitudes, intenta nuevamente más tarde', data: null, error: 'RATE_LIMIT_EXCEEDED' },
});

const authLimiter = rateLimit({
  windowMs: API_RATE_LIMIT_WINDOW_MS,
  max: AUTH_RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Demasiados intentos de autenticación, espera unos minutos', data: null, error: 'AUTH_RATE_LIMIT_EXCEEDED' },
  skip: (req) => req.method === 'GET' && req.path === '/verify',
});

// Configuración de swagger-jsdoc
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'MyVoice API',
      version: '1.0.0',
      description: 'Documentación automática de la API de MyVoice',
    },
    tags: [
      { name: 'Auth', description: 'Autenticación y sesión' },
      { name: 'Users', description: 'Gestión de usuarios' },
      { name: 'Profile', description: 'Perfil del usuario autenticado' },
      { name: 'Admin', description: 'Operaciones administrativas' },
      { name: 'Coaches', description: 'Flujo de coach y solicitudes' },
      { name: 'Routines', description: 'Gestión de rutinas' },
      { name: 'Exercises', description: 'Gestión de ejercicios' },
      { name: 'Progress', description: 'Seguimiento de progreso' },
      { name: 'Days', description: 'Días de entrenamiento' },
      { name: 'Videos', description: 'Búsqueda y CRUD de videos' },
      { name: 'App', description: 'Versión mínima y actual de la app móvil' },
    ],
    servers: [
      { url: 'http://localhost:4000' }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
      schemas: {
        ErrorResponse: {
          type: 'object',
          properties: {
            message: { type: 'string', example: 'Error al procesar la solicitud' },
            data: { type: 'null', example: null },
            error: { oneOf: [{ type: 'string' }, { type: 'array' }, { type: 'object' }, { type: 'null' }], example: null },
          },
        },
        UserSummary: {
          type: 'object',
          properties: {
            _id: { type: 'string', example: '67f0a1b2c3d4e5f678901234' },
            username: { type: 'string', example: 'navi' },
            email: { type: 'string', format: 'email', example: 'navi@example.com' },
            role: { type: 'string', example: 'user' },
          },
        },
        AuthLoginData: {
          type: 'object',
          properties: {
            token: { type: 'string', example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' },
            user: { $ref: '#/components/schemas/UserSummary' },
          },
        },
        AuthLoginResponse: {
          type: 'object',
          properties: {
            message: { type: 'string', example: 'Login exitoso' },
            data: { $ref: '#/components/schemas/AuthLoginData' },
            error: { type: 'null', example: null },
          },
        },
        AuthVerifyResponse: {
          type: 'object',
          properties: {
            message: { type: 'string', example: 'Token válido' },
            data: {
              type: 'object',
              properties: {
                user: { $ref: '#/components/schemas/UserSummary' },
              },
            },
            error: { type: 'null', example: null },
          },
        },
        MessageOnlySuccessResponse: {
          type: 'object',
          properties: {
            message: { type: 'string', example: 'Operación exitosa' },
            data: { nullable: true, example: null },
            error: { type: 'null', example: null },
          },
        },
        AuthLoginRequest: {
          type: 'object',
          required: ['email', 'password'],
          properties: {
            email: { type: 'string', format: 'email', example: 'user@example.com' },
            password: { type: 'string', format: 'password', example: '12345678' },
          },
        },
        ForgotPasswordRequest: {
          type: 'object',
          required: ['email'],
          properties: {
            email: { type: 'string', format: 'email', example: 'user@example.com' },
          },
        },
        ResetPasswordRequest: {
          type: 'object',
          required: ['token', 'password'],
          properties: {
            token: { type: 'string', example: 'jwt-reset-token' },
            password: { type: 'string', format: 'password', example: 'newPassword123' },
          },
        },
      },
    },
  },
  apis: ['./src/routes/*.ts'], // Documenta tus rutas aquí
};
const swaggerSpec = swaggerJSDoc(swaggerOptions);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, { explorer: true }));

app.use(cors(createCorsOptions()));
app.use(express.json({ limit: '10mb' }));
app.use('/api', apiLimiter);

app.use('/api/users', userRoutes);
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/coaches', coachRoutes);
app.use('/api/routines', routineRoutes);
app.use('/api/exercises', exerciseRoutes);
app.use('/api/progress', progressRoutes);
app.use('/api/days', dayRoutes);
app.use('/api/videos', videoRoutes);
app.use('/api/clients', clientRoutes);
app.use('/api/chatBot', chatBotRoutes);
app.use('/api/app', appRoutes);

app.use(errorHandler);

void connectDB();

export default app;

if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}
