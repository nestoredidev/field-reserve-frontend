"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { MantenimientoDialog, NuevaReservaDialog, type Horario } from "@/components/reservas";
import { EstadoDot, enumOptions, useCanchas } from "@/components/shared";
import { Button, Empty, ErrorBanner, Icon, IconButton, Loading, Paginator, useSnackbar } from "@/components/ui";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { hhmm, hora, hoyLima, soles, sumarDias } from "@/lib/format";
import { useAsync, usePaged } from "@/lib/hooks";
import type { EstadoReserva, Reserva, Slot } from "@/lib/types";
import { ESTADOS_RESERVA } from "@/lib/types";

type Vista = "agenda" | "listado";

const DIA_CORTO = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
const MES_CORTO = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

function partes(iso: string) {
  const d = new Date(`${iso}T12:00:00Z`);
  return { dow: DIA_CORTO[d.getUTCDay()], dia: d.getUTCDate(), mes: MES_CORTO[d.getUTCMonth()] };
}

/** Superficie plana: borde fino en lugar de sombra. */
function Panel({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`bg-surface rounded-lg border border-divider ${className}`}>{children}</div>;
}

export default function ReservasPage() {
  const { isAdmin } = useAuth();
  const router = useRouter();
  const snack = useSnackbar();
  const canchas = useCanchas();
  const [vista, setVista] = useState<Vista>("agenda");
  const [nueva, setNueva] = useState<Partial<Horario> | null>(null);
  const [mant, setMant] = useState(false);
  const [version, setVersion] = useState(0);

  const activas = canchas.data?.filter((c) => c.activa) ?? [];

  const creada = (r: Reserva) => {
    setNueva(null);
    setMant(false);
    setVersion((v) => v + 1);
    const avisos = r.advertencias?.length ? ` · ${r.advertencias.join(" · ")}` : "";
    snack(`${r.tipo === "MANTENIMIENTO" ? "Mantenimiento" : "Reserva"} #${r.id} registrada${avisos}`);
    if (r.tipo === "RESERVA") router.push(`/reservas/${r.id}`);
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex flex-wrap items-center gap-3 mb-8">
        <h1 className="text-2xl font-normal flex-1">Reservas</h1>
        <Segmentado
          value={vista}
          onChange={setVista}
          options={[
            { value: "agenda", label: "Disponibilidad" },
            { value: "listado", label: "Listado" },
          ]}
        />
        {isAdmin && <IconButton icon="build" title="Bloquear por mantenimiento" onClick={() => setMant(true)} />}
        <Button icon="add" onClick={() => setNueva({})}>
          Reservar
        </Button>
      </div>

      {canchas.error && <ErrorBanner message={canchas.error} onRetry={canchas.reload} />}

      {vista === "agenda" ? (
        canchas.loading && !canchas.data ? (
          <Loading />
        ) : activas.length === 0 ? (
          <Empty icon="sports_soccer" text="No hay canchas activas. Regístralas en Canchas y tarifas." />
        ) : (
          <Agenda key={version} canchas={activas} onReservar={(h) => setNueva(h)} />
        )
      ) : (
        <Listado key={version} canchas={canchas.data ?? []} />
      )}

      <NuevaReservaDialog
        open={nueva !== null}
        initial={nueva ?? undefined}
        canchas={activas}
        onClose={() => setNueva(null)}
        onCreated={creada}
      />
      {isAdmin && <MantenimientoDialog open={mant} canchas={activas} onClose={() => setMant(false)} onCreated={creada} />}
    </div>
  );
}

/* ---------------- Controles mínimos ---------------- */

