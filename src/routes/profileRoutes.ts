import { Router } from 'express';
import { getProfile, updateProfile } from '../controllers/profileController';

const router = Router();

/**
 * @openapi
 * /api/profile:
 *   get:
 *     summary: Obtener el perfil del usuario autenticado
 *     responses:
 *       200:
 *         description: Perfil del usuario
 *   put:
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

router.get('/', getProfile);
router.put('/', updateProfile);

export default router;
