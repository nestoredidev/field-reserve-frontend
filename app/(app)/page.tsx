"use client";

import Link from "next/link";
import { EstadoChip, useCanchas } from "@/components/shared";
import { Button, Card, CardHeader, Empty, ErrorBanner, Loading, PageHeader, Stat, Table } from "@/components/ui";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { fecha, hora, hoyLima, soles } from "@/lib/format";
import { useAsync } from "@/lib/hooks";
import type { Caja } from "@/lib/types";

const cajaOrNull = (p: Promise<Caja>) => p.catch(() => null);

export default function DashboardPage() {
  const { user, isAdmin } = useAuth();
  const hoy = hoyLima();
  const canchas = useCanchas();
  const cajas = useAsync(
    () => Promise.all([cajaOrNull(api.cajas("cancha").actual()), cajaOrNull(api.cajas("bodega").actual())]),
    [],
  );
  const reservas = useAsync(
    () => api.reservas.listar({ desde: hoy, hasta: hoy, size: 100, sortBy: "inicio" }).then((p) => p.items),
    [hoy],
  );
  const stockBajo = useAsync(() => api.productos.stockBajo(), []);
  const resumen = useAsync(
    () => (isAdmin ? api.reportes.resumenGeneral(hoy, hoy) : Promise.resolve(null)),
    [isAdmin, hoy],
  );

  const nombreCancha = (id: number) => canchas.data?.find((c) => c.id === id)?.nombre ?? `#${id}`;
  const [cajaCancha, cajaBodega] = cajas.data ?? [null, null];
  const activas = reservas.data?.filter((r) => r.tipo === "RESERVA" && (r.estado === "PENDIENTE" || r.estado === "CONFIRMADA"));

  return (
    <>
      <PageHeader
        title={`Hola, ${user?.nombre ?? ""}`}
        subtitle={`Resumen del ${fecha(hoy)}`}
        actions={
          <>
            <Link href="/reservas">
              <Button icon="add">Nueva reserva</Button>
            </Link>
            <Link href="/bodega/ventas">
              <Button color="accent" icon="shopping_cart">
                Nueva venta
              </Button>
            </Link>
          </>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        <Stat label="Reservas activas hoy" value={activas?.length ?? "…"} icon="event_available" />
        <Stat
          label="Caja de cancha"
          value={cajas.loading ? "…" : cajaCancha ? "Abierta" : "Cerrada"}
          icon="point_of_sale"
          color={cajaCancha ? "success" : "warn"}
        />
        <Stat
          label="Caja de bodega"
          value={cajas.loading ? "…" : cajaBodega ? "Abierta" : "Cerrada"}
          icon="account_balance_wallet"
          color={cajaBodega ? "success" : "warn"}
        />
        <Stat
          label="Productos por reponer"
          value={stockBajo.data?.length ?? "…"}
          icon="inventory"
          color={stockBajo.data?.length ? "accent" : "primary"}
        />
      </div>

      {resumen.data && (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
          <Stat label="Cobros cancha (efectivo)" value={soles(resumen.data.cancha.cobrosEfectivo)} icon="payments" color="success" />
          <Stat label="Cobros cancha (digital)" value={soles(resumen.data.cancha.cobrosDigitales)} icon="qr_code" color="success" />
          <Stat label="Ventas de bodega" value={soles(resumen.data.bodega.ventasTotal)} icon="receipt_long" color="accent" />
          <Stat label="Ganancia bruta bodega" value={soles(resumen.data.bodega.gananciaBruta)} icon="trending_up" color="accent" />
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <Card className="xl:col-span-2">
          <CardHeader
            icon="today"
            title="Agenda de hoy"
            subtitle="Reservas y mantenimientos del día"
            actions={
              <Link href="/reservas">
                <Button variant="basic">Ver todo</Button>
              </Link>
            }
          />
          {reservas.loading && !reservas.data ? (
            <Loading />
          ) : reservas.error ? (
            <div className="px-4">
              <ErrorBanner message={reservas.error} onRetry={reservas.reload} />
            </div>
          ) : !reservas.data?.length ? (
            <Empty icon="event_busy" text="No hay reservas para hoy" />
          ) : (
            <Table>
              <thead>
                <tr>
                  <th>Horario</th>
                  <th>Cancha</th>
                  <th>Cliente</th>
                  <th>Estado</th>
                  <th className="num">Saldo</th>
                </tr>
              </thead>
              <tbody>
                {reservas.data.map((r) => (
                  <tr key={r.id}>
                    <td>
                      <Link href={`/reservas/${r.id}`} className="text-primary font-medium">
                        {hora(r.inicio)} – {hora(r.fin)}
                      </Link>
                    </td>
                    <td>{nombreCancha(r.canchaId)}</td>
                    <td>{r.tipo === "MANTENIMIENTO" ? <em className="text-text-2">Mantenimiento</em> : r.clienteNombre}</td>
                    <td>
                      <EstadoChip estado={r.estado} />
                    </td>
                    <td className="num">{r.tipo === "RESERVA" ? soles(r.saldo) : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </Card>

        <Card>
          <CardHeader
            icon="warning_amber"
            title="Stock bajo"
            subtitle="Productos en o bajo su mínimo"
            actions={
              <Link href="/bodega/productos">
                <Button variant="basic">Productos</Button>
              </Link>
            }
          />
          {stockBajo.loading && !stockBajo.data ? (
            <Loading />
          ) : !stockBajo.data?.length ? (
            <Empty icon="check_circle" text="Todo el stock está en orden" />
          ) : (
            <ul className="pb-2">
              {stockBajo.data.map((p) => (
                <li key={p.id} className="flex items-center justify-between px-4 h-12 border-b border-divider last:border-0">
                  <span className="truncate">{p.nombre}</span>
                  <span className="text-warn font-medium tabular-nums">
                    {p.stock} / {p.stockMinimo}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </>
  );
}
