import { Router } from 'express';
import {
  listRoutines,
  getRoutine,
  updateRoutine,
  addDayToRoutine
} from '../controllers/routineController';

const router = Router();

/**
 * @openapi
 * /api/routines:
 *   get:
 *     summary: Listar rutinas del usuario o coach
 *     responses:
 *       200:
 *         description: Lista de rutinas
 * /api/routines/{routineId}:
 *   get:
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
router.get('/:routineId', getRoutine);
router.put('/:routineId', updateRoutine);
router.post('/:routineId/days', addDayToRoutine);

export default router;
