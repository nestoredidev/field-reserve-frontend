// Tipos que reflejan los DTOs del backend (field-reserve-backend, /api/v2).

export type Rol = "ADMIN" | "ENCARGADO";
export type MetodoPago = "EFECTIVO" | "YAPE" | "PLIN" | "TRANSFERENCIA";
export type EstadoCaja = "ABIERTA" | "CERRADA";
export type TipoMovimientoCaja = "INGRESO" | "EGRESO";
export type EstadoReserva = "PENDIENTE" | "CONFIRMADA" | "COMPLETADA" | "CANCELADA" | "NO_ASISTIO";
export type TipoReserva = "RESERVA" | "MANTENIMIENTO";
export type OrigenReserva = "PRESENCIAL" | "WHATSAPP" | "LLAMADA" | "WEB";
export type TipoPagoReserva = "ADELANTO" | "SALDO" | "DEVOLUCION";
export type EstadoVenta = "REGISTRADA" | "ANULADA";
export type EstadoCompra = "REGISTRADA" | "ANULADA";
export type TipoProducto = "PRODUCTO" | "ENVASE";
export type TipoMovimientoInventario =
  | "ENTRADA_COMPRA"
  | "SALIDA_VENTA"
  | "ANULACION_VENTA"
  | "ANULACION_COMPRA"
  | "AJUSTE_POSITIVO"
  | "AJUSTE_NEGATIVO"
  | "MERMA"
  | "DEVOLUCION_ENVASE"
  | "SALIDA_ENVASE";

export const METODOS_PAGO: MetodoPago[] = ["EFECTIVO", "YAPE", "PLIN", "TRANSFERENCIA"];
export const ESTADOS_RESERVA: EstadoReserva[] = ["PENDIENTE", "CONFIRMADA", "COMPLETADA", "CANCELADA", "NO_ASISTIO"];
export const ORIGENES_RESERVA: OrigenReserva[] = ["PRESENCIAL", "WHATSAPP", "LLAMADA", "WEB"];
export const TIPOS_MOV_MANUALES: TipoMovimientoInventario[] = [
  "AJUSTE_POSITIVO",
  "AJUSTE_NEGATIVO",
  "MERMA",
  "DEVOLUCION_ENVASE",
  "SALIDA_ENVASE",
];
export const TIPOS_MOV_INVENTARIO: TipoMovimientoInventario[] = [
  "ENTRADA_COMPRA",
  "SALIDA_VENTA",
  "ANULACION_VENTA",
  "ANULACION_COMPRA",
  ...TIPOS_MOV_MANUALES,
];

/** Envoltorio común de todas las respuestas (PageResponse). */
export interface ApiEnvelope<T> {
  code: number;
  message: string;
  data: T[];
  page?: number;
  size?: number;
  total_elements?: number;
  total_pages?: number;
  has_next?: boolean;
  has_previous?: boolean;
}

