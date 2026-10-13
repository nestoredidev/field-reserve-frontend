"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { MotivoDialog } from "@/components/reservas";
import { EstadoChip, enumOptions, toNum } from "@/components/shared";
import {
  Alert,
  Button,
  Card,
  CardHeader,
  Checkbox,
  Dialog,
  Empty,
  ErrorBanner,
  Icon,
  IconButton,
  Loading,
  PageHeader,
  Paginator,
  SelectField,
  Table,
  Tabs,
  TextField,
  useSnackbar,
} from "@/components/ui";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { etiqueta, fechaHora, hoyLima, soles } from "@/lib/format";
import { errorText, useAsync, usePaged } from "@/lib/hooks";
import type { EstadoVenta, MetodoPago, Producto, Venta } from "@/lib/types";
import { METODOS_PAGO } from "@/lib/types";

export default function VentasPage() {
  const [tab, setTab] = useState<"pos" | "historial">("pos");
  return (
    <>
      <PageHeader title="Ventas" subtitle="Punto de venta de la bodega" />
      <Tabs
        value={tab}
        onChange={setTab}
        tabs={[
          { value: "pos", label: "Nueva venta", icon: "point_of_sale" },
          { value: "historial", label: "Historial", icon: "receipt_long" },
        ]}
      />
      {tab === "pos" ? <PuntoDeVenta /> : <Historial />}
    </>
  );
}

/* ---------------- Punto de venta ---------------- */

type Linea = { producto: Producto; cantidad: number; envaseEntregado: boolean };
type Pago = { metodo: MetodoPago; monto: string; nroOperacion: string };

