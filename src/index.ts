
import express from 'express';
import cors from 'cors';
import swaggerUi from 'swagger-ui-express';
// @ts-ignore
import swaggerJSDoc from 'swagger-jsdoc';
import { connectDB } from './utils/mongodb';
import { PORT } from './config';
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
import { errorHandler } from './middleware/errorHandler';


const app = express();

// Configuración de swagger-jsdoc
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'MyVoice API',
      version: '1.0.0',
      description: 'Documentación automática de la API de MyVoice',
    },
    servers: [
      { url: 'http://localhost:4000' }
    ],
  },
  apis: ['./src/routes/*.ts'], // Documenta tus rutas aquí
};
const swaggerSpec = swaggerJSDoc(swaggerOptions);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

app.use(cors());
app.use(express.json());

app.use('/api/users', userRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/coaches', coachRoutes);
app.use('/api/routines', routineRoutes);
app.use('/api/exercises', exerciseRoutes);
app.use('/api/progress', progressRoutes);
app.use('/api/days', dayRoutes);
app.use('/api/videos', videoRoutes);

app.use(errorHandler);

connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
});
