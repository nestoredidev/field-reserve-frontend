# Field Reserve · Frontend

Frontend (Next.js 16 + Tailwind 4) del sistema de reservas de canchas y bodega. Consume la API
`/api/v2` de `field-reserve-backend` (Spring Boot) y usa la paleta de Angular Material 12
(tema *indigo-pink*).

## Desarrollo

```bash
pnpm install
pnpm dev
```

El backend debe estar en `http://localhost:8080`. Next.js reenvía `/api/v2/*` a esa URL
(`next.config.ts`), así que no hace falta CORS. Para otra URL:

```bash
BACKEND_URL=http://otro-host:8080 pnpm dev
```

Usuario inicial: `admin` con la contraseña de `app.bootstrap.admin-password` del backend.

## Pantallas

| Ruta | Endpoints |
| --- | --- |
| `/login` | `POST /auth/login`, `GET /auth/me` |
| `/` | resumen del día: reservas, cajas, stock bajo, `reportes/resumen-general` (ADMIN) |
| `/reservas`, `/reservas/[id]` | `reservas`, `reservas/disponibilidad`, pagos, reprogramar, cancelar, no-asistió, completar, monto, `mantenimientos` |
| `/clientes` | `clientes` (búsqueda, alta, edición, historial de reservas) |
| `/caja`, `/bodega/caja` | `cancha/cajas`, `bodega/cajas` (abrir, movimientos, cerrar, historial) |
| `/canchas` | `canchas`, `canchas/{id}/tarifas`, `tarifas/{id}` |
| `/bodega/ventas` | punto de venta y historial de `bodega/ventas` |
| `/bodega/productos` | `bodega/productos`, `bodega/inventario` (ajustes y kardex) |
| `/bodega/compras` | `bodega/compras` |
| `/bodega/categorias`, `/bodega/proveedores` | CRUD |
| `/reportes`, `/usuarios` | solo ADMIN |

## Estructura

- `lib/api.ts`: cliente HTTP con JWT (guardado en `localStorage`) y todos los endpoints.
- `lib/types.ts`: tipos de los DTOs del backend.
- `components/ui.tsx`: componentes estilo Angular Material (botones, campos, tablas, diálogos, snackbar).
- `app/(app)/*`: pantallas protegidas dentro del layout con barra y menú lateral.
