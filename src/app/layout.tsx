import type { Metadata } from "next";
import {
  Archivo_Black,
  Public_Sans,
  Fragment_Mono,
  Bangers,
  Permanent_Marker,
} from "next/font/google";
import { Web3Providers } from "@/components/providers/Web3Providers";
import "./globals.css";

const display = Archivo_Black({
  variable: "--font-display",
  subsets: ["latin"],
  weight: "400",
});

const tag = Bangers({
  variable: "--font-tag",
  subsets: ["latin"],
  weight: "400",
});

const marker = Permanent_Marker({
  variable: "--font-marker",
  subsets: ["latin"],
  weight: "400",
});

const body = Public_Sans({
  variable: "--font-body",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const mono = Fragment_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: "400",
});

export const metadata: Metadata = {
  title: "STAMP — 멀티체인 NFT 민팅",
  description:
    "EVM, Solana, TRON, XRP Ledger에서 NFT·멀티토큰을 한곳에서 민팅하세요.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ko"
      className={`${display.variable} ${tag.variable} ${marker.variable} ${body.variable} ${mono.variable} h-full antialiased`}
    >
      <body className="flyer-wall min-h-full flex flex-col">
        {/*
          THESIS: Minting is pasting tonight's flyer on a wall of older nights — one sheet, one press, twelve chains showing through the tears.
          OWN-WORLD: Photocopy black ground; fluorescent pink + acid lime; graffiti hero tag (Bangers/Permanent Marker) over Archivo system; torn sheets; hard offsets.
          STORY: Creator lands on STAMP, tears into mint flow.
          FIRST VIEWPORT: Graffiti pink sheet with STAMP tag, drips, stickers, TEAR handle.
          FORM: Torn Flyer Wall · Full-Bleed Wall · seed d121c9e6 · graffiti hero.
          FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, and DESIGN.md
        */}
        <Web3Providers>{children}</Web3Providers>
      </body>
    </html>
  );
}
