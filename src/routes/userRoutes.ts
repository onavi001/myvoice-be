import { Router } from 'express';
import { getUsers, createUser } from '../controllers/userController';
import { requireAuth, requireRole } from '../middleware/auth';

const router = Router();

/**
 * @openapi
 * /api/users:
 *   get:
 *     tags: [Users]
 *     summary: Obtener todos los usuarios (solo admin)
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de usuarios
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message: { type: string, example: Usuarios obtenidos correctamente }
 *                 data: { type: array, items: { $ref: '#/components/schemas/UserSummary' } }
 *                 error: { type: 'null', example: null }
 *   post:
 *     tags: [Users]
 *     summary: Registrar un nuevo usuario
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
 *     responses:
 *       201:
 *         description: Usuario creado
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message: { type: string, example: Usuario creado }
 *                 data:
 *                   type: object
 *                   properties:
 *                     userId: { type: string, example: 67f0a1b2c3d4e5f678901234 }
 *                 error: { type: 'null', example: null }
 */

router.get('/', requireAuth, requireRole('admin'), getUsers);
router.post('/', createUser);

export default router;
