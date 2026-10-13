"use client";

import { useEffect, useState } from "react";
import { ActivoChip, enumOptions, optional, toNum, useCategorias } from "@/components/shared";
import {
  Alert,
  Button,
  Card,
  Chip,
  Empty,
  ErrorBanner,
  FormDialog,
  Icon,
  IconButton,
  Loading,
  PageHeader,
  Paginator,
  SelectField,
  Table,
  Tabs,
  TextField,
  useAction,
  useSnackbar,
} from "@/components/ui";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { etiqueta, fechaHora, soles } from "@/lib/format";
import { useAsync, usePaged, useOnOpen } from "@/lib/hooks";
import type { Producto, TipoMovimientoInventario, TipoProducto } from "@/lib/types";
import { TIPOS_MOV_INVENTARIO, TIPOS_MOV_MANUALES } from "@/lib/types";

export default function ProductosPage() {
  const { isAdmin } = useAuth();
  const [tab, setTab] = useState<"productos" | "kardex">("productos");
  const [editando, setEditando] = useState<Producto | "nuevo" | null>(null);
  const [version, setVersion] = useState(0);

  return (
    <>
      <PageHeader
        title="Productos"
        subtitle="Catálogo, precios, stock e inventario (kardex)"
        actions={
          isAdmin && (
            <Button icon="add" onClick={() => setEditando("nuevo")}>
              Nuevo producto
            </Button>
          )
        }
      />
      <Tabs
        value={tab}
        onChange={setTab}
        tabs={[
          { value: "productos", label: "Productos", icon: "inventory_2" },
          { value: "kardex", label: "Kardex", icon: "receipt" },
        ]}
      />
      {tab === "productos" ? <Catalogo key={version} onEditar={setEditando} /> : <Kardex />}
      <ProductoDialog
        producto={editando}
        onClose={() => setEditando(null)}
        onSaved={() => {
          setEditando(null);
          setVersion((v) => v + 1);
        }}
      />
    </>
  );
}

