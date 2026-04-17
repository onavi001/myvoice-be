import { Router } from 'express';
import { updateDay } from '../controllers/dayController';

const router = Router();

/**
 * @openapi
 * /api/days/{id}:
 *   put:
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

export default router;
