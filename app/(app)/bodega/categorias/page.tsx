"use client";

import { useState } from "react";
import { Button, Card, Dialog, Empty, ErrorBanner, FormDialog, Icon, IconButton, Loading, PageHeader, Paginator, Table, TextField, useAction, useSnackbar } from "@/components/ui";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { usePaged, useOnOpen } from "@/lib/hooks";
import type { Categoria } from "@/lib/types";

const tones = [
  "bg-primary-50 text-primary",
  "bg-accent/10 text-accent-dark",
  "bg-success-light text-success",
  "bg-caution-light text-caution",
];

export default function CategoriasPage() {
  const { isAdmin } = useAuth();
  const snack = useSnackbar();
  const run = useAction();
  const res = usePaged((page, size) => api.categorias.listar({ page, size, sortBy: "nombre" }), []);
  const [editando, setEditando] = useState<Categoria | "nueva" | null>(null);
  const [borrar, setBorrar] = useState<Categoria | null>(null);
  const [nombre, setNombre] = useState("");

  useOnOpen(editando, () => {
    setNombre(editando && editando !== "nueva" ? editando.nombre : "");
  });

  return (
    <>
      <PageHeader
        title="Categorías"
        subtitle="Agrupan los productos de la bodega"
        actions={
          isAdmin && (
            <Button icon="add" onClick={() => setEditando("nueva")}>
              Nueva categoría
            </Button>
          )
        }
      />
      <Card className="overflow-hidden">
        {res.data && (
          <div className="flex items-center gap-2 px-5 py-4 border-b border-divider bg-gradient-to-r from-primary-50 to-transparent">
            <Icon name="category" className="text-primary" size={22} />
            <span className="font-medium">Listado</span>
            <span className="ml-auto text-xs font-medium rounded-full bg-primary text-on-primary px-2.5 py-0.5">
              {res.data.totalElements} {res.data.totalElements === 1 ? "categoría" : "categorías"}
            </span>
          </div>
        )}
        {res.error && (
          <div className="px-4 pt-4">
            <ErrorBanner message={res.error} onRetry={res.reload} />
          </div>
        )}
        {res.loading && !res.data ? (
          <Loading />
        ) : !res.data?.items.length ? (
          <Empty icon="category" text="Sin categorías" />
        ) : (
          <>
            <Table>
              <thead>
                <tr>
                  <th>Categoría</th>
                  <th className="w-24">ID</th>
                  {isAdmin && <th className="w-28" />}
                </tr>
              </thead>
              <tbody>
                {res.data.items.map((c) => (
                  <tr key={c.id} className="group">
                    <td>
                      <div className="flex items-center gap-3">
                        <span className={`w-9 h-9 rounded-full flex items-center justify-center ${tones[c.id % tones.length]}`}>
                          <Icon name="label" size={20} />
                        </span>
                        <span className="font-medium">{c.nombre}</span>
                      </div>
                    </td>
                    <td>
                      <span className="text-xs text-text-2 bg-hover rounded px-2 py-0.5 tabular-nums">#{c.id}</span>
                    </td>
                    {isAdmin && (
                      <td className="text-right whitespace-nowrap">
                        <div className="lg:opacity-30 lg:group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                          <IconButton icon="edit" title="Editar" color="primary" onClick={() => setEditando(c)} />
                          <IconButton icon="delete" title="Eliminar" color="warn" onClick={() => setBorrar(c)} />
                        </div>
                      </td>
                    )}
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
        title={editando === "nueva" ? "Nueva categoría" : "Editar categoría"}
        onClose={() => setEditando(null)}
        onSubmit={async () => {
          if (editando === "nueva") await api.categorias.crear(nombre.trim());
          else await api.categorias.actualizar((editando as Categoria).id, nombre.trim());
          snack("Categoría guardada");
          setEditando(null);
          res.reload();
        }}
      >
        <TextField label="Nombre" required maxLength={60} value={nombre} onChange={(e) => setNombre(e.target.value)} />
      </FormDialog>

      <Dialog
        open={borrar !== null}
        title="Eliminar categoría"
        onClose={() => setBorrar(null)}
        actions={
          <>
            <Button variant="basic" color="default" onClick={() => setBorrar(null)}>
              Cancelar
            </Button>
            <Button
              color="warn"
              onClick={async () => {
                const id = borrar!.id;
                setBorrar(null);
                if (await run(() => api.categorias.eliminar(id).then(() => true), "Categoría eliminada")) res.reload();
              }}
            >
              Eliminar
            </Button>
          </>
        }
      >
        <p>
          ¿Eliminar la categoría <b>{borrar?.nombre}</b>? No se puede eliminar si tiene productos.
        </p>
      </Dialog>
    </>
  );
}
