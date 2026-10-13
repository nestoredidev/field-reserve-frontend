"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { EstadoChip } from "@/components/shared";
import {
  Button,
  Card,
  Dialog,
  Empty,
  ErrorBanner,
  FormDialog,
  Icon,
  IconButton,
  Loading,
  PageHeader,
  Paginator,
  Table,
  TextArea,
  TextField,
  useSnackbar,
} from "@/components/ui";
import { api } from "@/lib/api";
import { fecha, fechaHora, hora, soles } from "@/lib/format";
import { useAsync, usePaged, useOnOpen } from "@/lib/hooks";
import type { Cliente } from "@/lib/types";

export default function ClientesPage() {
  return (
    <Suspense fallback={<Loading />}>
      <Clientes />
    </Suspense>
  );
}

function Clientes() {
  const snack = useSnackbar();
  // Permite enlazar /clientes?q=... (p. ej. desde el detalle de una reserva).
  const params = useSearchParams();
  const [texto, setTexto] = useState(() => params.get("q") ?? "");
  const [q, setQ] = useState(texto);
  const [editando, setEditando] = useState<Cliente | "nuevo" | null>(null);
  const [historial, setHistorial] = useState<Cliente | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setQ(texto.trim()), 300);
    return () => clearTimeout(t);
  }, [texto]);

  const res = usePaged((page, size) => api.clientes.listar({ page, size, q: q || undefined, sortBy: "nombre" }), [q]);

  const [nombre, setNombre] = useState("");
  const [telefono, setTelefono] = useState("");
  const [notas, setNotas] = useState("");
  useOnOpen(editando, () => {
    const c = editando === "nuevo" ? null : editando;
    setNombre(c?.nombre ?? "");
    setTelefono(c?.telefono ?? "");
    setNotas(c?.notas ?? "");
  });

  return (
    <>
      <PageHeader
        title="Clientes"
        subtitle="Personas que reservan las canchas"
        actions={
          <Button icon="person_add" onClick={() => setEditando("nuevo")}>
            Nuevo cliente
          </Button>
        }
      />
      <Card>
        <div className="p-4">
          <div className="mat-field max-w-md">
            <label>Buscar por nombre o teléfono</label>
            <div className="relative">
              <Icon name="search" className="absolute left-3 top-1/2 -translate-y-1/2 text-text-2" size={20} />
              <input className="w-full !pl-10" value={texto} onChange={(e) => setTexto(e.target.value)} placeholder="Ej. Juan o 987654321" />
            </div>
          </div>
        </div>
        {res.error && (
          <div className="px-4">
            <ErrorBanner message={res.error} onRetry={res.reload} />
          </div>
        )}
        {res.loading && !res.data ? (
          <Loading />
        ) : !res.data?.items.length ? (
          <Empty icon="person_search" />
        ) : (
          <>
            <Table>
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>Teléfono</th>
                  <th>Notas</th>
                  <th>Registrado</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {res.data.items.map((c) => (
                  <tr key={c.id}>
                    <td className="font-medium">{c.nombre}</td>
                    <td className="tabular-nums">{c.telefono}</td>
                    <td className="text-text-2 max-w-xs truncate">{c.notas ?? "—"}</td>
                    <td>{fecha(c.createdAt)}</td>
                    <td className="text-right whitespace-nowrap">
                      <IconButton icon="history" title="Historial de reservas" onClick={() => setHistorial(c)} />
                      <IconButton icon="edit" title="Editar" onClick={() => setEditando(c)} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
            <Paginator page={res.page} size={res.size} total={res.data.totalElements} onPage={res.setPage} onSize={res.setSize} />
          </>
        )}
      </Card>

      <FormDialog
        open={editando !== null}
        title={editando === "nuevo" ? "Nuevo cliente" : "Editar cliente"}
        onClose={() => setEditando(null)}
        onSubmit={async () => {
          const body = { nombre: nombre.trim(), telefono, notas: notas.trim() || undefined };
          if (editando === "nuevo") await api.clientes.crear(body);
          else await api.clientes.actualizar((editando as Cliente).id, body);
          snack(editando === "nuevo" ? "Cliente creado" : "Cliente actualizado");
          setEditando(null);
          res.reload();
        }}
      >
        <TextField label="Nombre" required maxLength={100} value={nombre} onChange={(e) => setNombre(e.target.value)} />
        <TextField
          label="Celular"
          required
          inputMode="numeric"
          pattern="9\d{8}"
          maxLength={9}
          hint="Celular peruano de 9 dígitos que empieza con 9"
          value={telefono}
          onChange={(e) => setTelefono(e.target.value.replace(/\D/g, ""))}
        />
        <TextArea label="Notas" maxLength={255} value={notas} onChange={(e) => setNotas(e.target.value)} />
      </FormDialog>

      <HistorialDialog cliente={historial} onClose={() => setHistorial(null)} />
    </>
  );
}

function HistorialDialog({ cliente, onClose }: { cliente: Cliente | null; onClose: () => void }) {
  const reservas = useAsync(
    () =>
      cliente
        ? api.reservas.listar({ clienteId: cliente.id, size: 50, sortBy: "inicio", direction: "desc" }).then((p) => p.items)
        : Promise.resolve([]),
    [cliente?.id],
  );
  return (
    <Dialog
      open={cliente !== null}
      title={`Reservas de ${cliente?.nombre ?? ""}`}
      onClose={onClose}
      width={720}
      actions={
        <Button variant="basic" onClick={onClose}>
          Cerrar
        </Button>
      }
    >
      {reservas.loading ? (
        <Loading />
      ) : reservas.error ? (
        <ErrorBanner message={reservas.error} />
      ) : !reservas.data?.length ? (
        <Empty icon="event_busy" text="Sin reservas" />
      ) : (
        <Table>
          <thead>
            <tr>
              <th>#</th>
              <th>Fecha</th>
              <th>Horario</th>
              <th>Estado</th>
              <th className="num">Total</th>
            </tr>
          </thead>
          <tbody>
            {reservas.data.map((r) => (
              <tr key={r.id}>
                <td>
                  <Link href={`/reservas/${r.id}`} className="text-primary font-medium">
                    #{r.id}
                  </Link>
                </td>
                <td title={fechaHora(r.inicio)}>{fecha(r.inicio)}</td>
                <td className="tabular-nums">
                  {hora(r.inicio)} – {hora(r.fin)}
                </td>
                <td>
                  <EstadoChip estado={r.estado} />
                </td>
                <td className="num">{soles(r.montoTotal)}</td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
    </Dialog>
  );
}
