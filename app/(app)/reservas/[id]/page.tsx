"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { CambiarMontoDialog, MotivoDialog, PagoDialog, ReprogramarDialog } from "@/components/reservas";
import { EstadoDot } from "@/components/shared";
import { Alert, Button, ErrorBanner, Icon, Loading, useAction, useSnackbar } from "@/components/ui";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { etiqueta, fechaHora, hora, soles } from "@/lib/format";
import { useAsync } from "@/lib/hooks";
import type { Reserva } from "@/lib/types";

type Dlg = "pago" | "devolucion" | "reprogramar" | "cancelar" | "monto" | null;

export default function ReservaDetallePage() {
  const { id } = useParams<{ id: string }>();
  const reservaId = Number(id);
  const { isAdmin } = useAuth();
  const snack = useSnackbar();
  const run = useAction();
  const [dlg, setDlg] = useState<Dlg>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const reserva = useAsync(() => api.reservas.obtener(reservaId), [reservaId]);
  const pagos = useAsync(() => api.reservas.pagos(reservaId), [reservaId]);
  const cancha = useAsync(
    () => (reserva.data ? api.canchas.obtener(reserva.data.canchaId) : Promise.resolve(null)),
    [reserva.data?.canchaId],
  );

  const actualizar = (r: Reserva, msg: string) => {
    // Las acciones devuelven la reserva con advertencias / devolución sugerida: se conservan.
    reserva.setData(r);
    setDlg(null);
    const extra = [...(r.advertencias ?? [])];
    if (r.devolucionSugerida) extra.push(`Devolución sugerida: ${soles(r.devolucionSugerida)}`);
    snack(extra.length ? `${msg} · ${extra.join(" · ")}` : msg);
    pagos.reload();
  };

  const accion = async (key: string, fn: () => Promise<Reserva>, msg: string) => {
    setBusy(key);
    const r = await run(fn);
    setBusy(null);
    if (r) actualizar(r, msg);
  };

  if (reserva.loading && !reserva.data) return <Loading />;
  if (reserva.error || !reserva.data)
    return (
      <>
        <BackLink />
        <ErrorBanner message={reserva.error ?? "Reserva no encontrada"} onRetry={reserva.reload} />
      </>
    );

  const r = reserva.data;
  const esReserva = r.tipo === "RESERVA";
  const activa = r.estado === "PENDIENTE" || r.estado === "CONFIRMADA";
  const puedeDevolver =
    isAdmin && esReserva && r.pagado > 0 && (r.estado === "CANCELADA" || r.saldo < 0 || (r.devolucionSugerida ?? 0) > 0);

  const dia = new Date(r.inicio).toLocaleDateString("es-PE", {
    timeZone: "America/Lima",
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  return (
    <div className="max-w-3xl mx-auto">
      <BackLink />

      {/* Encabezado */}
      <div className="flex items-start gap-4 mb-8">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 text-sm text-text-2 mb-1">
            <span>{esReserva ? `Reserva #${r.id}` : `Mantenimiento #${r.id}`}</span>
            {esReserva && <EstadoDot estado={r.estado} />}
          </div>
          <h1 className="text-2xl font-normal truncate">{esReserva ? r.clienteNombre : (r.observacion ?? "Mantenimiento")}</h1>
          <p className="text-text-2 mt-1 first-letter:uppercase">
            {dia} · <span className="tabular-nums">{hora(r.inicio)} – {hora(r.fin)}</span> · {cancha.data?.nombre ?? "Cancha"}
          </p>
        </div>
        {activa && esReserva && r.saldo > 0 && (
          <Button icon="payments" onClick={() => setDlg("pago")}>
            Cobrar
          </Button>
        )}
      </div>

      {r.advertencias?.map((a) => (
        <div key={a} className="mb-3">
          <Alert>{a}</Alert>
        </div>
      ))}

      {/* Montos */}
      {esReserva && (
        <div className="grid grid-cols-3 rounded-lg border border-divider bg-surface divide-x divide-divider mb-6">
          <Monto label="Total" value={soles(r.montoTotal)} />
          <Monto label="Pagado" value={soles(r.pagado)} />
          <Monto label="Saldo" value={soles(r.saldo)} color={r.saldo > 0 ? "text-warn" : "text-[#2e7d32]"} />
        </div>
      )}

      {r.estado === "PENDIENTE" && esReserva && (r.adelantoMinimo !== null || r.fechaLimiteAdelanto) && (
        <p className="text-sm text-text-2 mb-6">
          Se confirma con un adelanto de <b className="text-text">{soles(r.adelantoMinimo)}</b>
          {r.fechaLimiteAdelanto && <> antes del {fechaHora(r.fechaLimiteAdelanto)}</>}.
        </p>
      )}

      {/* Acciones */}
      {(activa || puedeDevolver) && (
        <div className="flex flex-wrap gap-1 mb-8 -ml-2 [&_button]:normal-case [&_button]:tracking-normal">
          {activa && esReserva && (
            <Button variant="basic" icon="update" onClick={() => setDlg("reprogramar")}>
              Reprogramar
            </Button>
          )}
          {activa && esReserva && r.estado === "CONFIRMADA" && (
            <>
              <Button variant="basic" icon="task_alt" loading={busy === "completar"} onClick={() => accion("completar", () => api.reservas.completar(r.id), "Reserva completada")}>
                Completar
              </Button>
              <Button variant="basic" color="default" icon="person_off" loading={busy === "noasistio"} onClick={() => accion("noasistio", () => api.reservas.noAsistio(r.id), "Marcada como no asistió")}>
                No asistió
              </Button>
            </>
          )}
          {activa && isAdmin && esReserva && (
            <Button variant="basic" color="default" icon="edit" onClick={() => setDlg("monto")}>
              Cambiar monto
            </Button>
          )}
          {puedeDevolver && (
            <Button variant="basic" color="warn" icon="undo" onClick={() => setDlg("devolucion")}>
              Devolver
            </Button>
          )}
          {activa && (esReserva || isAdmin) && (
            <Button variant="basic" color="warn" icon="close" onClick={() => setDlg("cancelar")}>
              Cancelar
            </Button>
          )}
        </div>
      )}

      {/* Detalle */}
      <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4 mb-10 text-sm">
        {esReserva && (
          <Item label="Teléfono">
            {r.clienteId ? (
              <Link href={`/clientes?q=${encodeURIComponent(r.clienteTelefono ?? "")}`} className="text-primary tabular-nums">
                {r.clienteTelefono}
              </Link>
            ) : (
              r.clienteTelefono
            )}
          </Item>
        )}
        {esReserva && <Item label="Origen">{etiqueta(r.origen)}</Item>}
        {esReserva && r.observacion && <Item label="Observación">{r.observacion}</Item>}
        {r.motivoCancelacion && <Item label="Motivo de cancelación">{r.motivoCancelacion}</Item>}
        {(r.devolucionSugerida ?? 0) > 0 && <Item label="Devolución sugerida">{soles(r.devolucionSugerida)}</Item>}
        <Item label="Registrada">{fechaHora(r.createdAt)}</Item>
      </dl>

      {/* Pagos */}
      {esReserva && (
        <section>
          <h2 className="text-xs font-medium text-text-2 uppercase tracking-wide mb-2">Pagos</h2>
          {pagos.loading && !pagos.data ? (
            <Loading />
          ) : pagos.error ? (
            <ErrorBanner message={pagos.error} onRetry={pagos.reload} />
          ) : !pagos.data?.length ? (
            <p className="text-sm text-text-2 py-4">Aún no hay pagos.</p>
          ) : (
            <ul className="border-t border-divider">
              {pagos.data.map((p) => (
                <li key={p.id} className="flex items-center gap-4 py-3 border-b border-divider text-sm">
                  <div className="flex-1 min-w-0">
                    <div>
                      {etiqueta(p.tipo)} · {etiqueta(p.metodo)}
                      {p.nroOperacion && <span className="text-text-2"> · Op. {p.nroOperacion}</span>}
                      {p.voucherUrl && (
                        <a href={p.voucherUrl} target="_blank" rel="noreferrer" className="ml-2 text-primary inline-flex align-middle" title="Ver voucher">
                          <Icon name="open_in_new" size={16} />
                        </a>
                      )}
                    </div>
                    <div className="text-xs text-text-2">{fechaHora(p.fecha)}</div>
                  </div>
                  <span className={`tabular-nums ${p.tipo === "DEVOLUCION" ? "text-warn" : ""}`}>
                    {p.tipo === "DEVOLUCION" ? "−" : ""}
                    {soles(p.monto)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      <PagoDialog
        open={dlg === "pago" || dlg === "devolucion"}
        devolucion={dlg === "devolucion"}
        reserva={r}
        onClose={() => setDlg(null)}
        onDone={() => {
          setDlg(null);
          snack(dlg === "devolucion" ? "Devolución registrada" : "Pago registrado");
          reserva.reload();
          pagos.reload();
        }}
      />
      <ReprogramarDialog open={dlg === "reprogramar"} reserva={r} onClose={() => setDlg(null)} onDone={(x) => actualizar(x, "Reserva reprogramada")} />
      <CambiarMontoDialog open={dlg === "monto"} reserva={r} onClose={() => setDlg(null)} onDone={(x) => actualizar(x, "Monto actualizado")} />
      <MotivoDialog
        open={dlg === "cancelar"}
        title={esReserva ? "Cancelar reserva" : "Cancelar mantenimiento"}
        label="Motivo de cancelación"
        submitLabel="Cancelar reserva"
        onClose={() => setDlg(null)}
        onSubmit={async (motivo) => actualizar(await api.reservas.cancelar(r.id, motivo), "Reserva cancelada")}
      >
        {esReserva && r.pagado > 0 && (
          <Alert>Con 24 h o más de anticipación el adelanto se devuelve. Un administrador registra la devolución.</Alert>
        )}
      </MotivoDialog>
    </div>
  );
}

function BackLink() {
  return (
    <Link href="/reservas" className="inline-flex items-center gap-1 text-sm text-text-2 hover:text-primary mb-4">
      <Icon name="arrow_back" size={18} /> Reservas
    </Link>
  );
}

function Item({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs text-text-2">{label}</dt>
      <dd className="mt-0.5">{children}</dd>
    </div>
  );
}

function Monto({ label, value, color = "" }: { label: string; value: string; color?: string }) {
  return (
    <div className="px-4 py-3">
      <div className="text-xs text-text-2">{label}</div>
      <div className={`text-lg tabular-nums ${color}`}>{value}</div>
    </div>
  );
}
