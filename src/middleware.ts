import { NextResponse } from "next/server";

export function middleware(request: Request) {
  const response = NextResponse.next();

  // Permitir el origen del FE en desarrollo
  response.headers.set("Access-Control-Allow-Origin", "http://localhost:5173"); // Cambia a tu dominio en producción
  response.headers.set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  response.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
  response.headers.set("Access-Control-Allow-Credentials", "true"); // Si usas cookies

  // Manejar solicitudes OPTIONS
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: response.headers });
  }

  return response;
}

export const config = {
  matcher: "/api/:path*", // Aplica a todas las rutas API
};