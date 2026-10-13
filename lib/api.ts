import type {
  ApiEnvelope,
  Caja,
  Cancha,
  Categoria,
  Cliente,
  Compra,
  EstadoCompra,
  EstadoReserva,
  EstadoVenta,
  GananciaProducto,
  LoginResponse,
  MetodoPago,
  MovimientoCaja,
  MovimientoInventario,
  OrigenReserva,
  Page,
  PageParams,
  PagoReserva,
  PagoReservaCommand,
  Producto,
  ProductoCommand,
  Proveedor,
  Reserva,
  ResumenGeneral,
  Rol,
  Slot,
  Tarifa,
  TipoMovimientoCaja,
  TipoMovimientoInventario,
  TipoProducto,
  TipoReserva,
  Usuario,
  Venta,
} from "./types";

const BASE = "/api/v2";
const TOKEN_KEY = "fr.token";

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public errors: string[] = [],
  ) {
    super(message);
  }

  /** Mensaje + detalle de validación, listo para mostrar. */
  get detail(): string {
    return this.errors.length ? `${this.message}: ${this.errors.join("; ")}` : this.message;
  }
}

export function getToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setToken(token: string | null) {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* almacenamiento no disponible */
  }
}

let onUnauthorized: (() => void) | null = null;
export function setUnauthorizedHandler(fn: (() => void) | null) {
  onUnauthorized = fn;
}

type Query = Record<string, string | number | boolean | null | undefined>;

function qs(query?: Query): string {
  if (!query) return "";
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(query)) {
    if (v !== undefined && v !== null && v !== "") params.set(k, String(v));
  }
  const s = params.toString();
  return s ? `?${s}` : "";
}