function Segmentado<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string }[];
}) {
  return (
    <div className="inline-flex p-0.5 rounded-full bg-[#eeeeee]">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={`h-8 px-4 rounded-full text-sm cursor-pointer transition-colors ${
            value === o.value ? "bg-surface text-text shadow-z1 font-medium" : "text-text-2 hover:text-text"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function Pastilla({ activo, onClick, children }: { activo: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`h-8 px-4 rounded-full text-sm whitespace-nowrap cursor-pointer transition-colors ${
        activo ? "bg-primary text-on-primary" : "text-text-2 hover:bg-hover"
      }`}
    >
      {children}
    </button>
  );
}

/* ---------------- Disponibilidad ---------------- */

function Agenda({
  canchas,
  onReservar,
}: {
  canchas: { id: number; nombre: string }[];
  onReservar: (h: Partial<Horario>) => void;
}) {
  const hoy = hoyLima();
  const [canchaId, setCanchaId] = useState<number>(canchas[0].id);
  const [dia, setDia] = useState(hoy);
  const [inicioTira, setInicioTira] = useState(hoy);
  const [sel, setSel] = useState<[number, number] | null>(null);

  const slots = useAsync(() => api.reservas.disponibilidad(canchaId, dia), [canchaId, dia]);
  const reservas = useAsync(
    () =>
      api.reservas
        .listar({ canchaId, desde: dia, hasta: dia, size: 100, sortBy: "inicio" })
        .then((p) => p.items.filter((r) => r.estado === "PENDIENTE" || r.estado === "CONFIRMADA")),
    [canchaId, dia],
  );

  const elegirDia = (d: string) => {
    setSel(null);
    setDia(d);
  };
  const moverTira = (dias: number) => {
    const nuevo = sumarDias(inicioTira, dias);
    setInicioTira(nuevo);
    elegirDia(nuevo < hoy ? hoy : nuevo);
  };

  const click = (i: number) => {
    if (!sel) return setSel([i, i]);
    const [a, b] = sel;
    if (i === a && i === b) return setSel(null);
    const lo = Math.min(a, i);
    const hi = Math.max(b, i);
    setSel(slots.data!.slice(lo, hi + 1).every((x) => x.disponible) ? [lo, hi] : [i, i]);
  };

  const ocupante = (s: Slot): Reserva | undefined =>
    reservas.data?.find(
      (r) => hora(r.inicio) <= hhmm(s.horaInicio) && hhmm(s.horaInicio) < (hora(r.fin) === "00:00" ? "24:00" : hora(r.fin)),
    );

  const rango = sel && slots.data ? slots.data.slice(sel[0], sel[1] + 1) : [];
  const total = rango.reduce((acc, s) => acc + Number(s.precioHora ?? 0), 0);
  const tira = Array.from({ length: 7 }, (_, i) => sumarDias(inicioTira, i));
  const libres = slots.data?.filter((s) => s.disponible).length ?? 0;

  return (
    <>
      {/* Canchas */}
      {canchas.length > 1 && (
        <div className="flex gap-1 overflow-x-auto mb-4 -mx-1 px-1">
          {canchas.map((c) => (
            <Pastilla
              key={c.id}
              activo={c.id === canchaId}
              onClick={() => {
                setSel(null);
                setCanchaId(c.id);
              }}
            >
              {c.nombre}
            </Pastilla>
          ))}
        </div>
      )}

      {/* Días */}
      <div className="flex items-center gap-1 mb-6">
        <IconButton icon="chevron_left" title="Semana anterior" disabled={inicioTira <= hoy} onClick={() => moverTira(-7)} />
        <div className="grid grid-cols-7 gap-1 flex-1">
          {tira.map((d) => {
            const p = partes(d);
            const activo = d === dia;
            return (
              <button
                key={d}
                type="button"
                onClick={() => elegirDia(d)}
                className={`flex flex-col items-center py-2 rounded-lg cursor-pointer transition-colors ${
                  activo ? "bg-primary text-on-primary" : "hover:bg-hover"
                }`}
              >
                <span className={`text-xs ${activo ? "text-white/80" : "text-text-2"}`}>{d === hoy ? "Hoy" : p.dow}</span>
                <span className="text-lg leading-7 tabular-nums">{p.dia}</span>
                <span className={`text-[11px] ${activo ? "text-white/70" : "text-text-disabled"}`}>{p.mes}</span>
              </button>
            );
          })}
        </div>
        <IconButton icon="chevron_right" title="Semana siguiente" onClick={() => moverTira(7)} />
      </div>

      {/* Horas */}
      {slots.loading && !slots.data ? (
        <Loading />
      ) : slots.error ? (
        <ErrorBanner message={slots.error} onRetry={slots.reload} />
      ) : !slots.data?.length ? (
        <Empty icon="schedule" text="Sin horario de atención este día" />
      ) : (
        <>
          <div className="flex items-baseline justify-between mb-2 px-1 text-xs text-text-2">
            <span>{libres ? `${libres} ${libres === 1 ? "hora libre" : "horas libres"}` : "Día completo"}</span>
            {libres > 0 && <span>Elige una hora, o dos para un rango</span>}
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 mb-24">
            {slots.data.map((s, i) => {
              const elegido = !!sel && i >= sel[0] && i <= sel[1];
              const r = s.disponible ? undefined : ocupante(s);
              return (
                <SlotCard
                  key={i}
                  slot={s}
                  reserva={r}
                  elegido={elegido}
                  onClick={() => click(i)}
                />
              );
            })}
          </div>
        </>
      )}

      {/* Barra de selección */}
      {sel && rango.length > 0 && (
        <div className="fixed bottom-6 left-1/2 lg:left-[calc(50%+8rem)] -translate-x-1/2 z-20 px-4 w-full max-w-md">
          <div
            className="flex items-center gap-3 rounded-full bg-surface shadow-z8 border border-divider pl-5 pr-2 h-14"
            style={{ animation: "mat-fade-up .15s ease-out" }}
          >
            <div className="flex-1 min-w-0 leading-tight">
              <div className="font-medium tabular-nums">
                {hhmm(rango[0].horaInicio)} – {hhmm(rango[rango.length - 1].horaFin)}
              </div>
              <div className="text-xs text-text-2">
                {rango.length} h · {soles(total)}
              </div>
            </div>
            <IconButton icon="close" title="Quitar selección" onClick={() => setSel(null)} />
            <Button
              color="accent"
              className="rounded-full"
              onClick={() =>
                onReservar({
                  canchaId,
                  fecha: dia,
                  inicio: hhmm(rango[0].horaInicio),
                  fin: hhmm(rango[rango.length - 1].horaFin),
                })
              }
            >
              Reservar
            </Button>
          </div>
        </div>
      )}
    </>
  );
}

const BARRA_ESTADO: Record<string, string> = {
  PENDIENTE: "var(--color-caution)",
  CONFIRMADA: "var(--color-primary)",
};

/** Tarjeta de una hora: libre, seleccionada, reservada, en mantenimiento o no disponible. */
function SlotCard({
  slot,
  reserva,
  elegido,
  onClick,
}: {
  slot: Slot;
  reserva?: Reserva;
  elegido: boolean;
  onClick: () => void;
}) {
  const base = "relative flex flex-col justify-between gap-3 min-h-[92px] rounded-xl p-3 text-left transition-all duration-150";
  const horario = (claro = false) => (
    <div className="flex items-baseline gap-1 tabular-nums">
      <span className="text-base font-medium">{hhmm(slot.horaInicio)}</span>
      <span className={`text-xs ${claro ? "text-white/70" : "text-text-2"}`}>– {hhmm(slot.horaFin)}</span>
    </div>
  );

  if (slot.disponible) {
    return (
      <button
        type="button"
        onClick={onClick}
        aria-pressed={elegido}
        className={`${base} cursor-pointer border ${
          elegido
            ? "bg-primary border-primary text-on-primary shadow-z4"
            : "bg-surface border-divider shadow-z1 hover:border-primary hover:shadow-z4 hover:-translate-y-0.5"
        }`}
      >
        {horario(elegido)}
        <div className="flex items-end justify-between">
          <span className={`flex items-center gap-1.5 text-xs ${elegido ? "text-white/80" : "text-text-2"}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${elegido ? "bg-white" : "bg-success"}`} />
            {elegido ? "Elegida" : "Libre"}
          </span>
          <span className={`font-medium tabular-nums ${elegido ? "" : "text-primary"}`}>{soles(slot.precioHora)}</span>
        </div>
        {elegido && <Icon name="check_circle" size={18} className="absolute top-3 right-3 text-white" />}
      </button>
    );
  }

  if (reserva?.tipo === "MANTENIMIENTO") {
    return (
      <Link
        href={`/reservas/${reserva.id}`}
        className={`${base} text-[#e65100] hover:shadow-z2`}
        style={{
          background:
            "repeating-linear-gradient(135deg, rgba(255,152,0,.10) 0 8px, rgba(255,152,0,.18) 8px 16px)",
        }}
      >
        {horario()}
        <span className="flex items-center gap-1.5 text-xs font-medium">
          <Icon name="build" size={14} /> Mantenimiento
        </span>
      </Link>
    );
  }

  if (reserva) {
    return (
      <Link
        href={`/reservas/${reserva.id}`}
        className={`${base} bg-primary-50 hover:shadow-z2 hover:-translate-y-0.5`}
        style={{ boxShadow: `inset 3px 0 0 ${BARRA_ESTADO[reserva.estado] ?? "var(--color-primary)"}` }}
      >
        {horario()}
        <div className="min-w-0">
          <div className="text-sm font-medium truncate">{reserva.clienteNombre}</div>
          <div className="text-xs text-text-2 truncate">
            {reserva.estado === "PENDIENTE" ? "Pendiente de adelanto" : "Confirmada"}
          </div>
        </div>
      </Link>
    );
  }

  return (
    <div className={`${base} bg-[#f5f5f5] text-text-disabled`}>
      {horario()}
      <span className="text-xs">No disponible</span>
    </div>
  );
}

/* ---------------- Listado ---------------- */

function Listado({ canchas }: { canchas: { id: number; nombre: string }[] }) {
  const router = useRouter();
  const [canchaId, setCanchaId] = useState("");
  const [estado, setEstado] = useState("");
  const [desde, setDesde] = useState(hoyLima());
  const [hasta, setHasta] = useState("");

  const res = usePaged(
    (page, size) =>
      api.reservas.listar({
        page,
        size,
        sortBy: "inicio",
        direction: "asc",
        tipo: "RESERVA",
        canchaId: canchaId ? Number(canchaId) : undefined,
        estado: (estado || undefined) as EstadoReserva | undefined,
        desde: desde || undefined,
        hasta: hasta || undefined,
      }),
    [canchaId, estado, desde, hasta],
    20,
  );
  const nombre = (id: number) => canchas.find((c) => c.id === id)?.nombre ?? `#${id}`;
  const filtro = "h-9 rounded-full bg-[#eeeeee] px-4 text-sm outline-none cursor-pointer focus:ring-2 focus:ring-primary-light";

  return (
    <>
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <select className={filtro} value={canchaId} onChange={(e) => setCanchaId(e.target.value)}>
          <option value="">Todas las canchas</option>
          {canchas.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nombre}
            </option>
          ))}
        </select>
        <select className={filtro} value={estado} onChange={(e) => setEstado(e.target.value)}>
          <option value="">Todos los estados</option>
          {enumOptions(ESTADOS_RESERVA).map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <div className="flex items-center gap-1 text-sm text-text-2">
          <input type="date" aria-label="Desde" className={filtro} value={desde} onChange={(e) => setDesde(e.target.value)} />
          <span>→</span>
          <input type="date" aria-label="Hasta" className={filtro} value={hasta} onChange={(e) => setHasta(e.target.value)} />
        </div>
      </div>

      {res.error && <ErrorBanner message={res.error} onRetry={res.reload} />}
      {res.loading && !res.data ? (
        <Loading />
      ) : !res.data?.items.length ? (
        <Empty icon="event_busy" text="No hay reservas con estos filtros" />
      ) : (
        <Panel className="overflow-hidden">
          {res.data.items.map((r) => {
            const p = partes(r.inicio.slice(0, 10));
            return (
              <button
                key={r.id}
                type="button"
                onClick={() => router.push(`/reservas/${r.id}`)}
                className="w-full flex items-center gap-4 px-4 py-3 border-b border-divider last:border-0 text-left hover:bg-hover cursor-pointer"
              >
                <div className="w-12 text-center leading-tight shrink-0">
                  <div className="text-[11px] text-text-2 uppercase">{p.dow}</div>
                  <div className="text-lg tabular-nums">{p.dia}</div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="truncate font-medium">{r.clienteNombre}</div>
                  <div className="text-xs text-text-2 truncate tabular-nums">
                    {hora(r.inicio)} – {hora(r.fin)} · {nombre(r.canchaId)}
                  </div>
                </div>
                <div className="hidden sm:block">
                  <EstadoDot estado={r.estado} />
                </div>
                <div className="w-24 text-right text-sm tabular-nums">
                  {r.saldo > 0 ? <span className="text-warn">{soles(r.saldo)}</span> : <span className="text-text-2">Pagado</span>}
                </div>
              </button>
            );
          })}
          <div className="border-t border-divider">
            <Paginator page={res.page} size={res.size} total={res.data.totalElements} onPage={res.setPage} />
          </div>
        </Panel>
      )}
    </>
  );
}
