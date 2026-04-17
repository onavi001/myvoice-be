# MyVoice Backend (Express.js + TypeScript)

## Estructura
- `src/models/` — Modelos de Mongoose
- `src/routes/` — Rutas de la API
- `src/controllers/` — Lógica de negocio
- `src/utils/` — Utilidades (MongoDB, email, etc.)
- `src/config/` — Configuración/env
- `src/middleware/` — Middlewares

## Scripts
- `npm run dev` — Desarrollo con nodemon
- `npm run build` — Compilar TypeScript
- `npm start` — Ejecutar build

## Configuración
1. Copia `.env.example` a `.env` y ajusta tus variables.
2. Instala dependencias: `npm install`
3. Inicia el servidor: `npm run dev`

## Endpoints de ejemplo
- `GET /api/users` — Listar usuarios
- `POST /api/users` — Crear usuario

---
Listo para expandir con más rutas, controladores y utilidades.
