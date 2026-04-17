import { Router } from 'express';
import {
  listCoaches,
  requestCoach,
  getCoachRequests,
  acceptCoachRequest,
  rejectCoachRequest,
} from '../controllers/coachController';

/**
 * @openapi
 * /api/coaches:
 *   get:
 *     summary: Listar coaches
 *     responses:
 *       200:
 *         description: Lista de coaches
 * /api/coaches/requests:
 *   post:
 *     summary: Solicitar coach (usuario)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       201:
 *         description: Solicitud enviada
 *   get:
 *     summary: Ver solicitudes pendientes (coach)
 *     responses:
 *       200:
 *         description: Lista de solicitudes
 * /api/coaches/accept:
 *   post:
 *     summary: Aceptar solicitud de coach
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       201:
 *         description: Solicitud aceptada
 * /api/coaches/reject:
 *   post:
 *     summary: Rechazar solicitud de coach
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       201:
 *         description: Solicitud rechazada
 */

const router = Router();

router.get('/', listCoaches);
router.post('/requests', requestCoach);
router.get('/requests', getCoachRequests);
router.post('/accept', acceptCoachRequest);
router.post('/reject', rejectCoachRequest);

export default router;
