"use client";

import { useOnOpen } from "@/lib/hooks";
import { useState } from "react";
import { api } from "@/lib/api";
import { aLocalLima, hoyLima, localDateTime, soles } from "@/lib/format";
import type { Cancha, Cliente, MetodoPago, OrigenReserva, PagoReserva, Reserva } from "@/lib/types";
import { ORIGENES_RESERVA } from "@/lib/types";
import { MetodoPagoFields, enumOptions, optional, toNum } from "./shared";
import { Alert, Button, Checkbox, FormDialog, SelectField, TextArea, TextField } from "./ui";

export const HORAS = Array.from({ length: 24 }, (_, h) => `${String(h).padStart(2, "0")}:00`);

export interface Horario {
  canchaId: number | "";
  fecha: string;
  inicio: string;
  fin: string;
}

function HorarioFields({
  value,
  onChange,
  canchas,
}: {
  value: Horario;
  onChange: (h: Horario) => void;
  canchas?: Cancha[];
}) {
  return (
    <>
      {canchas && (
        <SelectField
          label="Cancha"
          required
          value={value.canchaId}
          onChange={(e) => onChange({ ...value, canchaId: e.target.value ? Number(e.target.value) : "" })}
          placeholder="Selecciona una cancha"
          options={canchas.map((c) => ({ value: c.id, label: c.nombre }))}
        />
      )}
      <div className="grid grid-cols-3 gap-4">
        <TextField
          label="Fecha"
          type="date"
          required
          min={hoyLima()}
          value={value.fecha}
          onChange={(e) => onChange({ ...value, fecha: e.target.value })}
        />
        <SelectField
          label="Desde"
          required
          value={value.inicio}
          onChange={(e) => onChange({ ...value, inicio: e.target.value })}
          options={HORAS.map((h) => ({ value: h, label: h }))}
        />
        <SelectField
          label="Hasta"
          required
          value={value.fin}
          onChange={(e) => onChange({ ...value, fin: e.target.value })}
          options={HORAS.slice(1).map((h) => ({ value: h, label: h }))}
        />
      </div>
    </>
  );
}

/* ---------------- Nueva reserva ---------------- */

export function NuevaReservaDialog({
  open,
  onClose,
  onCreated,
  canchas,
  initial,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: (r: Reserva) => void;
  canchas: Cancha[];
  initial?: Partial<Horario>;
}) {
  const [horario, setHorario] = useState<Horario>({ canchaId: "", fecha: hoyLima(), inicio: "18:00", fin: "19:00" });
  const [telefono, setTelefono] = useState("");
  const [cliente, setCliente] = useState<Cliente | null>(null);
  const [nombre, setNombre] = useState("");
  const [buscando, setBuscando] = useState(false);
  const [busquedaHecha, setBusquedaHecha] = useState(false);
  const [origen, setOrigen] = useState<OrigenReserva>("PRESENCIAL");
  const [observacion, setObservacion] = useState("");
  const [conPago, setConPago] = useState(false);
  const [metodo, setMetodo] = useState<MetodoPago>("EFECTIVO");
  const [monto, setMonto] = useState("");
  const [nro, setNro] = useState("");

  useOnOpen(open, () => {
    setHorario({
      canchaId: initial?.canchaId ?? canchas[0]?.id ?? "",
      fecha: initial?.fecha ?? hoyLima(),
      inicio: initial?.inicio ?? "18:00",
      fin: initial?.fin ?? "19:00",
    });
    setTelefono("");
    setCliente(null);
    setNombre("");
    setBusquedaHecha(false);
    setOrigen("PRESENCIAL");
    setObservacion("");
    setConPago(false);
    setMetodo("EFECTIVO");
    setMonto("");
    setNro("");
  });

  const buscar = async () => {
    if (!/^9\d{8}$/.test(telefono)) return;
    setBuscando(true);
    try {
      const c = await api.clientes.porTelefono(telefono);
      setCliente(c);
    } catch {
      // 404: cliente nuevo, se registra con nombre + teléfono al reservar.
      setCliente(null);
    } finally {
      setBuscando(false);
      setBusquedaHecha(true);
    }
  };

  const submit = async () => {
    if (horario.canchaId === "") throw new Error("Selecciona una cancha");
    const r = await api.reservas.crear({
      canchaId: horario.canchaId,
      clienteId: cliente?.id,
      clienteNombre: cliente ? undefined : optional(nombre),
      clienteTelefono: cliente ? undefined : optional(telefono),
      inicio: localDateTime(horario.fecha, horario.inicio),
      fin: localDateTime(horario.fecha, horario.fin),
      origen,
      observacion: optional(observacion),
      pagoInicial: conPago
        ? { metodo, monto: toNum(monto), nroOperacion: metodo === "EFECTIVO" ? undefined : optional(nro) }
        : undefined,
    });
    onCreated(r);
  };

  return (
    <FormDialog open={open} title="Nueva reserva" onClose={onClose} onSubmit={submit} submitLabel="Reservar" width={600}>
      <HorarioFields value={horario} onChange={setHorario} canchas={canchas} />

      <div className="border-t border-divider pt-4 text-sm font-medium text-text-2">Cliente</div>
      <div className="flex gap-2 items-end">
        <TextField
          label="Celular"
          className="flex-1"
          required
          inputMode="numeric"
          pattern="9\d{8}"
          maxLength={9}
          hint="9 dígitos, empieza con 9"
          value={telefono}
          onChange={(e) => {
            setTelefono(e.target.value.replace(/\D/g, ""));
            setCliente(null);
            setBusquedaHecha(false);
          }}
          onBlur={() => telefono.length === 9 && !busquedaHecha && buscar()}
        />
        <Button variant="stroked" icon="search" onClick={buscar} loading={buscando} className="mb-5">
          Buscar
        </Button>
      </div>
      {cliente ? (
        <Alert color="primary" icon="person">
          Cliente registrado: <b>{cliente.nombre}</b>
          {cliente.notas && <div className="text-xs mt-1">{cliente.notas}</div>}
        </Alert>
      ) : (
        <TextField
          label="Nombre del cliente"
          required
          maxLength={100}
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          hint={busquedaHecha ? "Cliente nuevo: se registrará con este nombre" : undefined}
        />
      )}

      <div className="grid grid-cols-2 gap-4">
        <SelectField
          label="Origen"
          value={origen}
          onChange={(e) => setOrigen(e.target.value as OrigenReserva)}
          options={enumOptions(ORIGENES_RESERVA)}
        />
        <TextField label="Observación" maxLength={255} value={observacion} onChange={(e) => setObservacion(e.target.value)} />
      </div>

      <Checkbox label="Registrar pago inicial (adelanto)" checked={conPago} onChange={setConPago} />
      {conPago && (
        <>
          <TextField
            label="Monto (S/)"
            type="number"
            step="0.01"
            min="0.01"
            required
            value={monto}
            onChange={(e) => setMonto(e.target.value)}
            hint="Requiere la caja de cancha abierta"
          />
          <MetodoPagoFields metodo={metodo} nroOperacion={nro} onMetodo={setMetodo} onNro={setNro} />
        </>
      )}
    </FormDialog>
  );
}

