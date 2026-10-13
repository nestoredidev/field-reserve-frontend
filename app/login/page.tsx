"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button, ErrorBanner, Icon, TextField } from "@/components/ui";
import { useAuth } from "@/lib/auth";
import { errorText } from "@/lib/hooks";

export default function LoginPage() {
  const { user, login } = useAuth();
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user) router.replace("/");
  }, [user, router]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await login(username.trim(), password);
      router.replace("/");
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  };

  const features = [
    { icon: "event_available", text: "Reserva canchas en segundos" },
    { icon: "inventory_2", text: "Control de bodega y stock" },
    { icon: "payments", text: "Caja y pagos al día" },
  ];

  return (
    <div className="min-h-screen grid lg:grid-cols-[1.1fr_1fr]">
      {/* Panel de marca */}
      <aside className="relative hidden lg:flex flex-col justify-between overflow-hidden bg-gradient-to-br from-primary-dark via-primary to-[#5c6bc0] p-12 text-white">
        <svg className="absolute inset-0 w-full h-full opacity-[0.12]" viewBox="0 0 400 600" preserveAspectRatio="xMidYMid slice" fill="none" stroke="currentColor" strokeWidth="3" aria-hidden>
          <rect x="40" y="40" width="320" height="520" rx="6" />
          <line x1="40" y1="300" x2="360" y2="300" />
          <circle cx="200" cy="300" r="60" />
          <rect x="120" y="40" width="160" height="80" />
          <rect x="120" y="480" width="160" height="80" />
        </svg>
        <div className="absolute -right-24 -bottom-24 w-96 h-96 rounded-full bg-accent/30 blur-3xl" />
        <div className="absolute -left-20 -top-20 w-72 h-72 rounded-full bg-white/10 blur-3xl" />

        <div className="relative flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-white/15 backdrop-blur flex items-center justify-center">
            <Icon name="sports_soccer" size={28} />
          </div>
          <span className="text-xl font-semibold tracking-[-0.02em]">Field Reserve</span>
        </div>

        <div className="relative max-w-md">
          <h2 className="text-5xl font-semibold leading-[1.05] tracking-[-0.035em]">
            Tu cancha, <span className="text-white/60">siempre lista</span>.
          </h2>
          <p className="mt-4 text-white/75 text-base leading-6">
            Gestiona reservas, bodega y caja desde un solo lugar.
          </p>
          <ul className="mt-8 flex flex-col gap-4">
            {features.map((f) => (
              <li key={f.icon} className="flex items-center gap-3 text-white/90">
                <span className="w-9 h-9 rounded-full bg-white/15 flex items-center justify-center">
                  <Icon name={f.icon} size={20} />
                </span>
                {f.text}
              </li>
            ))}
          </ul>
        </div>

        <div className="relative text-white/50 text-xs">Field Reserve · Reservas de canchas y bodega</div>
      </aside>

      {/* Formulario */}
      <main className="relative flex items-center justify-center px-5 py-10 bg-gradient-to-b from-primary-50 to-bg lg:from-bg lg:to-bg">
        <div className="w-full max-w-sm" style={{ animation: "sheet-in 0.6s var(--ease-spring)" }}>
          <div className="lg:hidden flex items-center justify-center gap-2 text-primary mb-8">
            <Icon name="sports_soccer" size={36} />
            <span className="text-2xl font-semibold tracking-[-0.025em]">Field Reserve</span>
          </div>

          <div className="bg-surface rounded-[22px] shadow-z4 lg:shadow-none lg:bg-transparent p-7 lg:p-0">
            <h1 className="text-[34px]">Bienvenido</h1>
            <p className="text-text-2 mt-1 mb-7">Inicia sesión para continuar</p>

            <form onSubmit={submit} className="flex flex-col gap-5">
              <TextField
                label="Usuario"
                autoComplete="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                autoFocus
              />
              <div className="mat-field">
                <label>Contraseña *</label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="pr-11"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                    className="absolute right-1 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full flex items-center justify-center text-text-2 hover:bg-hover cursor-pointer"
                  >
                    <Icon name={showPassword ? "visibility_off" : "visibility"} size={20} />
                  </button>
                </div>
              </div>
              {error && <ErrorBanner message={error} />}
              <Button type="submit" loading={busy} icon="login" className="h-12 mt-1 text-base">
                Ingresar
              </Button>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
}
