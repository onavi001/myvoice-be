import { Router } from 'express';
import {
  listClients,
  getClientProfile,
  updateClientProfile,
  listClientRoutines,
  listClientProgress,
  assignClientRoutine,
  removeClient,
} from '../controllers/coachController';
import { requireAuth, requireRole } from '../middleware/auth';

const router = Router();

router.use(requireAuth, requireRole('coach'));

router.get('/', listClients);
router.get('/:clientId/progress', listClientProgress);
router.get('/:clientId/routines', listClientRoutines);
router.post('/:clientId/routines', assignClientRoutine);
router.get('/:clientId', getClientProfile);
router.put('/:clientId', updateClientProfile);
router.delete('/:clientId', removeClient);

export default router;
