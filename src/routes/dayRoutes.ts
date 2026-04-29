import { Router } from 'express';
import { updateDay, deleteDay, addExerciseToDay, resetDayProgress } from '../controllers/dayController';

const router = Router();

/**
 * @openapi
 * /api/days/{id}:
 *   put:
 *     tags: [Days]
 *     summary: Actualizar día
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
 *         description: Día actualizado
 */

router.put('/:id', updateDay);
router.delete('/:id', deleteDay);
router.put('/:id/reset', resetDayProgress);
router.post('/:id/exercises', addExerciseToDay);

export default router;
