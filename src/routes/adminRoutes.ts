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
import { requireAuth, requireRole } from '../middleware/auth';

const router = Router();

/** Usuario autenticado: ver y enviar solicitud para ser coach */
router.get('/user', requireAuth, getUserCoachRequest);
router.post('/coach-requests', requireAuth, createCoachRequest);

/** Solo administradores */
router.use(requireAuth, requireRole('admin'));
router.get('/users', listUsers);
router.put('/users/:id', updateUser);
router.get('/coach-requests', listCoachRequests);
router.post('/coach-requests/:requestId/approve', approveCoachRequest);
router.post('/coach-requests/:requestId/reject', rejectCoachRequest);

export default router;
