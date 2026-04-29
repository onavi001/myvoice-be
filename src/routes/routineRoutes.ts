import { Router } from 'express';
import {
  listRoutines,
  createRoutine,
  getRoutine,
  updateRoutine,
  deleteRoutine,
  addDayToRoutine,
  resetRoutineProgress,
  generateRoutine,
} from '../controllers/routineController';
import { requireAuth } from '../middleware/auth';

const router = Router();
router.use(requireAuth);

/**
 * @openapi
 * /api/routines:
 *   get:
 *     tags: [Routines]
 *     summary: Listar rutinas del usuario o coach
 *     responses:
 *       200:
 *         description: Lista de rutinas
 * /api/routines/{routineId}:
 *   get:
 *     tags: [Routines]
 *     summary: Obtener rutina por ID
 *     parameters:
 *       - in: path
 *         name: routineId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Rutina encontrada
 *   put:
 *     tags: [Routines]
 *     summary: Actualizar rutina
 *     parameters:
 *       - in: path
 *         name: routineId
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
 *         description: Rutina actualizada
 * /api/routines/{routineId}/days:
 *   post:
 *     tags: [Routines]
 *     summary: Agregar día a rutina
 *     parameters:
 *       - in: path
 *         name: routineId
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
 *       201:
 *         description: Día agregado
 */

router.get('/', listRoutines);
router.post('/', createRoutine);
router.post('/generate', generateRoutine);
router.get('/:routineId', getRoutine);
router.put('/:routineId', updateRoutine);
router.put('/:routineId/reset', resetRoutineProgress);
router.delete('/:routineId', deleteRoutine);
router.post('/:routineId/days', addDayToRoutine);

export default router;
