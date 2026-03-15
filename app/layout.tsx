import type { Metadata } from "next";
import { Playfair_Display, Poppins } from "next/font/google";
import RouteScrollReset from "@/components/navigation/route-scroll-reset";
import ToastProvider from "@/components/ui/toast";
import { APP_BRAND } from "@/lib/constants/brand";
import "./globals.css";

const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
  weight: ["600", "700"],
});

const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: APP_BRAND.fullName,
  description:
    `${APP_BRAND.fullName} for centralized ancillary operations, reporting, training access, and department oversight.`,
  icons: {
    icon: "/assets/logo.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${playfair.variable} ${poppins.variable} font-sans antialiased m-0 overflow-x-hidden bg-zinc-950`}>
        <RouteScrollReset />
        <ToastProvider>
          {children}
        </ToastProvider>
      </body>
    </html>
  );
}
