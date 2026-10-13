"use client";

import { useState } from "react";
import { MotivoDialog } from "@/components/reservas";
import { EstadoChip, enumOptions, optional, toNum, useProveedores } from "@/components/shared";
import {
  Alert,
  Button,
  Checkbox,
  Card,
  Dialog,
  Empty,
  ErrorBanner,
  FormDialog,
  IconButton,
  Loading,
  PageHeader,
  Paginator,
  SelectField,
  Table,
  TextField,
  useSnackbar,
} from "@/components/ui";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { fechaHora, soles } from "@/lib/format";
import { useAsync, usePaged, useOnOpen } from "@/lib/hooks";
import type { Compra, EstadoCompra, Producto } from "@/lib/types";

type Linea = { productoId: string; cajas: string; sueltas: string; costo: string };
const lineaVacia = (): Linea => ({ productoId: "", cajas: "0", sueltas: "0", costo: "" });

export default function ComprasPage() {
  const { isAdmin } = useAuth();
  const snack = useSnackbar();
  const proveedores = useProveedores();
  const productos = useAsync(() => api.productos.listar({ activo: true, size: 100, sortBy: "nombre" }).then((p) => p.items), []);
  const [proveedorId, setProveedorId] = useState("");
  const [estado, setEstado] = useState("");
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");
  const [nueva, setNueva] = useState(false);
  const [ver, setVer] = useState<number | null>(null);
  const [anular, setAnular] = useState<Compra | null>(null);

  const res = usePaged(
    (page, size) =>
      api.compras.listar({
        page,
        size,
        sortBy: "fecha",
        direction: "desc",
        proveedorId: proveedorId ? Number(proveedorId) : undefined,
        estado: (estado || undefined) as EstadoCompra | undefined,
        desde: desde || undefined,
        hasta: hasta || undefined,
      }),
    [proveedorId, estado, desde, hasta],
  );
  const detalle = useAsync(() => (ver ? api.compras.obtener(ver) : Promise.resolve(null)), [ver]);
  const provNombre = (id: number | null) => (id ? (proveedores.data?.find((p) => p.id === id)?.nombre ?? `#${id}`) : "—");
  const prodNombre = (id: number) => productos.data?.find((p) => p.id === id)?.nombre ?? `#${id}`;

  return (
    <>
      <PageHeader
        title="Compras"
        subtitle="Ingreso de mercadería al inventario"
        actions={
          <Button icon="add" onClick={() => setNueva(true)}>
            Registrar compra
          </Button>
        }
      />
      <Card>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4">
          <SelectField label="Proveedor" value={proveedorId} onChange={(e) => setProveedorId(e.target.value)} placeholder="Todos" options={(proveedores.data ?? []).map((p) => ({ value: p.id, label: p.nombre }))} />
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
          <Empty icon="local_shipping" text="Sin compras" />
        ) : (
          <>
            <Table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Fecha</th>
                  <th>Proveedor</th>
                  <th>Comprobante</th>
                  <th>Estado</th>
                  <th className="num">Total</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {res.data.items.map((c) => (
                  <tr key={c.id}>
                    <td>#{c.id}</td>
                    <td>{fechaHora(c.fecha)}</td>
                    <td>{provNombre(c.proveedorId)}</td>
                    <td>{c.nroComprobante ?? "—"}</td>
                    <td>
                      <EstadoChip estado={c.estado} />
                    </td>
                    <td className="num font-medium">{soles(c.total)}</td>
                    <td className="text-right whitespace-nowrap">
                      <IconButton icon="visibility" title="Ver detalle" onClick={() => setVer(c.id)} />
                      {isAdmin && c.estado === "REGISTRADA" && <IconButton icon="block" title="Anular" color="warn" onClick={() => setAnular(c)} />}
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
            <Paginator page={res.page} size={res.size} total={res.data.totalElements} onPage={res.setPage} onSize={res.setSize} />
          </>
        )}
      </Card>

      <NuevaCompraDialog
        open={nueva}
        productos={productos.data ?? []}
        proveedores={(proveedores.data ?? []).filter((p) => p.activo)}
        onClose={() => setNueva(false)}
        onDone={(c) => {
          setNueva(false);
          snack(`Compra #${c.id} registrada por ${soles(c.total)}`);
          res.reload();
          productos.reload();
        }}
      />

      <Dialog
        open={ver !== null}
        title={`Compra #${ver ?? ""}`}
        onClose={() => setVer(null)}
        width={680}
        actions={
          <Button variant="basic" onClick={() => setVer(null)}>
            Cerrar
          </Button>
        }
      >
        {!detalle.data ? (
          detalle.error ? <ErrorBanner message={detalle.error} /> : <Loading />
        ) : (
          <div className="flex flex-col gap-3 pb-2">
            <div className="text-sm text-text-2">
              {fechaHora(detalle.data.fecha)} · {provNombre(detalle.data.proveedorId)} · Comprobante {detalle.data.nroComprobante ?? "—"}
            </div>
            <Table>
              <thead>
                <tr>
                  <th>Producto</th>
                  <th className="num">Cajas</th>
                  <th className="num">Unidades</th>
                  <th className="num">Costo unit.</th>
                  <th className="num">Subtotal</th>
                </tr>
              </thead>
              <tbody>
                {detalle.data.detalles?.map((d) => (
                  <tr key={d.id}>
                    <td>{prodNombre(d.productoId)}</td>
                    <td className="num">{d.cantidadCajas}</td>
                    <td className="num">{d.cantidadUnidades}</td>
                    <td className="num">{soles(d.costoUnitario)}</td>
                    <td className="num">{soles(d.subtotal)}</td>
                  </tr>
                ))}
                <tr>
                  <td colSpan={4} className="text-right font-medium">
                    Total
                  </td>
                  <td className="num font-medium">{soles(detalle.data.total)}</td>
                </tr>
              </tbody>
            </Table>
          </div>
        )}
      </Dialog>

      <MotivoDialog
        open={anular !== null}
        title={`Anular compra #${anular?.id ?? ""}`}
        submitLabel="Anular compra"
        onClose={() => setAnular(null)}
        onSubmit={async (motivo) => {
          await api.compras.anular(anular!.id, motivo);
          snack("Compra anulada");
          setAnular(null);
          res.reload();
        }}
      >
        <Alert>No se puede anular si parte de la mercadería ya se vendió.</Alert>
      </MotivoDialog>
    </>
  );
}

function NuevaCompraDialog({
  open,
  productos,
  proveedores,
  onClose,
  onDone,
}: {
  open: boolean;
  productos: Producto[];
  proveedores: { id: number; nombre: string }[];
  onClose: () => void;
  onDone: (c: Compra) => void;
}) {
  const [proveedorId, setProveedorId] = useState("");
  const [comprobante, setComprobante] = useState("");
  const [desdeCaja, setDesdeCaja] = useState(false);
  const [lineas, setLineas] = useState<Linea[]>([lineaVacia()]);

  useOnOpen(open, () => {
    setProveedorId("");
    setComprobante("");
    setDesdeCaja(false);
    setLineas([lineaVacia()]);
  });

  const prod = (id: string) => productos.find((p) => p.id === Number(id));
  const unidades = (l: Linea) => Number(l.cajas || 0) * (prod(l.productoId)?.unidadesPorCaja ?? 1) + Number(l.sueltas || 0);
  const total = lineas.reduce((acc, l) => acc + unidades(l) * (l.costo ? toNum(l.costo) : 0), 0);
  const upd = (i: number, patch: Partial<Linea>) => setLineas((ls) => ls.map((l, j) => (j === i ? { ...l, ...patch } : l)));

  return (
    <FormDialog
      open={open}
      title="Registrar compra"
      width={860}
      onClose={onClose}
      submitLabel={`Registrar ${soles(total)}`}
      onSubmit={async () => {
        const detalles = lineas
          .filter((l) => l.productoId)
          .map((l) => ({
            productoId: Number(l.productoId),
            cantidadCajas: Number(l.cajas || 0),
            cantidadSueltas: Number(l.sueltas || 0),
            costoUnitario: toNum(l.costo),
          }));
        if (!detalles.length) throw new Error("Agrega al menos un producto");
        onDone(
          await api.compras.crear({
            proveedorId: proveedorId ? Number(proveedorId) : undefined,
            nroComprobante: optional(comprobante),
            pagadoDesdeCaja: desdeCaja,
            detalles,
          }),
        );
      }}
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <SelectField label="Proveedor" value={proveedorId} onChange={(e) => setProveedorId(e.target.value)} placeholder="Sin proveedor" options={proveedores.map((p) => ({ value: p.id, label: p.nombre }))} />
        <TextField label="Nro. de comprobante" maxLength={30} value={comprobante} onChange={(e) => setComprobante(e.target.value)} />
      </div>
      <Checkbox label="Pagado con efectivo de la caja de bodega" checked={desdeCaja} onChange={setDesdeCaja} />

      <div className="text-sm font-medium text-text-2">Productos</div>
      {lineas.map((l, i) => {
        const p = prod(l.productoId);
        return (
          <div key={i} className="grid grid-cols-2 sm:grid-cols-[2fr_1fr_1fr_1fr_auto] gap-3 items-end border-b border-divider pb-3">
            <SelectField
              label="Producto"
              className="col-span-2 sm:col-span-1"
              required
              value={l.productoId}
              onChange={(e) => {
                const np = prod(e.target.value);
                upd(i, { productoId: e.target.value, costo: np ? String(np.precioCompra) : "" });
              }}
              placeholder="Selecciona"
              options={productos.map((x) => ({ value: x.id, label: x.nombre }))}
            />
            <TextField label={`Cajas${p ? ` (x${p.unidadesPorCaja})` : ""}`} type="number" min="0" value={l.cajas} onChange={(e) => upd(i, { cajas: e.target.value })} />
            <TextField label="Sueltas" type="number" min="0" value={l.sueltas} onChange={(e) => upd(i, { sueltas: e.target.value })} />
            <TextField label="Costo unitario" type="number" step="0.01" min="0" required value={l.costo} onChange={(e) => upd(i, { costo: e.target.value })} hint={`${unidades(l)} u.`} />
            <IconButton icon="delete" title="Quitar" disabled={lineas.length === 1} onClick={() => setLineas((ls) => ls.filter((_, j) => j !== i))} className="mb-5" />
          </div>
        );
      })}
      <div className="flex justify-between items-center">
        <Button variant="basic" icon="add" onClick={() => setLineas((ls) => [...ls, lineaVacia()])}>
          Agregar producto
        </Button>
        <span className="text-lg font-medium tabular-nums">Total: {soles(total)}</span>
      </div>
    </FormDialog>
  );
}
