//client_id: "2da5252b72964073af40409d4b230b87",
//client_secret: "057abfd4b6624342bb8b93222a2c08cf",
import type { NextApiRequest, NextApiResponse } from "next";

interface SpotifyTokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
}

interface ErrorResponse {
  error: string;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse<SpotifyTokenResponse | ErrorResponse>) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Método no permitido" });
  }

  const { code, redirect_uri } = req.query;

  if (!code || !redirect_uri) {
    return res.status(400).json({ error: "Faltan parámetros code o redirect_uri" });
  }

  if (typeof code !== "string" || typeof redirect_uri !== "string") {
    return res.status(400).json({ error: "Parámetros code o redirect_uri inválidos" });
  }

  try {
    const response = await fetch("https://accounts.spotify.com/api/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        grant_type: "client_credentials",
        code,
        redirect_uri,
        client_id: "2da5252b72964073af40409d4b230b87",
        client_secret: "057abfd4b6624342bb8b93222a2c08cf",
      }).toString(),
    });

    if (!response.ok) {
      const errorData = await response.json();
      return res.status(response.status).json({ error: errorData.error || response.statusText });
    }

    const data = (await response.json()) as SpotifyTokenResponse;
    return res.status(200).json(data);
  } catch (error) {
    console.error("Error en autenticación Spotify:", error);
    return res.status(500).json({ error: "Error en autenticación" });
  }
}