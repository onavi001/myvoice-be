import { GROQ_API_KEY } from '../config';

interface GroqChatResponse {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
}

type GroqTextMessage = {
  role: 'system' | 'user';
  content: string;
};

type GroqVisionContentPart =
  | { type: 'text'; text: string }
  | { type: 'image_url'; image_url: { url: string } };

type GroqVisionMessage = {
  role: 'system' | 'user';
  content: string | GroqVisionContentPart[];
};

/** Modelos con vision (el preview 3.2 fue dado de baja en Groq). */
const GROQ_VISION_MODELS = [
  'meta-llama/llama-4-scout-17b-16e-instruct',
  'meta-llama/llama-4-maverick-17b-128e-instruct',
] as const;
const GROQ_TEXT_MODEL = 'llama-3.3-70b-versatile';

async function fetchWithTimeout(url: string, options: RequestInit, timeoutMs: number) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

async function requestGroqCompletion(
  messages: GroqTextMessage[] | GroqVisionMessage[],
  temperature: number,
  model: string,
  timeoutMs: number
): Promise<string | null> {
  if (!GROQ_API_KEY) return null;

  const payload = {
    model,
    temperature,
    messages,
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
      timeoutMs
    );

    if (!response.ok) {
      const errBody = await response.text().catch(() => '');
      console.error(`[Groq] ${model} status ${response.status}:`, errBody.slice(0, 500));
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

export async function requestGroqJson(prompt: string): Promise<string | null> {
  return requestGroqCompletion(
    [
      {
        role: 'system',
        content: 'Eres un entrenador experto. Devuelves solo JSON valido.',
      },
      {
        role: 'user',
        content: prompt,
      },
    ],
    0.5,
    GROQ_TEXT_MODEL,
    15000
  );
}

export async function requestGroqJsonWithVision(
  prompt: string,
  imageDataUrls: string[]
): Promise<string | null> {
  if (!GROQ_API_KEY || imageDataUrls.length === 0) return null;

  const userContent: GroqVisionContentPart[] = [
    { type: 'text', text: prompt },
    ...imageDataUrls.slice(0, 5).map((url) => ({
      type: 'image_url' as const,
      image_url: { url },
    })),
  ];

  const messages: GroqVisionMessage[] = [
    {
      role: 'system',
      content:
        'Eres un entrenador experto. Analizas fotos o capturas de rutinas de entrenamiento. Devuelves SOLO un objeto JSON valido, sin markdown.',
    },
    {
      role: 'user',
      content: userContent,
    },
  ];

  for (const model of GROQ_VISION_MODELS) {
    try {
      const content = await requestGroqCompletion(messages, 0.2, model, 90000);
      if (content) return content;
    } catch (error) {
      console.error(`[Groq] Vision model ${model} failed:`, error);
    }
  }

  return null;
}

export async function requestGroqText(prompt: string, systemInstruction: string): Promise<string | null> {
  return requestGroqCompletion(
    [
      {
        role: 'system',
        content: systemInstruction,
      },
      {
        role: 'user',
        content: prompt,
      },
    ],
    0.4,
    GROQ_TEXT_MODEL,
    15000
  );
}

