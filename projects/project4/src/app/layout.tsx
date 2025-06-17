import type { Metadata } from "next";
import "./globals.css";
import "../styles/terminal.css";
import { QueryProvider } from "@/components/providers/QueryProvider";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { ToastProvider } from "@/components/Toast";

export const metadata: Metadata = {
  title: "CryptoVision Terminal - AI Crypto Predictor",
  description: "Claude-Powered Cryptocurrency Predictions & Market Analysis",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="font-mono bg-terminal-black text-terminal-white">
        <ErrorBoundary>
          <ToastProvider>
            <QueryProvider>
              {children}
            </QueryProvider>
          </ToastProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}