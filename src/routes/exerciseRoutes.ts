import { Router } from 'express';
import { updateExercise, deleteExercise, generateExercises } from '../controllers/exerciseController';

const router = Router();

/**
 * @openapi
 * /api/exercises/{id}:
 *   put:
 *     tags: [Exercises]
 *     summary: Actualizar ejercicio
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
 *         description: Ejercicio actualizado
 */

router.post('/generate', generateExercises);
router.put('/:id', updateExercise);
router.delete('/:id', deleteExercise);

export default router;