export interface Page<T> {
  items: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

export interface PageParams {
  page?: number;
  size?: number;
  sortBy?: string;
  direction?: "asc" | "desc";
}

export interface Usuario {
  id: number;
  nombre: string;
  username: string;
  rol: Rol;
  activo: boolean;
  createdAt: string;
}

export interface LoginResponse {
  token: string;
  tokenType: string;
  expiresInSeconds: number;
  usuario: Usuario;
}

export interface Cancha {
  id: number;
  nombre: string;
  descripcion: string | null;
  activa: boolean;
  createdAt: string;
}

export interface Tarifa {
  id: number;
  canchaId: number;
  diaSemana: number | null;
  horaInicio: string;
  horaFin: string;
  precioHora: number;
  activa: boolean;
  createdAt: string;
}

export interface Cliente {
  id: number;
  nombre: string;
  telefono: string;
  notas: string | null;
  createdAt: string;
}

export interface Reserva {
  id: number;
  canchaId: number;
  clienteId: number | null;
  clienteNombre: string | null;
  clienteTelefono: string | null;
  tipo: TipoReserva;
  estado: EstadoReserva;
  inicio: string;
  fin: string;
  montoTotal: number;
  pagado: number;
  saldo: number;
  adelantoMinimo: number | null;
  fechaLimiteAdelanto: string | null;
  origen: OrigenReserva | null;
  observacion: string | null;
  motivoCancelacion: string | null;
  creadoPor: number | null;
  createdAt: string;
  advertencias: string[] | null;
  devolucionSugerida: number | null;
}

export interface Slot {
  horaInicio: string;
  horaFin: string;
  precioHora: number | null;
  disponible: boolean;
}

export interface PagoReserva {
  id: number;
  reservaId: number;
  cajaId: number;
  tipo: TipoPagoReserva;
  metodo: MetodoPago;
  monto: number;
  nroOperacion: string | null;
  voucherUrl: string | null;
  registradoPor: number;
  fecha: string;
}

export interface PagoReservaCommand {
  metodo: MetodoPago;
  monto: number;
  nroOperacion?: string;
  voucherUrl?: string;
  devolucion?: boolean;
}

export interface Caja {
  id: number;
  fecha: string;
  estado: EstadoCaja;
  montoApertura: number;
  montoCierreContado: number | null;
  observacion: string | null;
  abiertaPor: number;
  cerradaPor: number | null;
  abiertaAt: string;
  cerradaAt: string | null;
  cobrosEfectivo: number;
  cobrosDigitales: number;
  otrosIngresosEfectivo: number;
  egresosEfectivo: number;
  efectivoEsperado: number | null;
  diferencia: number | null;
  advertencia: string | null;
}

export interface MovimientoCaja {
  id: number;
  cajaId: number;
  tipo: TipoMovimientoCaja;
  metodo: MetodoPago;
  concepto: string;
  monto: number;
  registradoPor: number;
  fecha: string;
}

export interface Categoria {
  id: number;
  nombre: string;
}

export interface Proveedor {
  id: number;
  nombre: string;
  ruc: string | null;
  telefono: string | null;
  activo: boolean;
  createdAt: string;
}

export interface Producto {
  id: number;
  codigoBarras: string | null;
  nombre: string;
  categoriaId: number;
  tipo: TipoProducto;
  precioCompra: number;
  precioVenta: number;
  stock: number;
  stockMinimo: number;
  unidadesPorCaja: number;
  envaseId: number | null;
  activo: boolean;
  stockBajo: boolean;
  advertencias: string[] | null;
  createdAt: string;
}

export interface ProductoCommand {
  codigoBarras?: string;
  nombre: string;
  categoriaId: number;
  tipo?: TipoProducto;
  precioCompra: number;
  precioVenta: number;
  stockMinimo?: number;
  unidadesPorCaja?: number;
  envaseId?: number | null;
  stockInicial?: number;
}

export interface MovimientoInventario {
  id: number;
  productoId: number;
  tipo: TipoMovimientoInventario;
  cantidad: number;
  stockAnterior: number;
  stockResultante: number;
  compraId: number | null;
  ventaId: number | null;
  motivo: string | null;
  registradoPor: number;
  fecha: string;
}

export interface DetalleVenta {
  id: number;
  productoId: number;
  productoNombre: string;
  cantidad: number;
  precioUnitario: number;
  costoUnitario: number;
  subtotal: number;
}

export interface PagoVenta {
  id: number;
  metodo: MetodoPago;
  monto: number;
  nroOperacion: string | null;
  fecha: string;
}

export interface Venta {
  id: number;
  cajaId: number;
  fecha: string;
  total: number;
  estado: EstadoVenta;
  motivoAnulacion: string | null;
  registradoPor: number;
  detalles: DetalleVenta[] | null;
  pagos: PagoVenta[] | null;
}

export interface DetalleCompra {
  id: number;
  productoId: number;
  cantidadCajas: number;
  cantidadUnidades: number;
  costoUnitario: number;
  subtotal: number;
}

export interface Compra {
  id: number;
  proveedorId: number | null;
  nroComprobante: string | null;
  fecha: string;
  total: number;
  estado: EstadoCompra;
  registradoPor: number;
  detalles: DetalleCompra[] | null;
}

export interface GananciaProducto {
  productoId: number;
  nombre: string;
  unidadesVendidas: number;
  totalVendido: number;
  costoTotal: number;
  ganancia: number;
}

export interface ResumenGeneral {
  desde: string | null;
  hasta: string | null;
  cancha: {
    cobrosEfectivo: number;
    cobrosDigitales: number;
    otrosIngresos: number;
    egresos: number;
    reservasCompletadas: number;
  };
  bodega: {
    ventasTotal: number;
    ventasRegistradas: number;
    gananciaBruta: number;
    comprasTotal: number;
    otrosIngresos: number;
    egresos: number;
  };
}
