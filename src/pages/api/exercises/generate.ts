import { NextApiRequest, NextApiResponse } from "next";
import { dbConnect } from "../../../lib/mongodb";
import { IExercise } from "../../../models/Exercise";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    await dbConnect();
    if (req.method !== "POST") {
        return res.status(405).json({ error: "Método no permitido" });
    }
    try {
        const { dayExercises, exerciseToChangeId } = req.body;

        if (!dayExercises || !exerciseToChangeId) {
            return res.status(400).json({ error: "Faltan parámetros requeridos" });
        }
        const token = req.cookies.token || req.headers.authorization?.split(" ")[1];
        if (!token) return res.status(401).json({ message: "No autenticado" });

        const prompt = `
        Cambia un ejercicio en una rutina de entrenamiento diaria basada en la siguiente información:
        - Ejercicios actuales del día: ${JSON.stringify(dayExercises)}
        - Ejercicio a cambiar: el que tiene "_id": "${exerciseToChangeId}"
        **Instrucciones:**
        - Genera 5 opciones de ejercicios diferentes que puedan reemplazar al indicado por "_id": "${exerciseToChangeId}".
        - Cada opción debe:
        - Trabajar los mismos "muscleGroup" que el ejercicio original.
        - Ser única: no debe coincidir con el "name" de ningún otro ejercicio en "exercises" del día ni entre las 5 opciones.
        - Mantener un estilo similar al original:
            - "sets", "reps", "weight", "weightUnit", "rest" deben ser idénticos o muy cercanos al ejercicio a cambiar.
        - Formato de cada opción: "name" (string), "muscleGroup" (array), "sets" (number), "reps" (number), "repsUnit" ("count"), "weight" (string), "weightUnit" ("kg"), "rest" (string), "tips" (array con 2 consejos), "completed" (false), "videos" (array vacío), "notes" (string vacío).
        - Incluye "_id" como string ficticio único para cada opción (ej. "exercise_new_1", "exercise_new_2", etc.).
        **Formato JSON estricto:**
        - Devuelve SOLO un array JSON con 5 objetos, sin texto adicional, sin bloques de código, sin comentarios.
        `;

        const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${process.env.GROQ_API_KEY}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                model: "llama-3.3-70b-versatile",
                messages: [
                    { role: "system", content: "Eres un experto en fitness que genera ejercicios precisos en JSON." },
                    { role: "user", content: prompt },
                ],
                max_tokens: 5000,
                temperature: 0.4,
            }),
        });

        if (!response.ok) throw new Error(`Error ${response.status}: ${response.statusText}`);
        const data = await response.json();
        let content = data.choices[0]?.message.content.trim();
        if (content.startsWith("```json")) content = content.slice(7, -3).trim();
        const newExercise = JSON.parse(content);
        //videos
        const YOUTUBE_API_KEY = process.env.NEXT_PUBLIC_YOUTUBE_API_KEY || "TU_CLAVE_API_YOUTUBE";
        const newExerciseVideos = await Promise.all(
            newExercise.map(async (exercise: Partial<IExercise>) => {
                const { name } = exercise;
                const response = await fetch(
                    `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(
                        name + " exercise tutorial"
                    )}&type=video&key=${YOUTUBE_API_KEY}`
                );
                const data = await response.json();
                const videoId = data.items[0]?.id.videoId;
                return {
                    ...exercise,
                    _id: exerciseToChangeId,
                    videoUrl: videoId ? `https://www.youtube.com/embed/${videoId}` : "https://www.youtube.com/embed/dQw4w9WgXcQ", // Fallback
                };
            })
        );


        res.status(200).json(newExerciseVideos);
    } catch (error) {
        console.error("Error al cambiar ejercicio:", error);
        res.status(500).json({ error: "Error interno del servidor" });
    }
}
