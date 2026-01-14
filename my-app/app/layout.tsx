import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "../context/AuthContext";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "My Not-A-Smart Charger App",
  description: "Checkout your sexy app",
};



export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased">
            <AuthProvider>
                {children}
            </AuthProvider>
      </body>
    </html>
  );
}