import { NextApiRequest, NextApiResponse } from "next";
import { dbConnect } from "../../lib/mongodb";

const cache: { [key: string]: string } = {};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  await dbConnect();
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método no permitido" });
  }
  try {
    const { prompt } = req.body as { prompt: string };
    if (!prompt || typeof prompt !== "string") {
      return res.status(400).json({ error: "Prompt inválido" });
    }

    const cacheKey = prompt;
    if (cache[cacheKey]) {
      return res.status(200).json({ content: cache[cacheKey] });
    }

    const token = req.cookies.token || req.headers.authorization?.split(" ")[1];
    if (!token) return res.status(401).json({ message: "No autenticado" });

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${process.env.GROQ_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",
          messages: [
            { role: "system", content: "Eres un experto en fitness" },
            { role: "user", content: prompt },
          ],
          max_tokens: 500,
          temperature: 0.4,
        }),
    });
    if (!response.ok) throw new Error(`Error ${response.status}: ${response.statusText}`);
    const data = await response.json();
    const content = data.choices[0]?.message.content.trim() || "Sin respuesta";
    cache[cacheKey] = content;

    res.status(200).json({ content });
  } catch (error) {
    console.error("Error al consultar Groq:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
}