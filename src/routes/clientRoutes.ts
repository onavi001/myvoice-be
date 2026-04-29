import { Router } from 'express';
import {
  listClients,
  getClientProfile,
  updateClientProfile,
  listClientRoutines,
  assignClientRoutine,
} from '../controllers/coachController';

const router = Router();

router.get('/', listClients);
router.get('/:clientId', getClientProfile);
router.put('/:clientId', updateClientProfile);
router.get('/:clientId/routines', listClientRoutines);
router.post('/:clientId/routines', assignClientRoutine);

export default router;
