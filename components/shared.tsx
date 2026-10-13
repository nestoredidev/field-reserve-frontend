"use client";

import { api } from "@/lib/api";
import { etiqueta } from "@/lib/format";
import { useAsync } from "@/lib/hooks";
import type { EstadoReserva, MetodoPago } from "@/lib/types";
import { METODOS_PAGO } from "@/lib/types";
import { Chip, type ChipColor, SelectField, TextField } from "./ui";

const ESTADO_COLOR: Record<string, ChipColor> = {
  PENDIENTE: "caution",
  CONFIRMADA: "primary",
  COMPLETADA: "success",
  CANCELADA: "default",
  NO_ASISTIO: "warn",
  ABIERTA: "success",
  CERRADA: "default",
  REGISTRADA: "success",
  ANULADA: "warn",
  ADMIN: "accent",
  ENCARGADO: "primary",
};

export function EstadoChip({ estado }: { estado: EstadoReserva | string }) {
  return <Chip color={ESTADO_COLOR[estado] ?? "default"}>{etiqueta(estado)}</Chip>;
}

const DOT_COLOR: Record<string, string> = {
  PENDIENTE: "bg-caution",
  CONFIRMADA: "bg-primary",
  COMPLETADA: "bg-success",
  CANCELADA: "bg-text-disabled",
  NO_ASISTIO: "bg-warn",
};

/** Estado compacto: punto de color + texto (variante minimalista del chip). */
export function EstadoDot({ estado }: { estado: EstadoReserva | string }) {
  return (
    <span className="inline-flex items-center gap-2 text-sm whitespace-nowrap">
      <span className={`w-2 h-2 rounded-full ${DOT_COLOR[estado] ?? "bg-text-disabled"}`} />
      {etiqueta(estado)}
    </span>
  );
}

export function ActivoChip({ activo }: { activo: boolean }) {
  return <Chip color={activo ? "success" : "default"}>{activo ? "Activo" : "Inactivo"}</Chip>;
}

/** Todas las canchas (hasta 100) para selects y para resolver nombres. */
export function useCanchas(soloActivas = false) {
  return useAsync(
    () =>
      api.canchas
        .listar({ size: 100, sortBy: "nombre", activa: soloActivas ? true : undefined })
        .then((p) => p.items),
    [soloActivas],
  );
}

export function useCategorias() {
  return useAsync(() => api.categorias.listar({ size: 100 }).then((p) => p.items), []);
}

export function useProveedores() {
  return useAsync(() => api.proveedores.listar({ size: 100 }).then((p) => p.items), []);
}

export function enumOptions<T extends string>(values: readonly T[]) {
  return values.map((v) => ({ value: v, label: etiqueta(v) }));
}

/** Método de pago + nro. de operación (obligatorio si no es efectivo). */
export function MetodoPagoFields({
  metodo,
  nroOperacion,
  onMetodo,
  onNro,
}: {
  metodo: MetodoPago;
  nroOperacion: string;
  onMetodo: (m: MetodoPago) => void;
  onNro: (v: string) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-4">
      <SelectField
        label="Método"
        value={metodo}
        onChange={(e) => onMetodo(e.target.value as MetodoPago)}
        options={enumOptions(METODOS_PAGO)}
      />
      <TextField
        label="Nro. de operación"
        value={nroOperacion}
        onChange={(e) => onNro(e.target.value)}
        maxLength={30}
        required={metodo !== "EFECTIVO"}
        disabled={metodo === "EFECTIVO"}
      />
    </div>
  );
}

export function toNum(v: string): number {
  return Number(v.replace(",", "."));
}

export function optional(v: string): string | undefined {
  const t = v.trim();
  return t ? t : undefined;
}
