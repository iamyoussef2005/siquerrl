import type { Metadata } from "next";
import { Alexandria } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/contexts/AuthContext";

const alexandria = Alexandria({
  subsets: ["arabic", "latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
  variable: "--font-alexandria",
  display: "swap",
});

export const metadata: Metadata = {
  title: "نظام إدارة توصيل الطلبات - Siquerrl",
  description: "منظومة متكاملة لإدارة توصيل الطلبات والمناديب والحسابات لحظياً",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ar" dir="rtl" className={`${alexandria.variable} h-full antialiased`}>
      <body className="min-h-full font-sans bg-[#f8fafc] text-slate-900 selection:bg-blue-600 selection:text-white antialiased">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
