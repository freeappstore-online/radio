import { useEffect, useState } from "react";
import { initApp } from "@freeappstore/sdk";
import { type NavItem, PageHeader, Shell } from "@freeappstore/sdk/ui";
import { BrowseScreen } from "./components/BrowseScreen";
import { LibraryScreen } from "./components/LibraryScreen";
import { PlayerBar } from "./components/PlayerBar";
import { player } from "./services/player";

export const fas = initApp({ appId: "radio" });

const NAV: NavItem[] = [
  { label: "Browse", href: "/", title: "Radio — FreeAppStore" },
  { label: "Library", href: "/library", title: "Library — Radio" },
  { label: "About", href: "/about", title: "About — Radio" },
];

export default function App() {
  const [path, setPath] = useState(() => window.location.pathname);

  useEffect(() => {
    const sync = () => setPath(window.location.pathname);
    window.addEventListener("popstate", sync);
    return () => window.removeEventListener("popstate", sync);
  }, []);

  const navigate = (href: string) => {
    window.history.pushState(null, "", href);
    setPath(window.location.pathname);
  };

  return (
    <Shell app={fas} appName="Radio" nav={NAV} onNavigate={navigate}>
      <Screens path={path} />
    </Shell>
  );
}

function Screens({ path }: { path: string }) {
  // Shell swaps these out for its Profile screen; pause so audio never plays without controls.
  useEffect(() => () => player.pause(), []);

  return (
    <>
      <div className="mx-auto w-full max-w-3xl flex-1 p-4 sm:p-8">
        {path === "/about" ? <About /> : path === "/library" ? <LibraryScreen /> : <BrowseScreen />}
      </div>
      <PlayerBar />
    </>
  );
}

function About() {
  return (
    <>
      <PageHeader title="About" />
      <div className="mt-4 space-y-3 text-ink">
        <p>Radio is a free app for listening to live internet radio from around the world.</p>
        <p className="text-muted">
          Station listings come from the community-run{" "}
          <a className="text-accent underline" href="https://www.radio-browser.info" target="_blank" rel="noopener noreferrer">Radio Browser</a>{" "}
          directory and <a className="text-accent underline" href="https://somafm.com" target="_blank" rel="noopener noreferrer">SomaFM</a>.
          Streams play directly from each station. Favorites, history and blocked stations stay on this device.
        </p>
        <p className="text-muted">
          Looking for classical, jazz and blues recordings? Try{" "}
          <a className="text-accent underline" href="https://music.freeappstore.online">Music</a>. Radio is part of{" "}
          <a className="text-accent underline" href="https://freeappstore.online">FreeAppStore</a>.
        </p>
      </div>
    </>
  );
}
