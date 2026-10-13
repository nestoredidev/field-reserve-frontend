const TZ = "America/Lima";

const money = new Intl.NumberFormat("es-PE", { style: "currency", currency: "PEN" });

export function soles(v: number | null | undefined): string {
  if (v === null || v === undefined) return "—";
  return money.format(Number(v));
}

export function fechaHora(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("es-PE", {
    timeZone: TZ,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function fecha(iso: string | null | undefined): string {
  if (!iso) return "—";
  // LocalDate ("2026-10-09") se muestra tal cual, sin desplazar zona.
  if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) {
    const [y, m, d] = iso.split("-");
    return `${d}/${m}/${y}`;
  }
  return new Date(iso).toLocaleDateString("es-PE", { timeZone: TZ });
}

export function hora(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleTimeString("es-PE", { timeZone: TZ, hour: "2-digit", minute: "2-digit", hour12: false });
}

/** "18:00:00" → "18:00" */
export function hhmm(t: string | null | undefined): string {
  return t ? t.slice(0, 5) : "—";
}

/** Fecha de hoy en Lima como "YYYY-MM-DD". */
export function hoyLima(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: TZ });
}

export function sumarDias(isoDate: string, dias: number): string {
  const d = new Date(`${isoDate}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + dias);
  return d.toISOString().slice(0, 10);
}

/** Convierte un OffsetDateTime del backend a LocalDateTime en Lima ("YYYY-MM-DDTHH:mm"). */
export function aLocalLima(iso: string): string {
  const d = new Date(iso);
  const date = d.toLocaleDateString("en-CA", { timeZone: TZ });
  const time = d.toLocaleTimeString("en-GB", { timeZone: TZ, hour: "2-digit", minute: "2-digit", hour12: false });
  return `${date}T${time}`;
}

/** Arma el LocalDateTime que espera el backend. */
export function localDateTime(date: string, time: string): string {
  return `${date}T${time.length === 5 ? `${time}:00` : time}`;
}

export const DIAS_SEMANA = ["", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];

export function etiqueta(v: string | null | undefined): string {
  if (!v) return "—";
  return v
    .toLowerCase()
    .split("_")
    .map((w, i) => (i === 0 ? w.charAt(0).toUpperCase() + w.slice(1) : w))
    .join(" ");
}
