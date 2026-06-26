import type { Metadata } from "next";
import { Kanit, Sarabun } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/Providers";

const kanit = Kanit({
  weight: ['500', '600', '700', '800'],
  subsets: ['latin'],
  variable: '--font-kanit',
});

const sarabun = Sarabun({
  weight: ['400', '500', '600', '700'],
  subsets: ['latin'],
  variable: '--font-sarabun',
});

export const metadata: Metadata = {
  title: "ภารกิจครอบครัว: นักผจญภัยตัวน้อย",
  description: "แอปเกมสะสมแต้มสำหรับเด็ก: ทำภารกิจประจำวัน → พ่อ/แม่ตรวจ → ได้เหรียญ+EXP → อัปเกรดตัวละคร/บ้าน/รถ → แลกของรางวัลจริง",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="th" className={`${kanit.variable} ${sarabun.variable}`}>
      <body className="min-h-full flex flex-col font-sarabun">
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
