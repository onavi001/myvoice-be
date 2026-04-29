import { Router } from 'express';
import {
  listCoaches,
  requestCoach,
  getCoachRequests,
  acceptCoachRequest,
  rejectCoachRequest,
  listClients,
  getClientProfile,
  updateClientProfile,
  listClientRoutines,
  assignClientRoutine,
} from '../controllers/coachController';

/**
 * @openapi
 * /api/coaches:
 *   get:
 *     tags: [Coaches]
 *     summary: Listar coaches
 *     responses:
 *       200:
 *         description: Lista de coaches
 * /api/coaches/requests:
 *   post:
 *     tags: [Coaches]
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
 *     tags: [Coaches]
 *     summary: Ver solicitudes pendientes (coach)
 *     responses:
 *       200:
 *         description: Lista de solicitudes
 * /api/coaches/accept:
 *   post:
 *     tags: [Coaches]
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
 *     tags: [Coaches]
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
router.get('/clients', listClients);
router.get('/clients/:clientId', getClientProfile);
router.put('/clients/:clientId', updateClientProfile);
router.get('/clients/:clientId/routines', listClientRoutines);
router.post('/clients/:clientId/routines', assignClientRoutine);

export default router;
