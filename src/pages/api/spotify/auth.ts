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
  const { code, redirect_uri } = req.query;

  if (!code || !redirect_uri) {
    return res.status(400).json({ error: "Faltan parámetros code o redirect_uri" });
  }

  try {
    const response = await fetch("https://accounts.spotify.com/api/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code: code as string,
        redirect_uri: redirect_uri as string,
        client_id: process.env.SPOTIFY_CLIENT_ID!,
        client_secret: process.env.SPOTIFY_CLIENT_SECRET!,
      }).toString(),
    });

    if (!response.ok) {
      throw new Error(`Error de Spotify: ${response.statusText}`);
    }

    const data = (await response.json()) as SpotifyTokenResponse;
    return res.status(200).json(data);
  } catch (error) {
    console.error("Error en autenticación Spotify:", error);
    return res.status(500).json({ error: "Error en autenticación" });
  }
}