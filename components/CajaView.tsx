"use client";

import { useState } from "react";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { etiqueta, fecha, fechaHora, soles } from "@/lib/format";
import { useAsync, usePaged, useOnOpen } from "@/lib/hooks";
import type { Caja, MetodoPago, TipoMovimientoCaja } from "@/lib/types";
import { METODOS_PAGO } from "@/lib/types";
import { EstadoChip, enumOptions, toNum } from "./shared";
import {
  Alert,
  Button,
  Card,
  CardHeader,
  Dialog,
  Empty,
  ErrorBanner,
  FormDialog,
  IconButton,
  Loading,
  PageHeader,
  Paginator,
  SelectField,
  Stat,
  Table,
  Tabs,
  TextArea,
  TextField,
  useSnackbar,
} from "./ui";

type Area = "cancha" | "bodega";

/** Caja de cancha y caja de bodega comparten flujo: abrir, movimientos, cerrar con arqueo. */
export function CajaView({ area }: { area: Area }) {
  const cajas = api.cajas(area);
  const [tab, setTab] = useState<"actual" | "historial">("actual");
  const titulo = area === "cancha" ? "Caja de cancha" : "Caja de bodega";
  const subtitulo =
    area === "cancha"
      ? "Cobros de reservas, ingresos y egresos del día"
      : "Ventas de bodega, compras pagadas desde caja e ingresos/egresos";

  const actual = useAsync(
    () =>
      cajas.actual().catch((e) => {
        // Sin caja abierta el backend responde con error de dominio: se muestra el formulario de apertura.
        if (e instanceof ApiError && e.status >= 400 && e.status < 500 && e.status !== 401 && e.status !== 403) return null;
        throw e;
      }),
    [area],
  );

  return (
    <>
      <PageHeader title={titulo} subtitle={subtitulo} />
      <Tabs
        value={tab}
        onChange={setTab}
        tabs={[
          { value: "actual", label: "Caja actual", icon: "point_of_sale" },
          { value: "historial", label: "Historial", icon: "history" },
        ]}
      />
      {tab === "actual" ? (
        actual.loading && actual.data === null && !actual.error ? (
          <Loading />
        ) : actual.error ? (
          <ErrorBanner message={actual.error} onRetry={actual.reload} />
        ) : actual.data ? (
          <CajaAbierta area={area} caja={actual.data} onChange={actual.reload} />
        ) : (
          <AbrirCaja area={area} onOpened={actual.reload} />
        )
      ) : (
        <Historial area={area} />
      )}
    </>
  );
}

function AbrirCaja({ area, onOpened }: { area: Area; onOpened: () => void }) {
  const snack = useSnackbar();
  const [monto, setMonto] = useState("0");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  return (
    <Card className="max-w-md">
      <CardHeader icon="lock_open" title="No hay caja abierta" subtitle="Ábrela con el efectivo inicial para registrar cobros" />
      <form
        className="flex flex-col gap-4 p-4"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setError(null);
          try {
            await api.cajas(area).abrir(toNum(monto));
            snack("Caja abierta");
            onOpened();
          } catch (err) {
            setError(err instanceof Error ? (err instanceof ApiError ? err.detail : err.message) : "Error");
          } finally {
            setBusy(false);
          }
        }}
      >
        <TextField label="Monto de apertura (S/)" type="number" step="0.01" min="0" required value={monto} onChange={(e) => setMonto(e.target.value)} />
        {error && <ErrorBanner message={error} />}
        <Button type="submit" icon="lock_open" loading={busy}>
          Abrir caja
        </Button>
      </form>
    </Card>
  );
}

