import { NextResponse } from "next/server";

export function middleware(request: Request) {
  const response = NextResponse.next();

  // Permitir solicitudes desde el origen del FE
  response.headers.set("Access-Control-Allow-Origin", "http://localhost:5173"); // Cambia "*" por tu dominio FE en producción
  response.headers.set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  response.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization");

  // Manejar solicitudes OPTIONS (preflight)
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: response.headers });
  }

  return response;
}

export const config = {
  matcher: "/api/:path*", // Aplica a todas las rutas de la API
};