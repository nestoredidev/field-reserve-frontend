"use client";

import { useState } from "react";
import { AdminOnly } from "@/components/AppShell";
import { ActivoChip, EstadoChip } from "@/components/shared";
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
import { fecha } from "@/lib/format";
import { usePaged, useOnOpen } from "@/lib/hooks";
import type { Rol, Usuario } from "@/lib/types";

const ROLES = [
  { value: "ENCARGADO", label: "Encargado" },
  { value: "ADMIN", label: "Administrador" },
];

export default function UsuariosPage() {
  return (
    <AdminOnly>
      <Usuarios />
    </AdminOnly>
  );
}

function Usuarios() {
  const { user } = useAuth();
  const snack = useSnackbar();
  const run = useAction();
  const res = usePaged((page, size) => api.usuarios.listar({ page, size, sortBy: "username" }), []);
  const [editando, setEditando] = useState<Usuario | "nuevo" | null>(null);
  const [clave, setClave] = useState<Usuario | null>(null);

  const [nombre, setNombre] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [rol, setRol] = useState<Rol>("ENCARGADO");

  useOnOpen(editando, () => {
    const u = editando === "nuevo" ? null : editando;
    setNombre(u?.nombre ?? "");
    setUsername(u?.username ?? "");
    setPassword("");
    setRol(u?.rol ?? "ENCARGADO");
  });
  useOnOpen(clave, () => {
    setPassword("");
  });

  return (
    <>
      <PageHeader
        title="Usuarios"
        subtitle="Cuentas con acceso al sistema"
        actions={
          <Button icon="person_add" onClick={() => setEditando("nuevo")}>
            Nuevo usuario
          </Button>
        }
      />
      <Card>
        {res.error && (
          <div className="px-4 pt-4">
            <ErrorBanner message={res.error} onRetry={res.reload} />
          </div>
        )}
        {res.loading && !res.data ? (
          <Loading />
        ) : !res.data?.items.length ? (
          <Empty icon="group" />
        ) : (
          <>
            <Table>
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>Usuario</th>
                  <th>Rol</th>
                  <th>Estado</th>
                  <th>Creado</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {res.data.items.map((u) => (
                  <tr key={u.id}>
                    <td className="font-medium">{u.nombre}</td>
                    <td className="text-text-2">{u.username}</td>
                    <td>
                      <EstadoChip estado={u.rol} />
                    </td>
                    <td>
                      <ActivoChip activo={u.activo} />
                    </td>
                    <td>{fecha(u.createdAt)}</td>
                    <td className="text-right whitespace-nowrap">
                      <IconButton icon="edit" title="Editar" onClick={() => setEditando(u)} />
                      <IconButton icon="key" title="Cambiar contraseña" onClick={() => setClave(u)} />
                      <IconButton
                        icon={u.activo ? "toggle_on" : "toggle_off"}
                        color={u.activo ? "primary" : "default"}
                        title={u.activo ? "Desactivar" : "Activar"}
                        disabled={u.id === user?.id}
                        onClick={async () => {
                          const r = await run(() => (u.activo ? api.usuarios.desactivar(u.id) : api.usuarios.activar(u.id)), u.activo ? "Usuario desactivado" : "Usuario activado");
                          if (r) res.reload();
                        }}
                      />
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
        title={editando === "nuevo" ? "Nuevo usuario" : "Editar usuario"}
        onClose={() => setEditando(null)}
        onSubmit={async () => {
          if (editando === "nuevo") await api.usuarios.crear({ nombre: nombre.trim(), username: username.trim(), password, rol });
          else await api.usuarios.actualizar((editando as Usuario).id, { nombre: nombre.trim(), rol });
          snack("Usuario guardado");
          setEditando(null);
          res.reload();
        }}
      >
        <TextField label="Nombre" required maxLength={100} value={nombre} onChange={(e) => setNombre(e.target.value)} />
        <TextField
          label="Usuario"
          required
          disabled={editando !== "nuevo"}
          pattern="[a-z0-9._\-]{4,50}"
          hint="4 a 50 caracteres en minúsculas, sin espacios"
          value={username}
          onChange={(e) => setUsername(e.target.value.toLowerCase())}
        />
        {editando === "nuevo" && (
          <TextField label="Contraseña" type="password" autoComplete="new-password" required minLength={8} maxLength={72} value={password} onChange={(e) => setPassword(e.target.value)} />
        )}
        <SelectField label="Rol" value={rol} onChange={(e) => setRol(e.target.value as Rol)} options={ROLES} />
      </FormDialog>

      <FormDialog
        open={clave !== null}
        title={`Cambiar contraseña · ${clave?.username ?? ""}`}
        onClose={() => setClave(null)}
        onSubmit={async () => {
          await api.usuarios.cambiarPassword(clave!.id, password);
          snack("Contraseña actualizada");
          setClave(null);
        }}
      >
        <TextField label="Nueva contraseña" type="password" autoComplete="new-password" required minLength={8} maxLength={72} value={password} onChange={(e) => setPassword(e.target.value)} />
      </FormDialog>
    </>
  );
}
