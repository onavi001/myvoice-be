# Estructura del Backend (myvoice-be)

- `src/config/` — Configuración centralizada de variables de entorno y constantes.
- `src/lib/` — Utilidades compartidas (conexión a MongoDB, envío de emails, etc).
- `src/models/` — Modelos de datos de Mongoose.
- `src/pages/api/` — Endpoints de la API organizados por dominio.
- `src/styles/` — Estilos globales.

## Notas
- Mantén la lógica de negocio fuera de los endpoints siempre que sea posible.
- Utiliza la configuración centralizada para credenciales y URIs.
- Elimina archivos que no se usen o estén duplicados.