/* ---------------- Mantenimiento (ADMIN) ---------------- */

export function MantenimientoDialog({
  open,
  onClose,
  onCreated,
  canchas,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: (r: Reserva) => void;
  canchas: Cancha[];
}) {
  const [horario, setHorario] = useState<Horario>({ canchaId: "", fecha: hoyLima(), inicio: "08:00", fin: "10:00" });
  const [motivo, setMotivo] = useState("");

  useOnOpen(open, () => {
    setHorario({ canchaId: canchas[0]?.id ?? "", fecha: hoyLima(), inicio: "08:00", fin: "10:00" });
    setMotivo("");
  });

  const submit = async () => {
    if (horario.canchaId === "") throw new Error("Selecciona una cancha");
    const r = await api.reservas.crearMantenimiento({
      canchaId: horario.canchaId,
      inicio: localDateTime(horario.fecha, horario.inicio),
      fin: localDateTime(horario.fecha, horario.fin),
      motivo: motivo.trim(),
    });
    onCreated(r);
  };

  return (
    <FormDialog open={open} title="Bloquear por mantenimiento" onClose={onClose} onSubmit={submit} submitLabel="Registrar">
      <HorarioFields value={horario} onChange={setHorario} canchas={canchas} />
      <TextArea label="Motivo" required maxLength={255} value={motivo} onChange={(e) => setMotivo(e.target.value)} />
    </FormDialog>
  );
}

/* ---------------- Pago / devolución ---------------- */

