import { Router } from 'express';
import {
  getProfile,
  updateProfile,
  getTrainingProfile,
  updateTrainingProfile,
} from '../controllers/profileController';
import { requireAuth } from '../middleware/auth';

const router = Router();
router.use(requireAuth);

/**
 * @openapi
 * /api/profile:
 *   get:
 *     tags: [Profile]
 *     summary: Obtener el perfil del usuario autenticado
 *     responses:
 *       200:
 *         description: Perfil del usuario
 *   put:
 *     tags: [Profile]
 *     summary: Actualizar el perfil del usuario autenticado
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               username:
 *                 type: string
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *               oldPassword:
 *                 type: string
 *               bio:
 *                 type: string
 *               goals:
 *                 type: array
 *                 items:
 *                   type: string
 *               notes:
 *                 type: string
 *     responses:
 *       200:
 *         description: Perfil actualizado
 */

/**
 * @openapi
 * /api/profile/training:
 *   get:
 *     tags: [Profile]
 *     summary: Obtener perfil de entrenamiento guardado (sexo, altura, peso, tiempo)
 *     responses:
 *       200:
 *         description: Perfil de entrenamiento o null si aún no existe
 *   put:
 *     tags: [Profile]
 *     summary: Guardar perfil de entrenamiento del usuario
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               biologicalSex:
 *                 type: string
 *                 enum: [masculino, femenino]
 *               heightCm:
 *                 type: number
 *               weightKg:
 *                 type: number
 *               sessionDurationMin:
 *                 type: number
 *     responses:
 *       200:
 *         description: Perfil guardado
 */

router.get('/training', getTrainingProfile);
router.put('/training', updateTrainingProfile);
router.get('/', getProfile);
router.put('/', updateProfile);

export default router;