function CajaAbierta({ area, caja, onChange }: { area: Area; caja: Caja; onChange: () => void }) {
  const { isAdmin } = useAuth();
  const snack = useSnackbar();
  const [mov, setMov] = useState<TipoMovimientoCaja | null>(null);
  const [cerrar, setCerrar] = useState(false);
  const [version, setVersion] = useState(0);

  const [metodo, setMetodo] = useState<MetodoPago>("EFECTIVO");
  const [concepto, setConcepto] = useState("");
  const [monto, setMonto] = useState("");
  const [contado, setContado] = useState("");
  const [obs, setObs] = useState("");

  useOnOpen(mov, () => {
    setMetodo("EFECTIVO");
    setConcepto("");
    setMonto("");
  });
  useOnOpen(cerrar, () => {
    setContado("");
    setObs("");
  });

  const efectivoTeorico =
    Number(caja.montoApertura) + Number(caja.cobrosEfectivo) + Number(caja.otrosIngresosEfectivo) - Number(caja.egresosEfectivo);

  return (
    <>
      {caja.advertencia && (
        <div className="mb-4">
          <Alert icon="warning">{caja.advertencia}</Alert>
        </div>
      )}
      <Card className="mb-6">
        <CardHeader
          icon="point_of_sale"
          title={`Caja #${caja.id} · ${fecha(caja.fecha)}`}
          subtitle={`Abierta el ${fechaHora(caja.abiertaAt)}`}
          actions={
            <>
              <EstadoChip estado={caja.estado} />
              <Button variant="stroked" icon="add" onClick={() => setMov("INGRESO")}>
                Ingreso
              </Button>
              <Button variant="stroked" color="warn" icon="remove" onClick={() => setMov("EGRESO")}>
                Egreso
              </Button>
              <Button color="accent" icon="lock" onClick={() => setCerrar(true)}>
                Cerrar caja
              </Button>
            </>
          }
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 p-4">
          <Stat label="Apertura" value={soles(caja.montoApertura)} />
          <Stat label={area === "cancha" ? "Cobros efectivo" : "Ventas efectivo"} value={soles(caja.cobrosEfectivo)} color="success" />
          <Stat label={area === "cancha" ? "Cobros digitales" : "Ventas digitales"} value={soles(caja.cobrosDigitales)} color="success" />
          <Stat label="Otros ingresos" value={soles(caja.otrosIngresosEfectivo)} color="success" />
          <Stat label="Egresos efectivo" value={soles(caja.egresosEfectivo)} color="warn" />
          <Stat label="Efectivo esperado" value={soles(caja.efectivoEsperado ?? efectivoTeorico)} color="accent" />
        </div>
      </Card>

      <Movimientos key={`${caja.id}-${version}`} area={area} cajaId={caja.id} />

      <FormDialog
        open={mov !== null}
        title={mov === "INGRESO" ? "Registrar ingreso" : "Registrar egreso"}
        submitColor={mov === "EGRESO" ? "warn" : "primary"}
        onClose={() => setMov(null)}
        onSubmit={async () => {
          await api.cajas(area).registrarMovimiento({ tipo: mov!, metodo, concepto: concepto.trim(), monto: toNum(monto) });
          snack("Movimiento registrado");
          setMov(null);
          setVersion((v) => v + 1);
          onChange();
        }}
      >
        <TextField label="Concepto" required maxLength={150} value={concepto} onChange={(e) => setConcepto(e.target.value)} />
        <div className="grid grid-cols-2 gap-4">
          <TextField label="Monto (S/)" type="number" step="0.01" min="0.01" required value={monto} onChange={(e) => setMonto(e.target.value)} />
          <SelectField label="Método" value={metodo} onChange={(e) => setMetodo(e.target.value as MetodoPago)} options={enumOptions(METODOS_PAGO)} />
        </div>
      </FormDialog>

      <FormDialog
        open={cerrar}
        title="Cerrar caja"
        submitLabel="Cerrar caja"
        submitColor="accent"
        onClose={() => setCerrar(false)}
        onSubmit={async () => {
          const c = await api.cajas(area).cerrar(toNum(contado), obs.trim() || undefined);
          setCerrar(false);
          snack(
            c.diferencia !== null && c.diferencia !== undefined
              ? `Caja cerrada · diferencia ${soles(c.diferencia)}`
              : "Caja cerrada",
          );
          onChange();
        }}
      >
        <Alert color="primary" icon="calculate">
          Cuenta el efectivo físico de la caja e ingrésalo.{" "}
          {isAdmin && caja.efectivoEsperado !== null && <>Efectivo esperado: <b>{soles(caja.efectivoEsperado)}</b></>}
        </Alert>
        <TextField label="Efectivo contado (S/)" type="number" step="0.01" min="0" required value={contado} onChange={(e) => setContado(e.target.value)} />
        <TextArea label="Observación" maxLength={255} value={obs} onChange={(e) => setObs(e.target.value)} />
      </FormDialog>
    </>
  );
}