function Catalogo({ onEditar }: { onEditar: (p: Producto) => void }) {
  const { isAdmin } = useAuth();
  const run = useAction();
  const categorias = useCategorias();
  const [texto, setTexto] = useState("");
  const [q, setQ] = useState("");
  const [categoriaId, setCategoriaId] = useState("");
  const [tipo, setTipo] = useState("");
  const [activo, setActivo] = useState("true");
  const [ajuste, setAjuste] = useState<Producto | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setQ(texto.trim()), 300);
    return () => clearTimeout(t);
  }, [texto]);

  const res = usePaged(
    (page, size) =>
      api.productos.listar({
        page,
        size,
        sortBy: "nombre",
        q: q || undefined,
        categoriaId: categoriaId ? Number(categoriaId) : undefined,
        tipo: (tipo || undefined) as TipoProducto | undefined,
        activo: activo === "" ? undefined : activo === "true",
      }),
    [q, categoriaId, tipo, activo],
  );
  const catNombre = (id: number) => categorias.data?.find((c) => c.id === id)?.nombre ?? `#${id}`;

  return (
    <Card>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4">
        <TextField label="Buscar" className="col-span-2 md:col-span-1" value={texto} onChange={(e) => setTexto(e.target.value)} placeholder="Nombre o código" />
        <SelectField label="Categoría" value={categoriaId} onChange={(e) => setCategoriaId(e.target.value)} placeholder="Todas" options={(categorias.data ?? []).map((c) => ({ value: c.id, label: c.nombre }))} />
        <SelectField label="Tipo" value={tipo} onChange={(e) => setTipo(e.target.value)} placeholder="Todos" options={enumOptions(["PRODUCTO", "ENVASE"] as const)} />
        <SelectField
          label="Estado"
          value={activo}
          onChange={(e) => setActivo(e.target.value)}
          placeholder="Todos"
          options={[
            { value: "true", label: "Activos" },
            { value: "false", label: "Inactivos" },
          ]}
        />
      </div>
      {res.error && (
        <div className="px-4">
          <ErrorBanner message={res.error} onRetry={res.reload} />
        </div>
      )}
      {res.loading && !res.data ? (
        <Loading />
      ) : !res.data?.items.length ? (
        <Empty icon="inventory_2" />
      ) : (
        <>
          <Table>
            <thead>
              <tr>
                <th>Código</th>
                <th>Nombre</th>
                <th>Categoría</th>
                <th>Tipo</th>
                <th className="num">P. compra</th>
                <th className="num">P. venta</th>
                <th className="num">Stock</th>
                <th>Estado</th>
                {isAdmin && <th />}
              </tr>
            </thead>
            <tbody>
              {res.data.items.map((p) => (
                <tr key={p.id}>
                  <td className="tabular-nums text-text-2">{p.codigoBarras ?? "—"}</td>
                  <td className="font-medium">
                    {p.nombre}
                    {p.advertencias?.length ? (
                      <span title={p.advertencias.join("\n")} className="ml-1 text-caution align-middle">
                        <Icon name="warning" size={16} />
                      </span>
                    ) : null}
                  </td>
                  <td>{catNombre(p.categoriaId)}</td>
                  <td>{p.tipo === "ENVASE" ? <Chip color="accent">Envase</Chip> : "Producto"}</td>
                  <td className="num">{soles(p.precioCompra)}</td>
                  <td className="num">{soles(p.precioVenta)}</td>
                  <td className={`num font-medium ${p.stockBajo ? "text-warn" : ""}`} title={`Mínimo: ${p.stockMinimo}`}>
                    {p.stock}
                  </td>
                  <td>
                    <ActivoChip activo={p.activo} />
                  </td>
                  {isAdmin && (
                    <td className="text-right whitespace-nowrap">
                      <IconButton icon="tune" title="Ajustar stock" onClick={() => setAjuste(p)} />
                      <IconButton icon="edit" title="Editar" onClick={() => onEditar(p)} />
                      <IconButton
                        icon={p.activo ? "toggle_on" : "toggle_off"}
                        color={p.activo ? "primary" : "default"}
                        title={p.activo ? "Desactivar" : "Activar"}
                        onClick={async () => {
                          const r = await run(() => (p.activo ? api.productos.desactivar(p.id) : api.productos.activar(p.id)), p.activo ? "Producto desactivado" : "Producto activado");
                          if (r) res.reload();
                        }}
                      />
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </Table>
          <Paginator page={res.page} size={res.size} total={res.data.totalElements} onPage={res.setPage} onSize={res.setSize} />
        </>
      )}
      <AjusteDialog
        producto={ajuste}
        onClose={() => setAjuste(null)}
        onDone={() => {
          setAjuste(null);
          res.reload();
        }}
      />
    </Card>
  );
}

function ProductoDialog({
  producto,
  onClose,
  onSaved,
}: {
  producto: Producto | "nuevo" | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const snack = useSnackbar();
  const categorias = useCategorias();
  const envases = useAsync(() => api.productos.listar({ tipo: "ENVASE", size: 100, sortBy: "nombre" }).then((p) => p.items), [producto]);
  const nuevo = producto === "nuevo";
  const [f, setF] = useState({
    codigoBarras: "",
    nombre: "",
    categoriaId: "",
    tipo: "PRODUCTO" as TipoProducto,
    precioCompra: "",
    precioVenta: "",
    stockMinimo: "0",
    unidadesPorCaja: "1",
    envaseId: "",
    stockInicial: "0",
  });
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setF({ ...f, [k]: e.target.value });

  useOnOpen(producto, () => {
    const p = producto === "nuevo" ? null : producto;
    setF({
      codigoBarras: p?.codigoBarras ?? "",
      nombre: p?.nombre ?? "",
      categoriaId: p ? String(p.categoriaId) : "",
      tipo: p?.tipo ?? "PRODUCTO",
      precioCompra: p ? String(p.precioCompra) : "",
      precioVenta: p ? String(p.precioVenta) : "",
      stockMinimo: p ? String(p.stockMinimo) : "0",
      unidadesPorCaja: p ? String(p.unidadesPorCaja) : "1",
      envaseId: p?.envaseId ? String(p.envaseId) : "",
      stockInicial: "0",
    });
  });

  const bajoCosto = f.precioCompra && f.precioVenta && toNum(f.precioVenta) < toNum(f.precioCompra);

  return (
    <FormDialog
      open={producto !== null}
      title={nuevo ? "Nuevo producto" : "Editar producto"}
      width={620}
      onClose={onClose}
      onSubmit={async () => {
        const body = {
          codigoBarras: optional(f.codigoBarras),
          nombre: f.nombre.trim(),
          categoriaId: Number(f.categoriaId),
          tipo: f.tipo,
          precioCompra: toNum(f.precioCompra),
          precioVenta: toNum(f.precioVenta),
          stockMinimo: Number(f.stockMinimo || 0),
          unidadesPorCaja: Number(f.unidadesPorCaja || 1),
          envaseId: f.envaseId ? Number(f.envaseId) : null,
          stockInicial: nuevo ? Number(f.stockInicial || 0) : undefined,
        };
        const p = nuevo ? await api.productos.crear(body) : await api.productos.actualizar((producto as Producto).id, body);
        snack(p.advertencias?.length ? `Producto guardado · ${p.advertencias.join(" · ")}` : "Producto guardado");
        onSaved();
      }}
    >
      <div className="grid grid-cols-2 gap-4">
        <TextField label="Nombre" className="col-span-2" required maxLength={120} value={f.nombre} onChange={set("nombre")} />
        <TextField label="Código de barras" maxLength={30} value={f.codigoBarras} onChange={set("codigoBarras")} />
        <SelectField label="Categoría" required value={f.categoriaId} onChange={set("categoriaId")} placeholder="Selecciona" options={(categorias.data ?? []).map((c) => ({ value: c.id, label: c.nombre }))} />
        <SelectField label="Tipo" value={f.tipo} onChange={set("tipo")} options={enumOptions(["PRODUCTO", "ENVASE"] as const)} />
        <SelectField
          label="Envase retornable"
          value={f.envaseId}
          onChange={set("envaseId")}
          disabled={f.tipo === "ENVASE"}
          placeholder="Ninguno"
          options={(envases.data ?? []).filter((e) => producto === "nuevo" || e.id !== producto?.id).map((e) => ({ value: e.id, label: e.nombre }))}
        />
        <TextField label="Precio de compra (S/)" type="number" step="0.01" min="0" required value={f.precioCompra} onChange={set("precioCompra")} />
        <TextField label="Precio de venta (S/)" type="number" step="0.01" min="0" required value={f.precioVenta} onChange={set("precioVenta")} />
        <TextField label="Stock mínimo" type="number" min="0" value={f.stockMinimo} onChange={set("stockMinimo")} />
        <TextField label="Unidades por caja" type="number" min="1" value={f.unidadesPorCaja} onChange={set("unidadesPorCaja")} />
        {nuevo && <TextField label="Stock inicial" type="number" min="0" value={f.stockInicial} onChange={set("stockInicial")} />}
      </div>
      {bajoCosto && <Alert>El precio de venta es menor que el precio de compra.</Alert>}
    </FormDialog>
  );
}

function AjusteDialog({ producto, onClose, onDone }: { producto: Producto | null; onClose: () => void; onDone: () => void }) {
  const snack = useSnackbar();
  const [tipo, setTipo] = useState<TipoMovimientoInventario>("AJUSTE_POSITIVO");
  const [cantidad, setCantidad] = useState("1");
  const [motivo, setMotivo] = useState("");
  useOnOpen(producto, () => {
    setTipo("AJUSTE_POSITIVO");
    setCantidad("1");
    setMotivo("");
  });
  return (
    <FormDialog
      open={producto !== null}
      title={`Ajustar stock · ${producto?.nombre ?? ""}`}
      onClose={onClose}
      onSubmit={async () => {
        const m = await api.inventario.ajustar({ productoId: producto!.id, tipo, cantidad: Number(cantidad), motivo: motivo.trim() });
        snack(`Stock: ${m.stockAnterior} → ${m.stockResultante}`);
        onDone();
      }}
    >
      <Alert color="primary" icon="inventory">
        Stock actual: <b>{producto?.stock}</b>
      </Alert>
      <div className="grid grid-cols-2 gap-4">
        <SelectField label="Tipo de movimiento" value={tipo} onChange={(e) => setTipo(e.target.value as TipoMovimientoInventario)} options={enumOptions(TIPOS_MOV_MANUALES)} />
        <TextField label="Cantidad" type="number" min="1" required value={cantidad} onChange={(e) => setCantidad(e.target.value)} />
      </div>
      <TextField label="Motivo" required maxLength={255} value={motivo} onChange={(e) => setMotivo(e.target.value)} />
    </FormDialog>
  );
}

function Kardex() {
  const productos = useAsync(() => api.productos.listar({ size: 100, sortBy: "nombre" }).then((p) => p.items), []);
  const [productoId, setProductoId] = useState("");
  const [tipo, setTipo] = useState("");
  const res = usePaged(
    (page, size) =>
      api.inventario.movimientos({
        page,
        size,
        sortBy: "fecha",
        direction: "desc",
        productoId: productoId ? Number(productoId) : undefined,
        tipo: (tipo || undefined) as TipoMovimientoInventario | undefined,
      }),
    [productoId, tipo],
    20,
  );
  const nombre = (id: number) => productos.data?.find((p) => p.id === id)?.nombre ?? `#${id}`;

  return (
    <Card>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 max-w-2xl">
        <SelectField label="Producto" value={productoId} onChange={(e) => setProductoId(e.target.value)} placeholder="Todos" options={(productos.data ?? []).map((p) => ({ value: p.id, label: p.nombre }))} />
        <SelectField label="Tipo" value={tipo} onChange={(e) => setTipo(e.target.value)} placeholder="Todos" options={enumOptions(TIPOS_MOV_INVENTARIO)} />
      </div>
      {res.error && (
        <div className="px-4">
          <ErrorBanner message={res.error} onRetry={res.reload} />
        </div>
      )}
      {res.loading && !res.data ? (
        <Loading />
      ) : !res.data?.items.length ? (
        <Empty icon="receipt" text="Sin movimientos" />
      ) : (
        <>
          <Table>
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Producto</th>
                <th>Tipo</th>
                <th className="num">Cantidad</th>
                <th className="num">Stock</th>
                <th>Referencia</th>
                <th>Motivo</th>
              </tr>
            </thead>
            <tbody>
              {res.data.items.map((m) => {
                const sube = m.stockResultante >= m.stockAnterior;
                return (
                  <tr key={m.id}>
                    <td>{fechaHora(m.fecha)}</td>
                    <td>{nombre(m.productoId)}</td>
                    <td>{etiqueta(m.tipo)}</td>
                    <td className={`num font-medium ${sube ? "text-[#2e7d32]" : "text-warn"}`}>
                      {sube ? "+" : "−"}
                      {m.cantidad}
                    </td>
                    <td className="num text-text-2">
                      {m.stockAnterior} → <span className="text-text">{m.stockResultante}</span>
                    </td>
                    <td className="text-text-2">{m.ventaId ? `Venta #${m.ventaId}` : m.compraId ? `Compra #${m.compraId}` : "—"}</td>
                    <td className="text-text-2 max-w-xs truncate">{m.motivo ?? "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </Table>
          <Paginator page={res.page} size={res.size} total={res.data.totalElements} onPage={res.setPage} onSize={res.setSize} />
        </>
      )}
    </Card>
  );
}
