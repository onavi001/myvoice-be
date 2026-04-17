import { Router } from 'express';
import { searchVideos, createVideo, updateVideo, deleteVideo } from '../controllers/videoController';

/**
 * @openapi
 * /api/videos:
 *   get:
 *     summary: Buscar videos de YouTube
 *     parameters:
 *       - in: query
 *         name: exerciseName
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Lista de videos
 *   post:
 *     summary: Crear video
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       201:
 *         description: Video creado
 * /api/videos/{id}:
 *   put:
 *     summary: Actualizar video
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
 *         description: Video actualizado
 *   delete:
 *     summary: Eliminar video
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       204:
 *         description: Video eliminado
 */

const router = Router();

router.get('/', searchVideos);
router.post('/', createVideo);
router.put('/:id', updateVideo);
router.delete('/:id', deleteVideo);

export default router;
