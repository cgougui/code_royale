import "@mantine/core/styles.css";
import "@fontsource/fredoka/400.css";
import "@fontsource/fredoka/500.css";
import "@fontsource/fredoka/600.css";
import "@fontsource/fredoka/700.css";
import "@fontsource/jetbrains-mono/400.css";
import "@fontsource/jetbrains-mono/700.css";
import "./app.css";

import { ColorSchemeScript, MantineProvider, mantineHtmlProps } from "@mantine/core";
import type { ReactNode } from "react";
import { Links, Meta, Outlet, Scripts, ScrollRestoration } from "react-router";
import { theme } from "./theme";

export function meta() {
  return [
    { title: "Code Royale ⚔️ Code your army!" },
    { name: "description", content: "A coding game for kids: write JavaScript to command the blue army and beat the red team." },
  ];
}

export function links() {
  return [{ rel: "icon", href: "/favicon.svg", type: "image/svg+xml" }];
}

export function Layout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" {...mantineHtmlProps}>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <ColorSchemeScript forceColorScheme="dark" />
        <Meta />
        <Links />
      </head>
      <body>
        <MantineProvider theme={theme} forceColorScheme="dark">
          {children}
        </MantineProvider>
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export default function App() {
  return <Outlet />;
}

export function HydrateFallback() {
  return (
    <div className="boot">
      <div className="boot-crown">👑</div>
      <div className="boot-title">Code Royale</div>
      <div className="boot-sub">Sharpening swords…</div>
    </div>
  );
}
