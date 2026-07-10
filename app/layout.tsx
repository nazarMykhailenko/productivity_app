import type { Metadata, Viewport } from "next";
import "./globals.css";
import { LockProvider } from "@/lib/auth";
import { StoreProvider } from "@/lib/store";
import LockGate from "@/components/LockGate";
import Nav from "@/components/Nav";

export const metadata: Metadata = {
  title: "Momentum — personal productivity",
  description: "Category-based to-dos with deadlines, habits, weight, and progress stats.",
  applicationName: "Momentum",
  // A personal tracker on a public URL: keep it out of search results.
  robots: { index: false, follow: false },
  appleWebApp: { capable: true, title: "Momentum", statusBarStyle: "black" },
};

export const viewport: Viewport = {
  themeColor: "#0d0d0f",
  colorScheme: "dark",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen">
        {/* The gate lives above the store and the nav, so a locked screen shows
            no tabs and loads no data. Unlock state is in memory, so moving
            between tabs never re-prompts — only a fresh page load does. */}
        <LockProvider>
          <LockGate>
            <StoreProvider>
              <Nav />
              <main className="mx-auto w-full max-w-5xl px-4 pb-24 pt-8 sm:px-6">
                {children}
              </main>
            </StoreProvider>
          </LockGate>
        </LockProvider>
      </body>
    </html>
  );
}
