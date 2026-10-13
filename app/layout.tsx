import type { Metadata } from "next";
import { AuthProvider } from "@/lib/auth";
import { SnackbarProvider } from "@/components/ui";
import "./globals.css";

export const metadata: Metadata = {
  title: "Field Reserve",
  description: "Gestión de reservas de canchas, cajas y bodega",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es" className="h-full antialiased">
      <head>
        <link rel="stylesheet" href="https://fonts.googleapis.com/icon?family=Material+Icons" />
      </head>
      <body className="min-h-full">
        <AuthProvider>
          <SnackbarProvider>{children}</SnackbarProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
