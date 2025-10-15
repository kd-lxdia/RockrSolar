import type React from "react";
import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import { Analytics } from "@vercel/analytics/next";
import { Suspense } from "react";
import "./globals.css";

// 👇 add these imports
import { InventoryProvider } from "@/lib/inventory-store-postgres";
import { AuthProvider } from "@/lib/auth-context";
import ClientOnly from "@/components/ClientOnly";

export const metadata: Metadata = {
  title: "Sales Dashboard",
  description: "Rocker Solar Sales Dashboard",
  generator: "v0.app",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`dark ${GeistSans.variable} ${GeistMono.variable} antialiased`}
    >
      <body className="font-sans">
        {/* Client provider supplies PostgreSQL-backed inventory state to the whole app */}
        <ClientOnly fallback={<div className="h-screen bg-[#0b0c10] flex items-center justify-center text-neutral-400">Loading...</div>}>
          <AuthProvider>
            <InventoryProvider>
              <Suspense fallback={null}>{children}</Suspense>
            </InventoryProvider>
          </AuthProvider>
        </ClientOnly>
        <Analytics />
      </body>
    </html>
  );
}
