import { Router } from 'express';
import { listProgress, updateProgress, deleteProgress } from '../controllers/progressController';

const router = Router();

/**
 * @openapi
 * /api/progress:
 *   get:
 *     summary: Listar progreso del usuario
 *     responses:
 *       200:
 *         description: Lista de progreso
 * /api/progress/{id}:
 *   put:
 *     summary: Actualizar progreso
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
 *         description: Progreso actualizado
 *   delete:
 *     summary: Eliminar progreso
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Progreso eliminado
 */

router.get('/', listProgress);
router.put('/:id', updateProgress);
router.delete('/:id', deleteProgress);

export default router;
