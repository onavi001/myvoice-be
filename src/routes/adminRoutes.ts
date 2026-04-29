import { Router } from 'express';
import {
  listUsers,
  updateUser,
  getUserCoachRequest,
  listCoachRequests,
  createCoachRequest,
  approveCoachRequest,
  rejectCoachRequest,
} from '../controllers/adminController';

const router = Router();

/**
 * @openapi
 * /api/admin/users:
 *   get:
 *     tags: [Admin]
 *     summary: Listar usuarios (solo admin)
 *     responses:
 *       200:
 *         description: Lista de usuarios
 * /api/admin/users/{id}:
 *   put:
 *     tags: [Admin]
 *     summary: Actualizar usuario (solo admin)
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Usuario actualizado
 * /api/admin/user:
 *   get:
 *     tags: [Admin]
 *     summary: Obtener solicitud de coach del usuario autenticado
 *     responses:
 *       200:
 *         description: Solicitud encontrada
 */

// Listar usuarios (solo admin)
router.get('/users', listUsers);
// Actualizar usuario (solo admin)
router.put('/users/:id', updateUser);
// Solicitud de coach del usuario autenticado
router.get('/user', getUserCoachRequest);
router.get('/coach-requests', listCoachRequests);
router.post('/coach-requests', createCoachRequest);
router.post('/coach-requests/:requestId/approve', approveCoachRequest);
router.post('/coach-requests/:requestId/reject', rejectCoachRequest);

export default router;
