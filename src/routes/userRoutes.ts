import { Router } from 'express';
import { getUsers, createUser } from '../controllers/userController';

const router = Router();

/**
 * @openapi
 * /api/users:
 *   get:
 *     summary: Obtener todos los usuarios (solo admin)
 *     responses:
 *       200:
 *         description: Lista de usuarios
 *   post:
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
 */

router.get('/', getUsers);
router.post('/', createUser);

export default router;