function PuntoDeVenta() {
  const snack = useSnackbar();
  const [texto, setTexto] = useState("");
  const [q, setQ] = useState("");
  const [lineas, setLineas] = useState<Linea[]>([]);
  const [pagos, setPagos] = useState<Pago[]>([{ metodo: "EFECTIVO", monto: "", nroOperacion: "" }]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ultima, setUltima] = useState<Venta | null>(null);
  const buscador = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const t = setTimeout(() => setQ(texto.trim()), 250);
    return () => clearTimeout(t);
  }, [texto]);

  const caja = useAsync(() => api.cajas("bodega").actual().catch(() => null), []);
  const resultados = useAsync(
    () => api.productos.listar({ q: q || undefined, activo: true, size: 12, sortBy: "nombre" }).then((p) => p.items),
    [q],
  );
  const envases = useAsync(() => api.productos.listar({ tipo: "ENVASE", size: 100 }).then((p) => p.items), []);

  const agregar = (p: Producto) => {
    setUltima(null);
    setLineas((ls) => {
      const i = ls.findIndex((l) => l.producto.id === p.id);
      if (i >= 0) return ls.map((l, j) => (j === i ? { ...l, cantidad: l.cantidad + 1 } : l));
      return [...ls, { producto: p, cantidad: 1, envaseEntregado: true }];
    });
  };

  const porCodigo = async () => {
    const codigo = texto.trim();
    if (!codigo) return;
    try {
      agregar(await api.productos.porCodigoBarras(codigo));
      setTexto("");
    } catch (e) {
      if (e instanceof ApiError && e.status === 404) {
        if (resultados.data?.length === 1) {
          agregar(resultados.data[0]);
          setTexto("");
        }
      } else snack(errorText(e), true);
    }
  };

  const precioEnvase = (id: number | null) => (id ? Number(envases.data?.find((e) => e.id === id)?.precioVenta ?? 0) : 0);
  const total = useMemo(
    () =>
      lineas.reduce(
        (acc, l) =>
          acc +
          l.cantidad * Number(l.producto.precioVenta) +
          (l.producto.envaseId && !l.envaseEntregado ? l.cantidad * precioEnvase(l.producto.envaseId) : 0),
        0,
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [lineas, envases.data],
  );
  const pagado = pagos.reduce((acc, p) => acc + (p.monto ? toNum(p.monto) : 0), 0);
  const unSoloPago = pagos.length === 1;
  const montoPagos = unSoloPago && !pagos[0].monto ? total : pagado;

  const cobrar = async () => {
    setBusy(true);
    setError(null);
    try {
      const v = await api.ventas.crear({
        detalles: lineas.map((l) => ({
          productoId: l.producto.id,
          cantidad: l.cantidad,
          envaseEntregado: l.producto.envaseId ? l.envaseEntregado : undefined,
        })),
        pagos: pagos.map((p) => ({
          metodo: p.metodo,
          monto: unSoloPago && !p.monto ? Math.round(total * 100) / 100 : toNum(p.monto),
          nroOperacion: p.metodo === "EFECTIVO" ? undefined : p.nroOperacion.trim() || undefined,
        })),
      });
      setUltima(v);
      setLineas([]);
      setPagos([{ metodo: "EFECTIVO", monto: "", nroOperacion: "" }]);
      snack(`Venta #${v.id} registrada por ${soles(v.total)}`);
      resultados.reload();
      buscador.current?.focus();
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      {!caja.loading && !caja.data && (
        <div className="mb-4">
          <Alert color="warn" icon="lock">
            No hay caja de bodega abierta. Ábrela en <Link href="/bodega/caja" className="underline font-medium">Caja de bodega</Link> antes de vender.
          </Alert>
        </div>
      )}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <Card className="lg:col-span-3 self-start">
          <div className="p-4">
            <div className="mat-field">
              <label>Buscar producto o escanear código de barras</label>
              <div className="relative">
                <Icon name="qr_code_scanner" className="absolute left-3 top-1/2 -translate-y-1/2 text-text-2" size={20} />
                <input
                  ref={buscador}
                  autoFocus
                  className="w-full !pl-10"
                  value={texto}
                  onChange={(e) => setTexto(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      porCodigo();
                    }
                  }}
                  placeholder="Nombre o código + Enter"
                />
              </div>
            </div>
          </div>
          {resultados.loading && !resultados.data ? (
            <Loading />
          ) : !resultados.data?.length ? (
            <Empty icon="search_off" text="Sin productos" />
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 px-4 pb-4">
              {resultados.data.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => agregar(p)}
                  disabled={p.stock <= 0}
                  className="text-left rounded border border-divider p-3 hover:bg-primary-50 hover:border-primary-light transition cursor-pointer disabled:opacity-40 disabled:cursor-default"
                >
                  <div className="font-medium leading-tight line-clamp-2">{p.nombre}</div>
                  <div className="flex justify-between items-end mt-2">
                    <span className="text-primary font-medium">{soles(p.precioVenta)}</span>
                    <span className={`text-xs ${p.stockBajo ? "text-warn" : "text-text-2"}`}>Stock {p.stock}</span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </Card>

        <Card className="lg:col-span-2 self-start">
          <CardHeader icon="shopping_cart" title="Carrito" subtitle={`${lineas.length} producto(s)`} />
          {ultima && (
            <div className="px-4 pb-2">
              <Alert color="primary" icon="check_circle">
                Venta #{ultima.id} registrada · {soles(ultima.total)}
              </Alert>
            </div>
          )}
          {!lineas.length ? (
            <Empty icon="remove_shopping_cart" text="Agrega productos desde la izquierda" />
          ) : (
            <ul className="px-4">
              {lineas.map((l, i) => (
                <li key={l.producto.id} className="py-3 border-b border-divider">
                  <div className="flex items-center gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">{l.producto.nombre}</div>
                      <div className="text-xs text-text-2">{soles(l.producto.precioVenta)} c/u</div>
                    </div>
                    <IconButton
                      icon="remove"
                      title="Quitar uno"
                      onClick={() => setLineas((ls) => ls.flatMap((x, j) => (j !== i ? [x] : x.cantidad > 1 ? [{ ...x, cantidad: x.cantidad - 1 }] : [])))}
                    />
                    <input
                      type="number"
                      min={1}
                      value={l.cantidad}
                      onChange={(e) => {
                        const n = Math.max(1, Number(e.target.value) || 1);
                        setLineas((ls) => ls.map((x, j) => (j === i ? { ...x, cantidad: n } : x)));
                      }}
                      className="w-14 text-center border border-divider rounded h-8"
                    />
                    <IconButton icon="add" title="Agregar uno" onClick={() => setLineas((ls) => ls.map((x, j) => (j === i ? { ...x, cantidad: x.cantidad + 1 } : x)))} />
                    <span className="w-20 text-right tabular-nums font-medium">{soles(l.cantidad * Number(l.producto.precioVenta))}</span>
                    <IconButton icon="close" title="Quitar" color="warn" onClick={() => setLineas((ls) => ls.filter((_, j) => j !== i))} />
                  </div>
                  {l.producto.envaseId && (
                    <div className="mt-1 text-sm flex items-center justify-between">
                      <Checkbox
                        label="Entregó envase vacío"
                        checked={l.envaseEntregado}
                        onChange={(v) => setLineas((ls) => ls.map((x, j) => (j === i ? { ...x, envaseEntregado: v } : x)))}
                      />
                      {!l.envaseEntregado && (
                        <span className="text-xs text-text-2">+ garantía {soles(l.cantidad * precioEnvase(l.producto.envaseId))}</span>
                      )}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}

          <div className="p-4 flex flex-col gap-3">
            <div className="flex justify-between items-baseline">
              <span className="text-text-2">Total</span>
              <span className="text-2xl font-medium tabular-nums">{soles(total)}</span>
            </div>

            <div className="text-sm font-medium text-text-2 mt-2">Pagos</div>
            {pagos.map((p, i) => (
              <div key={i} className="grid grid-cols-[1fr_1fr_auto] gap-2 items-end">
                <SelectField
                  label="Método"
                  value={p.metodo}
                  onChange={(e) => setPagos((ps) => ps.map((x, j) => (j === i ? { ...x, metodo: e.target.value as MetodoPago } : x)))}
                  options={enumOptions(METODOS_PAGO)}
                />
                <TextField
                  label="Monto"
                  type="number"
                  step="0.01"
                  min="0.01"
                  placeholder={unSoloPago ? total.toFixed(2) : ""}
                  value={p.monto}
                  onChange={(e) => setPagos((ps) => ps.map((x, j) => (j === i ? { ...x, monto: e.target.value } : x)))}
                />
                {pagos.length > 1 ? (
                  <IconButton icon="delete" title="Quitar pago" onClick={() => setPagos((ps) => ps.filter((_, j) => j !== i))} />
                ) : (
                  <span className="w-10" />
                )}
                {p.metodo !== "EFECTIVO" && (
                  <TextField
                    label="Nro. de operación"
                    className="col-span-2"
                    maxLength={30}
                    value={p.nroOperacion}
                    onChange={(e) => setPagos((ps) => ps.map((x, j) => (j === i ? { ...x, nroOperacion: e.target.value } : x)))}
                  />
                )}
              </div>
            ))}
            <Button
              variant="basic"
              icon="add"
              className="self-start"
              disabled={pagos.length >= 10}
              onClick={() => setPagos((ps) => [...ps, { metodo: "YAPE", monto: "", nroOperacion: "" }])}
            >
              Pago mixto
            </Button>
            {!unSoloPago && Math.abs(montoPagos - total) > 0.005 && (
              <Alert>Los pagos suman {soles(montoPagos)}; el total es {soles(total)}.</Alert>
            )}
            {error && <ErrorBanner message={error} />}
            <Button color="accent" icon="payments" className="h-11" disabled={!lineas.length} loading={busy} onClick={cobrar}>
              Cobrar {soles(total)}
            </Button>
          </div>
        </Card>
      </div>
    </>
  );
}

/* ---------------- Historial ---------------- */

function Historial() {
  const { isAdmin } = useAuth();
  const snack = useSnackbar();
  const [estado, setEstado] = useState("");
  const [desde, setDesde] = useState(hoyLima());
  const [hasta, setHasta] = useState("");
  const [ver, setVer] = useState<number | null>(null);
  const [anular, setAnular] = useState<Venta | null>(null);

  const res = usePaged(
    (page, size) =>
      api.ventas.listar({
        page,
        size,
        sortBy: "fecha",
        direction: "desc",
        estado: (estado || undefined) as EstadoVenta | undefined,
        desde: desde || undefined,
        hasta: hasta || undefined,
      }),
    [estado, desde, hasta],
  );
  const detalle = useAsync(() => (ver ? api.ventas.obtener(ver) : Promise.resolve(null)), [ver]);

  return (
    <Card>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 max-w-3xl">
        <SelectField label="Estado" value={estado} onChange={(e) => setEstado(e.target.value)} placeholder="Todos" options={enumOptions(["REGISTRADA", "ANULADA"] as const)} />
        <TextField label="Desde" type="date" value={desde} onChange={(e) => setDesde(e.target.value)} />
        <TextField label="Hasta" type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} />
      </div>
      {res.error && (
        <div className="px-4">
          <ErrorBanner message={res.error} onRetry={res.reload} />
        </div>
      )}
      {res.loading && !res.data ? (
        <Loading />
      ) : !res.data?.items.length ? (
        <Empty icon="receipt_long" text="Sin ventas" />
      ) : (
        <>
          <Table>
            <thead>
              <tr>
                <th>#</th>
                <th>Fecha</th>
                <th>Caja</th>
                <th>Estado</th>
                <th className="num">Total</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {res.data.items.map((v) => (
                <tr key={v.id}>
                  <td>#{v.id}</td>
                  <td>{fechaHora(v.fecha)}</td>
                  <td>#{v.cajaId}</td>
                  <td>
                    <EstadoChip estado={v.estado} />
                  </td>
                  <td className="num font-medium">{soles(v.total)}</td>
                  <td className="text-right whitespace-nowrap">
                    <IconButton icon="visibility" title="Ver detalle" onClick={() => setVer(v.id)} />
                    {isAdmin && v.estado === "REGISTRADA" && <IconButton icon="block" title="Anular" color="warn" onClick={() => setAnular(v)} />}
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
        title={`Venta #${ver ?? ""}`}
        onClose={() => setVer(null)}
        width={640}
        actions={
          <Button variant="basic" onClick={() => setVer(null)}>
            Cerrar
          </Button>
        }
      >
        {detalle.loading || !detalle.data ? (
          detalle.error ? <ErrorBanner message={detalle.error} /> : <Loading />
        ) : (
          <VentaDetalle venta={detalle.data} />
        )}
      </Dialog>

      <MotivoDialog
        open={anular !== null}
        title={`Anular venta #${anular?.id ?? ""}`}
        submitLabel="Anular venta"
        onClose={() => setAnular(null)}
        onSubmit={async (motivo) => {
          await api.ventas.anular(anular!.id, motivo);
          snack("Venta anulada: stock y caja revertidos");
          setAnular(null);
          res.reload();
        }}
      >
        <Alert>Solo se anulan ventas cuya caja sigue abierta. El stock vuelve al inventario.</Alert>
      </MotivoDialog>
    </Card>
  );
}

function VentaDetalle({ venta }: { venta: Venta }) {
  return (
    <div className="flex flex-col gap-4 pb-2">
      <div className="flex items-center gap-3 text-sm text-text-2">
        <span>{fechaHora(venta.fecha)}</span>
        <EstadoChip estado={venta.estado} />
      </div>
      {venta.motivoAnulacion && <Alert color="warn">Motivo de anulación: {venta.motivoAnulacion}</Alert>}
      <Table>
        <thead>
          <tr>
            <th>Producto</th>
            <th className="num">Cant.</th>
            <th className="num">Precio</th>
            <th className="num">Subtotal</th>
          </tr>
        </thead>
        <tbody>
          {venta.detalles?.map((d) => (
            <tr key={d.id}>
              <td>{d.productoNombre}</td>
              <td className="num">{d.cantidad}</td>
              <td className="num">{soles(d.precioUnitario)}</td>
              <td className="num">{soles(d.subtotal)}</td>
            </tr>
          ))}
          <tr>
            <td colSpan={3} className="text-right font-medium">
              Total
            </td>
            <td className="num font-medium">{soles(venta.total)}</td>
          </tr>
        </tbody>
      </Table>
      <div>
        <div className="text-sm font-medium text-text-2 mb-1">Pagos</div>
        {venta.pagos?.map((p) => (
          <div key={p.id} className="flex justify-between py-1">
            <span>
              {etiqueta(p.metodo)}
              {p.nroOperacion && <span className="text-text-2"> · Op. {p.nroOperacion}</span>}
            </span>
            <span className="tabular-nums">{soles(p.monto)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
