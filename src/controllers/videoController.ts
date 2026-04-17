import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import Video from '../models/Video';

function getUserIdFromRequest(req: Request): string | null {
  const token = req.cookies?.token || req.headers.authorization?.split(' ')[1];
  if (!token) return null;
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'my-super-secret-key') as { userId: string };
    return decoded.userId;
  } catch {
    return null;
  }
}

// GET /api/videos?exerciseName=... - Buscar videos de YouTube
export const searchVideos = async (req: Request, res: Response) => {
  const userId = getUserIdFromRequest(req);
  if (!userId) return res.status(401).json({ message: 'No autenticado' });
  try {
    const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY || '';
    const { exerciseName } = req.query;
    if (!exerciseName) return res.status(400).json({ error: 'Faltan parámetros requeridos' });
    const response = await fetch(
      `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(
        `${exerciseName} técnica de ejercicio`
      )}&type=video&maxResults=5&key=${YOUTUBE_API_KEY}`
    );
    const data = await response.json();
    if (data.items && data.items.length > 0) {
      const videoUrls = data.items.map((item: { id: { videoId: string } }) => `https://www.youtube.com/embed/${item.id.videoId}`);
      return res.status(200).json(videoUrls.map((url: string, idx: number) => ({ url, isCurrent: idx === 0 })));
    }
    res.status(200).json([]);
  } catch (error) {
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// POST /api/videos - Crear video
export const createVideo = async (req: Request, res: Response) => {
  const userId = getUserIdFromRequest(req);
  if (!userId) return res.status(401).json({ message: 'No autenticado' });
  try {
    const { url, isCurrent } = req.body;
    if (!url) return res.status(400).json({ message: 'URL es requerida' });
    const video = new Video({ url, isCurrent });
    await video.save();
    res.status(201).json(video);
  } catch (error) {
    res.status(500).json({ message: 'Error al crear video', error });
  }
};

// PUT /api/videos/:id - Actualizar video
export const updateVideo = async (req: Request, res: Response) => {
  const userId = getUserIdFromRequest(req);
  if (!userId) return res.status(401).json({ message: 'No autenticado' });
  const { id } = req.params;
  try {
    const { url, isCurrent } = req.body;
    const video = await Video.findByIdAndUpdate(id, { url, isCurrent }, { new: true, runValidators: true });
    if (!video) return res.status(404).json({ message: 'Video no encontrado' });
    res.status(200).json(video);
  } catch (error) {
    res.status(500).json({ message: 'Error al actualizar video' });
  }
};

// DELETE /api/videos/:id - Eliminar video
export const deleteVideo = async (req: Request, res: Response) => {
  const userId = getUserIdFromRequest(req);
  if (!userId) return res.status(401).json({ message: 'No autenticado' });
  const { id } = req.params;
  try {
    const video = await Video.findByIdAndDelete(id);
    if (!video) return res.status(404).json({ message: 'Video no encontrado' });
    res.status(204).end();
  } catch (error) {
    res.status(500).json({ message: 'Error al eliminar video' });
  }
};
