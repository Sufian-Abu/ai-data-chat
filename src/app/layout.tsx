import type { ReactNode } from "react";

export const metadata = {
  title: "AI Data Chat MVP",
  description: "Chat with your database using AI",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, background: "#fff", color: "#000" }}>
        {children}
      </body>
    </html>
  );
}