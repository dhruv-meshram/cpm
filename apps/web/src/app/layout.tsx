import type { Metadata } from "next";
import { Inter, Geist_Mono } from "next/font/google";
import "./globals.css";
import { QueryProvider } from "@/components/providers/QueryProvider";
import { WebSocketListener } from "@/components/WebSocketListener";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "CPM Planner — Critical Path Method Scheduling",
  description:
    "Professional project scheduling with critical path analysis, Gantt charts, and network diagrams. Map dependencies, calculate float, and identify delivery-critical tasks instantly.",
  keywords: ["CPM", "critical path", "project management", "Gantt chart", "scheduling"],
  authors: [{ name: "CPM Planner" }],
  openGraph: {
    title: "CPM Planner",
    description: "Master your project schedules with Critical Path logic.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-[#f6f5f4] text-[#000000]">
        <QueryProvider>
          <WebSocketListener />
          {children}
        </QueryProvider>
      </body>
    </html>
  );
}
