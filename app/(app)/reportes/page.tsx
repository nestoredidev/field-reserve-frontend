"use client";

import { useState } from "react";
import { AdminOnly } from "@/components/AppShell";
import { Button, Card, CardHeader, Empty, ErrorBanner, Loading, PageHeader, Stat, Table, TextField } from "@/components/ui";
import { api } from "@/lib/api";
import { fecha, hoyLima, soles, sumarDias } from "@/lib/format";
import { useAsync } from "@/lib/hooks";

export default function ReportesPage() {
  return (
    <AdminOnly>
      <Reportes />
    </AdminOnly>
  );
}

function Reportes() {
  const hoy = hoyLima();
  const [desde, setDesde] = useState(sumarDias(hoy, -29));
  const [hasta, setHasta] = useState(hoy);
  const resumen = useAsync(() => api.reportes.resumenGeneral(desde || undefined, hasta || undefined), [desde, hasta]);
  const ganancias = useAsync(() => api.reportes.gananciaProductos(desde || undefined, hasta || undefined), [desde, hasta]);

  const rango = (dias: number) => {
    setDesde(sumarDias(hoy, -(dias - 1)));
    setHasta(hoy);
  };

  const r = resumen.data;
  const maxGanancia = Math.max(1, ...(ganancias.data ?? []).map((g) => Number(g.ganancia)));

  return (
    <>
      <PageHeader title="Reportes" subtitle={r ? `Del ${fecha(r.desde)} al ${fecha(r.hasta)}` : "Resumen de cancha y bodega"} />
      <Card className="mb-6">
        <div className="flex flex-wrap items-end gap-4 p-4">
          <TextField label="Desde" type="date" value={desde} onChange={(e) => setDesde(e.target.value)} />
          <TextField label="Hasta" type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} />
          <Button variant="stroked" onClick={() => rango(1)}>
            Hoy
          </Button>
          <Button variant="stroked" onClick={() => rango(7)}>
            7 días
          </Button>
          <Button variant="stroked" onClick={() => rango(30)}>
            30 días
          </Button>
        </div>
      </Card>

      {resumen.error && <ErrorBanner message={resumen.error} onRetry={resumen.reload} />}
      {resumen.loading && !r ? (
        <Loading />
      ) : (
        r && (
          <>
            <h2 className="text-lg mb-3 flex items-center gap-2">Cancha</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4 mb-6">
              <Stat label="Cobros efectivo" value={soles(r.cancha.cobrosEfectivo)} icon="payments" />
              <Stat label="Cobros digitales" value={soles(r.cancha.cobrosDigitales)} icon="qr_code" />
              <Stat label="Otros ingresos" value={soles(r.cancha.otrosIngresos)} icon="add_card" color="success" />
              <Stat label="Egresos" value={soles(r.cancha.egresos)} icon="money_off" color="warn" />
              <Stat label="Reservas completadas" value={r.cancha.reservasCompletadas} icon="task_alt" color="success" />
            </div>
            <h2 className="text-lg mb-3">Bodega</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 mb-6">
              <Stat label={`Ventas (${r.bodega.ventasRegistradas})`} value={soles(r.bodega.ventasTotal)} icon="shopping_cart" color="accent" />
              <Stat label="Ganancia bruta" value={soles(r.bodega.gananciaBruta)} icon="trending_up" color="success" />
              <Stat label="Compras" value={soles(r.bodega.comprasTotal)} icon="local_shipping" />
              <Stat label="Otros ingresos" value={soles(r.bodega.otrosIngresos)} icon="add_card" color="success" />
              <Stat label="Egresos" value={soles(r.bodega.egresos)} icon="money_off" color="warn" />
            </div>
          </>
        )
      )}

      <Card>
        <CardHeader icon="leaderboard" title="Ganancia por producto" subtitle="Ventas registradas del periodo" />
        {ganancias.error && (
          <div className="px-4">
            <ErrorBanner message={ganancias.error} onRetry={ganancias.reload} />
          </div>
        )}
        {ganancias.loading && !ganancias.data ? (
          <Loading />
        ) : !ganancias.data?.length ? (
          <Empty icon="leaderboard" text="Sin ventas en el periodo" />
        ) : (
          <Table>
            <thead>
              <tr>
                <th>Producto</th>
                <th className="num">Unidades</th>
                <th className="num">Vendido</th>
                <th className="num">Costo</th>
                <th className="num">Ganancia</th>
                <th className="w-1/4" />
              </tr>
            </thead>
            <tbody>
              {ganancias.data.map((g) => (
                <tr key={g.productoId}>
                  <td className="font-medium">{g.nombre}</td>
                  <td className="num">{g.unidadesVendidas}</td>
                  <td className="num">{soles(g.totalVendido)}</td>
                  <td className="num">{soles(g.costoTotal)}</td>
                  <td className={`num font-medium ${Number(g.ganancia) < 0 ? "text-warn" : ""}`}>{soles(g.ganancia)}</td>
                  <td>
                    <div className="h-2 rounded bg-primary-50 overflow-hidden">
                      <div className="h-full bg-primary" style={{ width: `${Math.max(0, (Number(g.ganancia) / maxGanancia) * 100)}%` }} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>
    </>
  );
}
