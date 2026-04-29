# MyVoice Backend

API REST de MyVoice para autenticación, usuarios, rutinas, progreso, coaches y generación asistida por IA.

## Propósito

El backend centraliza la lógica de negocio de la plataforma:

- autenticación y autorización con JWT,
- gestión de perfiles y roles (usuario/coach/admin),
- CRUD de rutinas/días/ejercicios/videos,
- seguimiento de progreso,
- endpoints para relaciones coach-cliente,
- integración con IA (Groq) para generación de rutinas.

## Stack técnico

- Node.js + Express
- TypeScript
- MongoDB + Mongoose
- JWT
- Swagger (`/api-docs`)
- Zod (validación)

## Requisitos

- Node.js 18+
- npm 9+
- instancia de MongoDB accesible

## Instalación y ejecución

1. Instalar dependencias:

```bash
npm install
```

2. Configurar variables de entorno en `.env`.

3. Ejecutar en desarrollo:

```bash
npm run dev
```

4. API disponible en:

`http://localhost:4000`

5. Swagger disponible en:

`http://localhost:4000/api-docs`

## Scripts

- `npm run dev`: servidor con nodemon.
- `npm run build`: compila TypeScript a `dist/`.
- `npm start`: ejecuta build compilado.

## Estructura del proyecto

```text
src/
  config/          # Lectura de variables de entorno y constantes globales
  controllers/     # Capa HTTP delgada (req/res, status codes, envelope)
  middleware/      # Error handling, auth y middlewares compartidos
  models/          # Esquemas y modelos Mongoose
  routes/          # Definición de endpoints y documentación Swagger por ruta
  services/        # Lógica de negocio y orquestación por dominio
  validators/      # Esquemas Zod reutilizables por módulo
  utils/           # Conexión DB, correo y utilidades de infraestructura
  index.ts         # Bootstrap de Express, rutas y Swagger
```

## Patrón de arquitectura (Fase 2)

- `routes` define endpoints y middleware por recurso.
- `controllers` valida contexto HTTP y delega al dominio.
- `services` encapsula reglas de negocio, ownership y flujos multi-modelo.
- `validators` centraliza contratos Zod para evitar duplicación entre controladores.
- `utils` contiene infraestructura transversal (DB, correo, respuestas, etc.).

## Módulos principales de API

- `/api/auth`
- `/api/users`
- `/api/profile`
- `/api/admin`
- `/api/coaches`
- `/api/clients`
- `/api/routines`
- `/api/days`
- `/api/exercises`
- `/api/videos`
- `/api/progress`
- `/api/chatBot`

## Variables de entorno recomendadas

Definir al menos:

```env
PORT=4000
MONGO_URI=<mongodb-uri>
JWT_SECRET=<strong-random-secret>
APP_URL=http://localhost:3000
EMAIL_USER=<smtp-user>
EMAIL_PASS=<smtp-pass>
GROQ_API_KEY=<groq-key>
```

Variables opcionales/según feature:

```env
NEXT_PUBLIC_YOUTUBE_API_KEY=<youtube-key>
VAPID_PUBLIC_KEY=<web-push-public-key>
VAPID_PRIVATE_KEY=<web-push-private-key>
```

## Seguridad (importante)

- No subir secretos reales al repositorio.
- Si alguna llave fue expuesta en commits históricos o ejemplos, rotarla inmediatamente.
- Mantener `.env` fuera de control de versiones.

## Convenciones de desarrollo

- Rutas delgadas y controladores con la lógica.
- Respuestas HTTP consistentes.
- Uso de middleware de errores centralizado.
- Documentar endpoints en Swagger al crear/editar rutas.
