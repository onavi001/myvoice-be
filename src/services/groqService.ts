import { GROQ_API_KEY } from '../config';

interface GroqChatResponse {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
}

async function fetchWithTimeout(url: string, options: RequestInit, timeoutMs: number) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

export async function requestGroqJson(prompt: string): Promise<string | null> {
  if (!GROQ_API_KEY) return null;

  const payload = {
    model: 'llama-3.3-70b-versatile',
    temperature: 0.5,
    messages: [
      {
        role: 'system',
        content: 'Eres un entrenador experto. Devuelves solo JSON valido.',
      },
      {
        role: 'user',
        content: prompt,
      },
    ],
  };

  // Retry simple para mejorar resiliencia ante fallos transitorios.
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const response = await fetchWithTimeout(
      'https://api.groq.com/openai/v1/chat/completions',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${GROQ_API_KEY}`,
        },
        body: JSON.stringify(payload),
      },
      15000
    );

    if (!response.ok) {
      if (attempt === 1) {
        throw new Error(`Groq request failed with status ${response.status}`);
      }
      continue;
    }

    const json = (await response.json()) as GroqChatResponse;
    const content = json?.choices?.[0]?.message?.content;
    if (content && typeof content === 'string') {
      return content;
    }
  }

  return null;
}

