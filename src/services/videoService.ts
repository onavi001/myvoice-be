import Video from '../models/Video';

type ServiceError = { ok: false; status: number; message: string; details?: unknown };
type ServiceOk<T> = { ok: true; data: T };
type ServiceResult<T> = ServiceOk<T> | ServiceError;

export async function searchVideosService(exerciseName: string): Promise<ServiceResult<Array<{ url: string; isCurrent: boolean }>>> {
  const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY || process.env.NEXT_PUBLIC_YOUTUBE_API_KEY || '';
  if (!YOUTUBE_API_KEY) return { ok: false, status: 500, message: 'Falta configurar YOUTUBE_API_KEY en el backend' };

  const response = await fetch(
    `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(
      `${exerciseName} tecnica de ejercicio en español`
    )}&type=video&maxResults=5&key=${YOUTUBE_API_KEY}`
  );

  if (!response.ok) {
    const upstreamError = await response.text();
    return { ok: false, status: 502, message: 'Error al consultar YouTube', details: upstreamError };
  }

  const data = await response.json();
  if (!data.items || data.items.length === 0) return { ok: true, data: [] };

  const videoUrls = data.items.map((item: { id: { videoId: string } }) => `https://www.youtube.com/embed/${item.id.videoId}`);
  return {
    ok: true,
    data: videoUrls.map((url: string, idx: number) => ({ url, isCurrent: idx === 0 })),
  };
}

export async function createVideoService(input: { url?: string; isCurrent?: boolean }): Promise<ServiceResult<unknown>> {
  const { url, isCurrent } = input;
  if (!url) return { ok: false, status: 400, message: 'URL es requerida' };
  const video = new Video({ url, isCurrent });
  await video.save();
  return { ok: true, data: video };
}

export async function updateVideoService(
  id: string,
  input: { url?: string; isCurrent?: boolean }
): Promise<ServiceResult<unknown>> {
  const { url, isCurrent } = input;
  const video = await Video.findByIdAndUpdate(id, { url, isCurrent }, { new: true, runValidators: true });
  if (!video) return { ok: false, status: 404, message: 'Video no encontrado' };
  return { ok: true, data: video };
}

export async function deleteVideoService(id: string): Promise<ServiceResult<{ id: string }>> {
  const video = await Video.findByIdAndDelete(id);
  if (!video) return { ok: false, status: 404, message: 'Video no encontrado' };
  return { ok: true, data: { id } };
}
