import { Router } from 'express';
import {
  getMyCoachOverview,
  listCoaches,
  getCoachByCode,
  requestCoach,
  requestCoachByCode,
  getCoachProfile,
  markAssignmentSeen,
  leaveCoach,
  getCoachRequests,
  acceptCoachRequest,
  rejectCoachRequest,
} from '../controllers/coachController';
import { requireAuth } from '../middleware/auth';

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
router.get('/code/:code', getCoachByCode);
router.use(requireAuth);
router.get('/profile', getCoachProfile);
router.get('/my-coach', getMyCoachOverview);
router.post('/join', requestCoachByCode);
router.post('/assignments/:routineId/seen', markAssignmentSeen);
router.post('/leave', leaveCoach);
router.post('/requests', requestCoach);
router.get('/requests', getCoachRequests);
router.post('/accept', acceptCoachRequest);
router.post('/reject', rejectCoachRequest);

export default router;
