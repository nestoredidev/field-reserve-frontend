"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Suspense, useCallback, useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { Icon, IconButton, Loading } from "./ui";

type NavItem = { href: string; label: string; icon: string; admin?: boolean };
type NavGroup = { title?: string; items: NavItem[] };

const NAV: NavGroup[] = [
  { items: [{ href: "/", label: "Inicio", icon: "dashboard" }] },
  {
    title: "Canchas",
    items: [
      { href: "/reservas", label: "Reservas", icon: "event" },
      { href: "/clientes", label: "Clientes", icon: "people" },
      { href: "/caja", label: "Caja de cancha", icon: "point_of_sale" },
      { href: "/canchas", label: "Canchas y tarifas", icon: "sports_soccer" },
    ],
  },
  {
    title: "Bodega",
    items: [
      { href: "/bodega/ventas", label: "Ventas", icon: "shopping_cart" },
      { href: "/bodega/productos", label: "Productos", icon: "inventory_2" },
      { href: "/bodega/compras", label: "Compras", icon: "local_shipping" },
      { href: "/bodega/caja", label: "Caja de bodega", icon: "account_balance_wallet" },
      { href: "/bodega/categorias", label: "Categorías", icon: "category" },
      { href: "/bodega/proveedores", label: "Proveedores", icon: "store" },
    ],
  },
  {
    title: "Administración",
    items: [
      { href: "/reportes", label: "Reportes", icon: "insights", admin: true },
      { href: "/usuarios", label: "Usuarios", icon: "manage_accounts", admin: true },
    ],
  },
];

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const { user, ready, isAdmin, logout } = useAuth();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const cerrarMenu = useCallback(() => setOpen(false), []);

  useEffect(() => {
    if (ready && !user) router.replace("/login");
  }, [ready, user, router]);

  // usePathname() solo se conoce en tiempo de ejecución: se aísla en componentes pequeños con su
  // propio <Suspense> para que la barra, el menú y la página formen parte del shell estático.
  return (
    <div className="min-h-screen flex flex-col">
      <Suspense>
        <CerrarMenuAlNavegar onNavigate={cerrarMenu} />
      </Suspense>
      {/* Barra translúcida: el contenido se desplaza por debajo */}
      <header className="material-bar sticky top-0 z-30 h-14 border-b border-divider flex items-center gap-2 px-2 lg:px-4">
        <IconButton icon="menu" title="Menú" className="lg:hidden" onClick={() => setOpen((v) => !v)} />
        <Link href="/" className="press flex items-center gap-2 text-[17px] font-semibold tracking-[-0.022em]">
          <span className="w-8 h-8 rounded-[9px] bg-primary text-white flex items-center justify-center">
            <Icon name="sports_soccer" size={20} />
          </span>
          <span>Field Reserve</span>
        </Link>
        <Suspense>
          <SeccionActual />
        </Suspense>
        <div className="flex-1" />
        {user && (
          <div className="hidden sm:flex flex-col items-end leading-tight mr-1">
            <span className="text-sm font-medium">{user.nombre}</span>
            <span className="text-xs text-text-2">{user.rol === "ADMIN" ? "Administrador" : "Encargado"}</span>
          </div>
        )}
        <IconButton
          icon="logout"
          title="Cerrar sesión"
          onClick={() => {
            logout();
            router.replace("/login");
          }}
        />
      </header>

      <div className="flex flex-1 min-h-0">
        {/* mat-sidenav */}
        {open && <div className="fixed inset-0 top-14 z-20 bg-black/25 backdrop-blur-[2px] lg:hidden" onClick={() => setOpen(false)} />}
        <nav
          className={`fixed lg:sticky top-14 z-20 h-[calc(100vh-3.5rem)] w-64 shrink-0 overflow-y-auto bg-[#f5f5f7]/90 backdrop-blur-xl border-r border-divider py-3 transition-transform duration-300 ease-[var(--ease-spring)] lg:translate-x-0 ${
            open ? "translate-x-0 shadow-z8" : "-translate-x-full"
          }`}
        >
          <Suspense fallback={<Menu isAdmin={isAdmin} pathname={null} />}>
            <MenuActivo isAdmin={isAdmin} />
          </Suspense>
        </nav>

        <main className="flex-1 min-w-0 p-4 md:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto">
            {!user && <Loading />}
            {/*
              La página se renderiza siempre (Next.js la necesita para validar la navegación instantánea),
              pero queda oculta hasta tener sesión. Sin token, el cliente API no llega a llamar al backend.
            */}
            <div className={user ? undefined : "hidden"}>{children}</div>
          </div>
        </main>
      </div>
    </div>
  );
}

function CerrarMenuAlNavegar({ onNavigate }: { onNavigate: () => void }) {
  const pathname = usePathname();
  useEffect(() => onNavigate(), [pathname, onNavigate]);
  return null;
}

function SeccionActual() {
  const pathname = usePathname();
  const current = NAV.flatMap((g) => g.items).find((i) => isActive(pathname, i.href));
  return current ? <span className="hidden md:inline text-text-2 ml-3">/ {current.label}</span> : null;
}

function MenuActivo({ isAdmin }: { isAdmin: boolean }) {
  return <Menu isAdmin={isAdmin} pathname={usePathname()} />;
}

function Menu({ isAdmin, pathname }: { isAdmin: boolean; pathname: string | null }) {
  return (
    <>
      {NAV.map((g, gi) => {
        const items = g.items.filter((i) => !i.admin || isAdmin);
        if (!items.length) return null;
        return (
          <div key={gi} className={gi > 0 ? "mt-3" : ""}>
            {g.title && <div className="px-5 h-8 flex items-center text-xs font-semibold text-text-2">{g.title}</div>}
            {items.map((i) => {
              const active = pathname !== null && isActive(pathname, i.href);
              return (
                <Link
                  key={i.href}
                  href={i.href}
                  className={`press flex items-center gap-3 h-10 px-3 mx-3 rounded-[10px] text-[15px] ${
                    active ? "bg-primary-50 text-primary font-medium" : "text-text hover:bg-hover"
                  }`}
                >
                  <Icon name={i.icon} size={22} className={active ? "text-primary" : "text-text-2"} />
                  {i.label}
                </Link>
              );
            })}
          </div>
        );
      })}
    </>
  );
}

/** Bloquea el contenido a usuarios que no son ADMIN. */
export function AdminOnly({ children }: { children: React.ReactNode }) {
  const { isAdmin } = useAuth();
  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center gap-2 py-16 text-text-2">
        <Icon name="lock" size={40} />
        <span>Esta sección es solo para administradores.</span>
      </div>
    );
  }
  return <>{children}</>;
}
