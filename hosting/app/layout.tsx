import type { Metadata } from "next";
import { headers } from "next/headers";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const host = requestHeaders.get("host") || "trackswift.chatgpt-team.site";
  const protocol = requestHeaders.get("x-forwarded-proto") || "https";

  return {
    metadataBase: new URL(`${protocol}://${host}`),
    title: {
      default: "TrackSwift — Private shipment tracking",
      template: "%s | TrackSwift",
    },
    description:
      "Track international shipments securely from Italy to the United States with live milestone updates.",
    openGraph: {
      title: "TrackSwift — From Italy to America, every step visible",
      description:
        "Secure shipment tracking with real-time milestones, delivery estimates, and carrier notes.",
      type: "website",
      images: [{ url: "/og.png", width: 1536, height: 1024 }],
    },
    twitter: {
      card: "summary_large_image",
      title: "TrackSwift — Private shipment tracking",
      description: "Secure shipment tracking from origin to final delivery.",
      images: ["/og.png"],
    },
    icons: {
      icon: "/favicon.svg",
      shortcut: "/favicon.svg",
    },
  };
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
