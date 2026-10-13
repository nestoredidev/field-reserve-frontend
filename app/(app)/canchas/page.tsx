"use client";

import { useState } from "react";
import { HORAS } from "@/components/reservas";
import { ActivoChip, toNum } from "@/components/shared";
import {
  Button,
  Card,
  CardHeader,
  Checkbox,
  Empty,
  ErrorBanner,
  FormDialog,
  IconButton,
  Loading,
  PageHeader,
  SelectField,
  Table,
  TextField,
  useAction,
  useSnackbar,
} from "@/components/ui";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { DIAS_SEMANA, hhmm, soles } from "@/lib/format";
import { useAsync, useOnOpen } from "@/lib/hooks";
import type { Cancha, Tarifa } from "@/lib/types";

export default function CanchasPage() {
  const { isAdmin } = useAuth();
  const run = useAction();
  const canchas = useAsync(() => api.canchas.listar({ size: 100, sortBy: "nombre" }).then((p) => p.items), []);
  const [editando, setEditando] = useState<Cancha | "nueva" | null>(null);
  const [selId, setSelId] = useState<number | null>(null);

  const sel = canchas.data?.find((c) => c.id === selId) ?? canchas.data?.[0] ?? null;

  const toggle = async (c: Cancha) => {
    const r = await run(() => (c.activa ? api.canchas.desactivar(c.id) : api.canchas.activar(c.id)), c.activa ? "Cancha desactivada" : "Cancha activada");
    if (r) canchas.reload();
  };

  return (
    <>
      <PageHeader
        title="Canchas y tarifas"
        subtitle="Canchas disponibles y precio por hora según día y franja"
        actions={
          isAdmin && (
            <Button icon="add" onClick={() => setEditando("nueva")}>
              Nueva cancha
            </Button>
          )
        }
      />
      {canchas.error && <ErrorBanner message={canchas.error} onRetry={canchas.reload} />}

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <Card className="lg:col-span-2 self-start">
          <CardHeader icon="sports_soccer" title="Canchas" />
          {canchas.loading && !canchas.data ? (
            <Loading />
          ) : !canchas.data?.length ? (
            <Empty icon="sports_soccer" text="Aún no hay canchas" />
          ) : (
            <ul className="pb-2">
              {canchas.data.map((c) => (
                <li
                  key={c.id}
                  onClick={() => setSelId(c.id)}
                  className={`flex items-center gap-3 px-4 py-2 min-h-14 cursor-pointer border-l-4 ${
                    sel?.id === c.id ? "bg-primary-50 border-primary" : "border-transparent hover:bg-hover"
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{c.nombre}</div>
                    {c.descripcion && <div className="text-xs text-text-2 truncate">{c.descripcion}</div>}
                  </div>
                  <ActivoChip activo={c.activa} />
                  {isAdmin && (
                    <div className="flex" onClick={(e) => e.stopPropagation()}>
                      <IconButton icon="edit" title="Editar" onClick={() => setEditando(c)} />
                      <IconButton
                        icon={c.activa ? "toggle_on" : "toggle_off"}
                        color={c.activa ? "primary" : "default"}
                        title={c.activa ? "Desactivar" : "Activar"}
                        onClick={() => toggle(c)}
                      />
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </Card>

        <div className="lg:col-span-3">{sel && <Tarifas key={sel.id} cancha={sel} />}</div>
      </div>

      <CanchaDialog
        cancha={editando}
        onClose={() => setEditando(null)}
        onSaved={(c) => {
          setEditando(null);
          setSelId(c.id);
          canchas.reload();
        }}
      />
    </>
  );
}

function CanchaDialog({
  cancha,
  onClose,
  onSaved,
}: {
  cancha: Cancha | "nueva" | null;
  onClose: () => void;
  onSaved: (c: Cancha) => void;
}) {
  const snack = useSnackbar();
  const [nombre, setNombre] = useState("");
  const [descripcion, setDescripcion] = useState("");
  useOnOpen(cancha, () => {
    setNombre(cancha && cancha !== "nueva" ? cancha.nombre : "");
    setDescripcion(cancha && cancha !== "nueva" ? (cancha.descripcion ?? "") : "");
  });

  return (
    <FormDialog
      open={cancha !== null}
      title={cancha === "nueva" ? "Nueva cancha" : "Editar cancha"}
      onClose={onClose}
      onSubmit={async () => {
        const body = { nombre: nombre.trim(), descripcion: descripcion.trim() || undefined };
        const c = cancha === "nueva" ? await api.canchas.crear(body) : await api.canchas.actualizar((cancha as Cancha).id, body);
        snack(cancha === "nueva" ? "Cancha creada" : "Cancha actualizada");
        onSaved(c);
      }}
    >
      <TextField label="Nombre" required maxLength={80} value={nombre} onChange={(e) => setNombre(e.target.value)} />
      <TextField label="Descripción" maxLength={255} value={descripcion} onChange={(e) => setDescripcion(e.target.value)} />
    </FormDialog>
  );
}

function Tarifas({ cancha }: { cancha: Cancha }) {
  const { isAdmin } = useAuth();
  const run = useAction();
  const snack = useSnackbar();
  const [soloActivas, setSoloActivas] = useState(true);
  const tarifas = useAsync(() => api.canchas.tarifas(cancha.id, soloActivas), [cancha.id, soloActivas]);
  const [nueva, setNueva] = useState(false);
  const [precio, setPrecio] = useState<Tarifa | null>(null);

  const [dia, setDia] = useState("");
  const [desde, setDesde] = useState("08:00");
  const [hasta, setHasta] = useState("23:00");
  const [monto, setMonto] = useState("");
  const [nuevoPrecio, setNuevoPrecio] = useState("");

  const ordenadas = [...(tarifas.data ?? [])].sort(
    (a, b) => (a.diaSemana ?? 0) - (b.diaSemana ?? 0) || a.horaInicio.localeCompare(b.horaInicio),
  );

  return (
    <Card>
      <CardHeader
        icon="sell"
        title={`Tarifas · ${cancha.nombre}`}
        subtitle="La tarifa de un día específico tiene prioridad sobre la de todos los días"
        actions={
          <>
            <Checkbox label="Solo activas" checked={soloActivas} onChange={setSoloActivas} />
            {isAdmin && (
              <Button
                icon="add"
                variant="stroked"
                onClick={() => {
                  setDia("");
                  setDesde("08:00");
                  setHasta("23:00");
                  setMonto("");
                  setNueva(true);
                }}
              >
                Tarifa
              </Button>
            )}
          </>
        }
      />
      {tarifas.error && (
        <div className="px-4">
          <ErrorBanner message={tarifas.error} onRetry={tarifas.reload} />
        </div>
      )}
      {tarifas.loading && !tarifas.data ? (
        <Loading />
      ) : !ordenadas.length ? (
        <Empty icon="sell" text="Sin tarifas: la cancha no se puede reservar" />
      ) : (
        <Table>
          <thead>
            <tr>
              <th>Día</th>
              <th>Franja</th>
              <th className="num">Precio / hora</th>
              <th>Estado</th>
              {isAdmin && <th />}
            </tr>
          </thead>
          <tbody>
            {ordenadas.map((t) => (
              <tr key={t.id}>
                <td className="whitespace-nowrap">{t.diaSemana ? DIAS_SEMANA[t.diaSemana] : <em className="text-text-2">Todos los días</em>}</td>
                <td className="tabular-nums whitespace-nowrap">
                  {hhmm(t.horaInicio)} – {hhmm(t.horaFin)}
                </td>
                <td className="num font-medium">{soles(t.precioHora)}</td>
                <td>
                  <ActivoChip activo={t.activa} />
                </td>
                {isAdmin && (
                  <td className="text-right whitespace-nowrap">
                    {t.activa && (
                      <>
                        <IconButton
                          icon="price_change"
                          title="Cambiar precio"
                          color="primary"
                          onClick={() => {
                            setNuevoPrecio(String(t.precioHora));
                            setPrecio(t);
                          }}
                        />
                        <IconButton
                          icon="block"
                          title="Desactivar"
                          color="warn"
                          onClick={async () => {
                            if (await run(() => api.tarifas.desactivar(t.id), "Tarifa desactivada")) tarifas.reload();
                          }}
                        />
                      </>
                    )}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </Table>
      )}

      <FormDialog
        open={nueva}
        title="Nueva tarifa"
        onClose={() => setNueva(false)}
        onSubmit={async () => {
          await api.canchas.crearTarifa(cancha.id, {
            diaSemana: dia ? Number(dia) : null,
            horaInicio: `${desde}:00`,
            horaFin: `${hasta}:00`,
            precioHora: toNum(monto),
          });
          snack("Tarifa creada");
          setNueva(false);
          tarifas.reload();
        }}
      >
        <SelectField
          label="Día"
          value={dia}
          onChange={(e) => setDia(e.target.value)}
          placeholder="Todos los días"
          options={DIAS_SEMANA.slice(1).map((d, i) => ({ value: i + 1, label: d }))}
        />
        <div className="grid grid-cols-2 gap-4">
          <SelectField label="Desde" value={desde} onChange={(e) => setDesde(e.target.value)} options={HORAS.map((h) => ({ value: h, label: h }))} />
          <SelectField label="Hasta" value={hasta} onChange={(e) => setHasta(e.target.value)} options={HORAS.slice(1).map((h) => ({ value: h, label: h }))} />
        </div>
        <TextField label="Precio por hora (S/)" type="number" step="0.01" min="0.01" required value={monto} onChange={(e) => setMonto(e.target.value)} />
      </FormDialog>

      <FormDialog
        open={precio !== null}
        title="Cambiar precio"
        onClose={() => setPrecio(null)}
        onSubmit={async () => {
          await api.tarifas.cambiarPrecio(precio!.id, toNum(nuevoPrecio));
          snack("Se desactivó la tarifa anterior y se creó una nueva");
          setPrecio(null);
          tarifas.reload();
        }}
      >
        <p className="text-text-2 text-sm">
          {precio && (
            <>
              {precio.diaSemana ? DIAS_SEMANA[precio.diaSemana] : "Todos los días"}, {hhmm(precio.horaInicio)} – {hhmm(precio.horaFin)}. Precio actual:{" "}
              {soles(precio.precioHora)}
            </>
          )}
        </p>
        <TextField label="Nuevo precio por hora (S/)" type="number" step="0.01" min="0.01" required value={nuevoPrecio} onChange={(e) => setNuevoPrecio(e.target.value)} />
      </FormDialog>
    </Card>
  );
}
