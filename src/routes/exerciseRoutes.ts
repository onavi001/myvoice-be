import { Router } from 'express';
import { updateExercise } from '../controllers/exerciseController';

const router = Router();

/**
 * @openapi
 * /api/exercises/{id}:
 *   put:
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

router.put('/:id', updateExercise);

export default router;