function Movimientos({ area, cajaId }: { area: Area; cajaId: number }) {
  const res = usePaged((page, size) => api.cajas(area).movimientos(cajaId, { page, size, sortBy: "fecha", direction: "desc" }), [area, cajaId]);
  return (
    <Card>
      <CardHeader icon="swap_vert" title="Movimientos" subtitle="Ingresos y egresos manuales de esta caja" />
      {res.error && (
        <div className="px-4">
          <ErrorBanner message={res.error} onRetry={res.reload} />
        </div>
      )}
      {res.loading && !res.data ? (
        <Loading />
      ) : !res.data?.items.length ? (
        <Empty icon="swap_vert" text="Sin movimientos" />
      ) : (
        <>
          <Table>
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Tipo</th>
                <th>Concepto</th>
                <th>Método</th>
                <th className="num">Monto</th>
              </tr>
            </thead>
            <tbody>
              {res.data.items.map((m) => (
                <tr key={m.id}>
                  <td>{fechaHora(m.fecha)}</td>
                  <td>
                    <span className={m.tipo === "INGRESO" ? "text-[#2e7d32]" : "text-warn"}>{etiqueta(m.tipo)}</span>
                  </td>
                  <td>{m.concepto}</td>
                  <td>{etiqueta(m.metodo)}</td>
                  <td className={`num ${m.tipo === "EGRESO" ? "text-warn" : ""}`}>
                    {m.tipo === "EGRESO" ? "−" : ""}
                    {soles(m.monto)}
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
          <Paginator page={res.page} size={res.size} total={res.data.totalElements} onPage={res.setPage} onSize={res.setSize} />
        </>
      )}
    </Card>
  );
}

function Historial({ area }: { area: Area }) {
  const res = usePaged((page, size) => api.cajas(area).listar({ page, size, sortBy: "abiertaAt", direction: "desc" }), [area]);
  const [ver, setVer] = useState<Caja | null>(null);
  return (
    <Card>
      {res.error && (
        <div className="px-4 pt-4">
          <ErrorBanner message={res.error} onRetry={res.reload} />
        </div>
      )}
      {res.loading && !res.data ? (
        <Loading />
      ) : !res.data?.items.length ? (
        <Empty icon="history" text="Sin cajas registradas" />
      ) : (
        <>
          <Table>
            <thead>
              <tr>
                <th>#</th>
                <th>Fecha</th>
                <th>Estado</th>
                <th>Apertura</th>
                <th>Cierre</th>
                <th className="num">Monto apertura</th>
                <th className="num">Contado al cierre</th>
                <th className="num">Diferencia</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {res.data.items.map((c) => (
                <tr key={c.id}>
                  <td>#{c.id}</td>
                  <td>{fecha(c.fecha)}</td>
                  <td>
                    <EstadoChip estado={c.estado} />
                  </td>
                  <td>{fechaHora(c.abiertaAt)}</td>
                  <td>{fechaHora(c.cerradaAt)}</td>
                  <td className="num">{soles(c.montoApertura)}</td>
                  <td className="num">{soles(c.montoCierreContado)}</td>
                  <td className={`num ${c.diferencia && Number(c.diferencia) < 0 ? "text-warn" : ""}`}>{soles(c.diferencia)}</td>
                  <td className="text-right">
                    <IconButton icon="visibility" title="Ver detalle" onClick={() => setVer(c)} />
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
          <Paginator page={res.page} size={res.size} total={res.data.totalElements} onPage={res.setPage} onSize={res.setSize} />
        </>
      )}
      <Dialog
        open={ver !== null}
        title={ver ? `Caja #${ver.id} · ${fecha(ver.fecha)}` : ""}
        onClose={() => setVer(null)}
        width={820}
        actions={
          <Button variant="basic" onClick={() => setVer(null)}>
            Cerrar
          </Button>
        }
      >
        {ver && (
          <div className="flex flex-col gap-4 pb-2">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <Stat label="Cobros efectivo" value={soles(ver.cobrosEfectivo)} />
              <Stat label="Cobros digitales" value={soles(ver.cobrosDigitales)} />
              <Stat label="Otros ingresos" value={soles(ver.otrosIngresosEfectivo)} />
              <Stat label="Egresos" value={soles(ver.egresosEfectivo)} />
              <Stat label="Esperado" value={soles(ver.efectivoEsperado)} />
              <Stat label="Diferencia" value={soles(ver.diferencia)} />
            </div>
            {ver.observacion && <Alert color="primary">{ver.observacion}</Alert>}
            <Movimientos area={area} cajaId={ver.id} />
          </div>
        )}
      </Dialog>
    </Card>
  );
}