async function request<T>(method: string, path: string, body?: unknown, query?: Query): Promise<ApiEnvelope<T> | null> {
  const headers: Record<string, string> = { Accept: "application/json" };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  // Sin sesión no tiene sentido llamar a endpoints protegidos (el layout ya redirige a /login).
  else if (path !== "/auth/login") throw new ApiError(401, "No autenticado");
  if (body !== undefined) headers["Content-Type"] = "application/json";

  let res: Response;
  try {
    res = await fetch(`${BASE}${path}${qs(query)}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError(0, "No se pudo conectar con el servidor");
  }

  if (res.status === 204) return null;

  let json: unknown = null;
  const text = await res.text();
  if (text) {
    try {
      json = JSON.parse(text);
    } catch {
      json = null;
    }
  }

  if (!res.ok) {
    const err = (json ?? {}) as { message?: string; errors?: string[] };
    if (res.status === 401 && path !== "/auth/login") onUnauthorized?.();
    const fallback = res.status >= 500 || res.status === 0 ? "Error del servidor" : `Error ${res.status}`;
    throw new ApiError(res.status, err.message || fallback, err.errors ?? []);
  }
  return json as ApiEnvelope<T>;
}

async function one<T>(method: string, path: string, body?: unknown, query?: Query): Promise<T> {
  const env = await request<T>(method, path, body, query);
  return env!.data[0];
}

async function list<T>(path: string, query?: Query): Promise<T[]> {
  const env = await request<T>("GET", path, undefined, query);
  return env?.data ?? [];
}

async function page<T>(path: string, query?: Query): Promise<Page<T>> {
  const env = await request<T>("GET", path, undefined, query);
  return {
    items: env?.data ?? [],
    page: env?.page ?? 0,
    size: env?.size ?? 10,
    totalElements: env?.total_elements ?? 0,
    totalPages: env?.total_pages ?? 0,
  };
}

async function none(method: string, path: string, body?: unknown): Promise<void> {
  await request(method, path, body);
}

type P = PageParams;

export const api = {
  auth: {
    login: (username: string, password: string) =>
      one<LoginResponse>("POST", "/auth/login", { username, password }),
    me: () => one<Usuario>("GET", "/auth/me"),
  },

  usuarios: {
    listar: (p: P) => page<Usuario>("/usuarios", { ...p }),
    obtener: (id: number) => one<Usuario>("GET", `/usuarios/${id}`),
    crear: (c: { nombre: string; username: string; password: string; rol: Rol }) =>
      one<Usuario>("POST", "/usuarios", c),
    actualizar: (id: number, c: { nombre: string; rol: Rol }) => one<Usuario>("PUT", `/usuarios/${id}`, c),
    cambiarPassword: (id: number, password: string) => none("PUT", `/usuarios/${id}/password`, { password }),
    activar: (id: number) => one<Usuario>("PATCH", `/usuarios/${id}/activar`),
    desactivar: (id: number) => one<Usuario>("PATCH", `/usuarios/${id}/desactivar`),
  },

  canchas: {
    listar: (p: P & { activa?: boolean }) => page<Cancha>("/canchas", { ...p }),
    obtener: (id: number) => one<Cancha>("GET", `/canchas/${id}`),
    crear: (c: { nombre: string; descripcion?: string }) => one<Cancha>("POST", "/canchas", c),
    actualizar: (id: number, c: { nombre: string; descripcion?: string }) => one<Cancha>("PUT", `/canchas/${id}`, c),
    activar: (id: number) => one<Cancha>("PATCH", `/canchas/${id}/activar`),
    desactivar: (id: number) => one<Cancha>("PATCH", `/canchas/${id}/desactivar`),
    tarifas: (canchaId: number, soloActivas = true) => list<Tarifa>(`/canchas/${canchaId}/tarifas`, { soloActivas }),
    crearTarifa: (
      canchaId: number,
      c: { diaSemana: number | null; horaInicio: string; horaFin: string; precioHora: number },
    ) => one<Tarifa>("POST", `/canchas/${canchaId}/tarifas`, c),
  },

  tarifas: {
    obtener: (id: number) => one<Tarifa>("GET", `/tarifas/${id}`),
    desactivar: (id: number) => one<Tarifa>("PATCH", `/tarifas/${id}/desactivar`),
    cambiarPrecio: (id: number, precioHora: number) => one<Tarifa>("POST", `/tarifas/${id}/cambiar-precio`, { precioHora }),
  },

  clientes: {
    listar: (p: P & { q?: string }) => page<Cliente>("/clientes", { ...p }),
    obtener: (id: number) => one<Cliente>("GET", `/clientes/${id}`),
    porTelefono: (tel: string) => one<Cliente>("GET", `/clientes/telefono/${encodeURIComponent(tel)}`),
    crear: (c: { nombre: string; telefono: string; notas?: string }) => one<Cliente>("POST", "/clientes", c),
    actualizar: (id: number, c: { nombre: string; telefono: string; notas?: string }) =>
      one<Cliente>("PUT", `/clientes/${id}`, c),
  },

  reservas: {
    listar: (
      p: P & {
        canchaId?: number;
        clienteId?: number;
        estado?: EstadoReserva;
        tipo?: TipoReserva;
        desde?: string;
        hasta?: string;
      },
    ) => page<Reserva>("/reservas", { ...p }),
    disponibilidad: (canchaId: number, fecha: string) => list<Slot>("/reservas/disponibilidad", { canchaId, fecha }),
    obtener: (id: number) => one<Reserva>("GET", `/reservas/${id}`),
    crear: (c: {
      canchaId: number;
      clienteId?: number;
      clienteNombre?: string;
      clienteTelefono?: string;
      inicio: string;
      fin: string;
      origen?: OrigenReserva;
      observacion?: string;
      pagoInicial?: PagoReservaCommand;
    }) => one<Reserva>("POST", "/reservas", c),
    reprogramar: (id: number, inicio: string, fin: string) =>
      one<Reserva>("PUT", `/reservas/${id}/reprogramar`, { inicio, fin }),
    cancelar: (id: number, motivo: string) => one<Reserva>("POST", `/reservas/${id}/cancelar`, { motivo }),
    noAsistio: (id: number) => one<Reserva>("POST", `/reservas/${id}/no-asistio`),
    completar: (id: number) => one<Reserva>("POST", `/reservas/${id}/completar`),
    cambiarMonto: (id: number, monto: number, observacion: string) =>
      one<Reserva>("PATCH", `/reservas/${id}/monto`, { monto, observacion }),
    registrarPago: (id: number, c: PagoReservaCommand) => one<PagoReserva>("POST", `/reservas/${id}/pagos`, c),
    pagos: (id: number) => list<PagoReserva>(`/reservas/${id}/pagos`),
    crearMantenimiento: (c: { canchaId: number; inicio: string; fin: string; motivo: string }) =>
      one<Reserva>("POST", "/mantenimientos", c),
  },

  /** Cajas de cancha (`cancha`) y de bodega (`bodega`) comparten contrato. */
  cajas: (area: "cancha" | "bodega") => {
    const base = `/${area}/cajas`;
    return {
      actual: () => one<Caja>("GET", `${base}/actual`),
      abrir: (montoApertura: number) => one<Caja>("POST", `${base}/abrir`, { montoApertura }),
      cerrar: (montoCierreContado: number, observacion?: string) =>
        one<Caja>("POST", `${base}/cerrar`, { montoCierreContado, observacion }),
      listar: (p: P) => page<Caja>(base, { ...p }),
      obtener: (id: number) => one<Caja>("GET", `${base}/${id}`),
      registrarMovimiento: (c: { tipo: TipoMovimientoCaja; metodo: MetodoPago; concepto: string; monto: number }) =>
        one<MovimientoCaja>("POST", `${base}/movimientos`, c),
      movimientos: (id: number, p: P) => page<MovimientoCaja>(`${base}/${id}/movimientos`, { ...p }),
    };
  },

  categorias: {
    listar: (p: P) => page<Categoria>("/bodega/categorias", { ...p }),
    crear: (nombre: string) => one<Categoria>("POST", "/bodega/categorias", { nombre }),
    actualizar: (id: number, nombre: string) => one<Categoria>("PUT", `/bodega/categorias/${id}`, { nombre }),
    eliminar: (id: number) => none("DELETE", `/bodega/categorias/${id}`),
  },

  proveedores: {
    listar: (p: P & { q?: string; activo?: boolean }) => page<Proveedor>("/bodega/proveedores", { ...p }),
    crear: (c: { nombre: string; ruc?: string; telefono?: string }) => one<Proveedor>("POST", "/bodega/proveedores", c),
    actualizar: (id: number, c: { nombre: string; ruc?: string; telefono?: string }) =>
      one<Proveedor>("PUT", `/bodega/proveedores/${id}`, c),
    activar: (id: number) => one<Proveedor>("PATCH", `/bodega/proveedores/${id}/activar`),
    desactivar: (id: number) => one<Proveedor>("PATCH", `/bodega/proveedores/${id}/desactivar`),
  },

  productos: {
    listar: (p: P & { q?: string; categoriaId?: number; tipo?: TipoProducto; activo?: boolean }) =>
      page<Producto>("/bodega/productos", { ...p }),
    stockBajo: () => list<Producto>("/bodega/productos/stock-bajo"),
    porCodigoBarras: (codigo: string) =>
      one<Producto>("GET", `/bodega/productos/codigo-barras/${encodeURIComponent(codigo)}`),
    obtener: (id: number) => one<Producto>("GET", `/bodega/productos/${id}`),
    crear: (c: ProductoCommand) => one<Producto>("POST", "/bodega/productos", c),
    actualizar: (id: number, c: ProductoCommand) => one<Producto>("PUT", `/bodega/productos/${id}`, c),
    activar: (id: number) => one<Producto>("PATCH", `/bodega/productos/${id}/activar`),
    desactivar: (id: number) => one<Producto>("PATCH", `/bodega/productos/${id}/desactivar`),
  },

  inventario: {
    ajustar: (c: { productoId: number; tipo: TipoMovimientoInventario; cantidad: number; motivo: string }) =>
      one<MovimientoInventario>("POST", "/bodega/inventario/ajustes", c),
    movimientos: (p: P & { productoId?: number; tipo?: TipoMovimientoInventario }) =>
      page<MovimientoInventario>("/bodega/inventario/movimientos", { ...p }),
  },

  ventas: {
    listar: (p: P & { cajaId?: number; estado?: EstadoVenta; desde?: string; hasta?: string }) =>
      page<Venta>("/bodega/ventas", { ...p }),
    obtener: (id: number) => one<Venta>("GET", `/bodega/ventas/${id}`),
    crear: (c: {
      detalles: { productoId: number; cantidad: number; envaseEntregado?: boolean }[];
      pagos: { metodo: MetodoPago; monto: number; nroOperacion?: string }[];
    }) => one<Venta>("POST", "/bodega/ventas", c),
    anular: (id: number, motivo: string) => one<Venta>("POST", `/bodega/ventas/${id}/anular`, { motivo }),
  },

  compras: {
    listar: (p: P & { proveedorId?: number; estado?: EstadoCompra; desde?: string; hasta?: string }) =>
      page<Compra>("/bodega/compras", { ...p }),
    obtener: (id: number) => one<Compra>("GET", `/bodega/compras/${id}`),
    crear: (c: {
      proveedorId?: number;
      nroComprobante?: string;
      pagadoDesdeCaja?: boolean;
      detalles: { productoId: number; cantidadCajas?: number; cantidadSueltas?: number; costoUnitario: number }[];
    }) => one<Compra>("POST", "/bodega/compras", c),
    anular: (id: number, motivo: string) => one<Compra>("POST", `/bodega/compras/${id}/anular`, { motivo }),
  },

  reportes: {
    gananciaProductos: (desde?: string, hasta?: string) =>
      list<GananciaProducto>("/reportes/ganancia-productos", { desde, hasta }),
    resumenGeneral: (desde?: string, hasta?: string) =>
      one<ResumenGeneral>("GET", "/reportes/resumen-general", undefined, { desde, hasta }),
  },
};
