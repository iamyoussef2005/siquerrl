import type { Metadata } from "next";
import { Alexandria } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/contexts/AuthContext";
import { WebSplashScreen } from "@/components/WebSplashScreen";

const alexandria = Alexandria({
  subsets: ["arabic", "latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
  variable: "--font-alexandria",
  display: "swap",
});

export const metadata: Metadata = {
  title: "سنجاب دليفري | Sinjab Delivery - منظومة إدارة وتوصيل الطلبات",
  description: "المنظومة السحابية الذكية لإدارة وتوزيع طلبات التوصيل والتدقيق المالي والعمليات اللحظية",
  icons: {
    icon: "/sinjab-logo.png",
    apple: "/sinjab-logo.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ar" dir="rtl" className={`${alexandria.variable} h-full antialiased`}>
      <body className="min-h-full font-sans bg-[#fcfcfd] text-zinc-900 selection:bg-orange-500 selection:text-white antialiased">
        <AuthProvider>
          <WebSplashScreen />
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