export function PagoDialog({
  open,
  onClose,
  reserva,
  devolucion,
  onDone,
}: {
  open: boolean;
  onClose: () => void;
  reserva: Reserva;
  devolucion?: boolean;
  onDone: (p: PagoReserva) => void;
}) {
  const [metodo, setMetodo] = useState<MetodoPago>("EFECTIVO");
  const [monto, setMonto] = useState("");
  const [nro, setNro] = useState("");
  const [voucher, setVoucher] = useState("");

  useOnOpen(open, () => {
    setMetodo("EFECTIVO");
    setNro("");
    setVoucher("");
    const sugerido = devolucion ? (reserva.devolucionSugerida ?? reserva.pagado) : reserva.saldo;
    setMonto(sugerido > 0 ? String(sugerido) : "");
  });

  const submit = async () => {
    const p = await api.reservas.registrarPago(reserva.id, {
      metodo,
      monto: toNum(monto),
      nroOperacion: metodo === "EFECTIVO" ? undefined : optional(nro),
      voucherUrl: optional(voucher),
      devolucion: devolucion || undefined,
    });
    onDone(p);
  };

  return (
    <FormDialog
      open={open}
      title={devolucion ? "Registrar devolución" : "Registrar pago"}
      onClose={onClose}
      onSubmit={submit}
      submitLabel={devolucion ? "Devolver" : "Cobrar"}
      submitColor={devolucion ? "warn" : "primary"}
    >
      {devolucion ? (
        <Alert icon="undo">
          Pagado: <b>{soles(reserva.pagado)}</b>
          {reserva.devolucionSugerida !== null && (
            <>
              {" "}· Devolución sugerida: <b>{soles(reserva.devolucionSugerida)}</b>
            </>
          )}
        </Alert>
      ) : (
        <Alert color="primary" icon="payments">
          Saldo pendiente: <b>{soles(reserva.saldo)}</b>
          {reserva.estado === "PENDIENTE" && reserva.adelantoMinimo !== null && (
            <> · Adelanto mínimo para confirmar: <b>{soles(reserva.adelantoMinimo)}</b></>
          )}
        </Alert>
      )}
      <TextField
        label="Monto (S/)"
        type="number"
        step="0.01"
        min="0.01"
        required
        value={monto}
        onChange={(e) => setMonto(e.target.value)}
      />
      <MetodoPagoFields metodo={metodo} nroOperacion={nro} onMetodo={setMetodo} onNro={setNro} />
      {metodo !== "EFECTIVO" && (
        <TextField label="URL del voucher" type="url" maxLength={500} value={voucher} onChange={(e) => setVoucher(e.target.value)} />
      )}
    </FormDialog>
  );
}

/* ---------------- Reprogramar ---------------- */

export function ReprogramarDialog({
  open,
  onClose,
  reserva,
  onDone,
}: {
  open: boolean;
  onClose: () => void;
  reserva: Reserva;
  onDone: (r: Reserva) => void;
}) {
  const [horario, setHorario] = useState<Horario>({ canchaId: reserva.canchaId, fecha: hoyLima(), inicio: "18:00", fin: "19:00" });

  useOnOpen(open, () => {
    const ini = aLocalLima(reserva.inicio);
    const fin = aLocalLima(reserva.fin);
    setHorario({ canchaId: reserva.canchaId, fecha: ini.slice(0, 10), inicio: ini.slice(11, 16), fin: fin.slice(11, 16) });
  });

  const submit = async () => {
    const r = await api.reservas.reprogramar(
      reserva.id,
      localDateTime(horario.fecha, horario.inicio),
      localDateTime(horario.fecha, horario.fin),
    );
    onDone(r);
  };

  return (
    <FormDialog open={open} title="Reprogramar reserva" onClose={onClose} onSubmit={submit} submitLabel="Reprogramar">
      <HorarioFields value={horario} onChange={setHorario} />
      <Alert>Si el nuevo horario cuesta menos, la diferencia pagada en exceso se devuelve en efectivo desde la caja.</Alert>
    </FormDialog>
  );
}

/* ---------------- Motivo (cancelar / anular) ---------------- */

export function MotivoDialog({
  open,
  title,
  label = "Motivo",
  submitLabel,
  onClose,
  onSubmit,
  children,
}: {
  open: boolean;
  title: string;
  label?: string;
  submitLabel: string;
  onClose: () => void;
  onSubmit: (motivo: string) => Promise<void>;
  children?: React.ReactNode;
}) {
  const [motivo, setMotivo] = useState("");
  useOnOpen(open, () => {
    setMotivo("");
  });
  return (
    <FormDialog
      open={open}
      title={title}
      onClose={onClose}
      onSubmit={() => onSubmit(motivo.trim())}
      submitLabel={submitLabel}
      submitColor="warn"
    >
      {children}
      <TextArea label={label} required maxLength={255} value={motivo} onChange={(e) => setMotivo(e.target.value)} />
    </FormDialog>
  );
}

/* ---------------- Cambiar monto (ADMIN) ---------------- */

export function CambiarMontoDialog({
  open,
  onClose,
  reserva,
  onDone,
}: {
  open: boolean;
  onClose: () => void;
  reserva: Reserva;
  onDone: (r: Reserva) => void;
}) {
  const [monto, setMonto] = useState("");
  const [obs, setObs] = useState("");
  useOnOpen(open, () => {
    setMonto(String(reserva.montoTotal));
    setObs("");
  });
  return (
    <FormDialog
      open={open}
      title="Cambiar monto total"
      onClose={onClose}
      onSubmit={async () => onDone(await api.reservas.cambiarMonto(reserva.id, toNum(monto), obs.trim()))}
    >
      <TextField
        label="Nuevo monto (S/)"
        type="number"
        step="0.01"
        min="0.01"
        required
        value={monto}
        onChange={(e) => setMonto(e.target.value)}
        hint={`No puede ser menor a lo ya pagado (${soles(reserva.pagado)})`}
      />
      <TextArea label="Observación" required maxLength={255} value={obs} onChange={(e) => setObs(e.target.value)} />
    </FormDialog>
  );
}
