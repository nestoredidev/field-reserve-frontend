"use client";

import { useEffect, useState } from "react";
import { ActivoChip, optional } from "@/components/shared";
import {
  Button,
  Card,
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
  useAction,
  useSnackbar,
} from "@/components/ui";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { usePaged, useOnOpen } from "@/lib/hooks";
import type { Proveedor } from "@/lib/types";

export default function ProveedoresPage() {
  const { isAdmin } = useAuth();
  const snack = useSnackbar();
  const run = useAction();
  const [texto, setTexto] = useState("");
  const [q, setQ] = useState("");
  const [activo, setActivo] = useState("");
  const [editando, setEditando] = useState<Proveedor | "nuevo" | null>(null);
  const [nombre, setNombre] = useState("");
  const [ruc, setRuc] = useState("");
  const [telefono, setTelefono] = useState("");

  useEffect(() => {
    const t = setTimeout(() => setQ(texto.trim()), 300);
    return () => clearTimeout(t);
  }, [texto]);

  useOnOpen(editando, () => {
    const p = editando === "nuevo" ? null : editando;
    setNombre(p?.nombre ?? "");
    setRuc(p?.ruc ?? "");
    setTelefono(p?.telefono ?? "");
  });

  const res = usePaged(
    (page, size) =>
      api.proveedores.listar({ page, size, sortBy: "nombre", q: q || undefined, activo: activo === "" ? undefined : activo === "true" }),
    [q, activo],
  );

  return (
    <>
      <PageHeader
        title="Proveedores"
        subtitle="Empresas a las que se compra mercadería"
        actions={
          <Button icon="add" onClick={() => setEditando("nuevo")}>
            Nuevo proveedor
          </Button>
        }
      />
      <Card>
        <div className="flex flex-wrap gap-4 p-4">
          <TextField label="Buscar" className="flex-1 min-w-[200px]" value={texto} onChange={(e) => setTexto(e.target.value)} placeholder="Nombre o RUC" />
          <SelectField
            label="Estado"
            className="w-40"
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
          <Empty icon="store" />
        ) : (
          <>
            <Table>
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>RUC</th>
                  <th>Teléfono</th>
                  <th>Estado</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {res.data.items.map((p) => (
                  <tr key={p.id}>
                    <td className="font-medium">{p.nombre}</td>
                    <td className="tabular-nums">{p.ruc ?? "—"}</td>
                    <td>{p.telefono ?? "—"}</td>
                    <td>
                      <ActivoChip activo={p.activo} />
                    </td>
                    <td className="text-right whitespace-nowrap">
                      <IconButton icon="edit" title="Editar" onClick={() => setEditando(p)} />
                      {isAdmin && (
                        <IconButton
                          icon={p.activo ? "toggle_on" : "toggle_off"}
                          color={p.activo ? "primary" : "default"}
                          title={p.activo ? "Desactivar" : "Activar"}
                          onClick={async () => {
                            const r = await run(
                              () => (p.activo ? api.proveedores.desactivar(p.id) : api.proveedores.activar(p.id)),
                              p.activo ? "Proveedor desactivado" : "Proveedor activado",
                            );
                            if (r) res.reload();
                          }}
                        />
                      )}
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
        title={editando === "nuevo" ? "Nuevo proveedor" : "Editar proveedor"}
        onClose={() => setEditando(null)}
        onSubmit={async () => {
          const body = { nombre: nombre.trim(), ruc: optional(ruc), telefono: optional(telefono) };
          if (editando === "nuevo") await api.proveedores.crear(body);
          else await api.proveedores.actualizar((editando as Proveedor).id, body);
          snack("Proveedor guardado");
          setEditando(null);
          res.reload();
        }}
      >
        <TextField label="Nombre" required maxLength={120} value={nombre} onChange={(e) => setNombre(e.target.value)} />
        <div className="grid grid-cols-2 gap-4">
          <TextField label="RUC" inputMode="numeric" pattern="\d{11}" maxLength={11} hint="11 dígitos" value={ruc} onChange={(e) => setRuc(e.target.value.replace(/\D/g, ""))} />
          <TextField label="Teléfono" maxLength={15} value={telefono} onChange={(e) => setTelefono(e.target.value)} />
        </div>
      </FormDialog>
    </>
  );
}
