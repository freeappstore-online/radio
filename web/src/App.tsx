import { useEffect, useState } from "react";
import { initApp } from "@freeappstore/sdk";
import { type NavItem, PageHeader, ProfilePage, Shell } from "@freeappstore/sdk/ui";
import { BrowseScreen } from "./components/BrowseScreen";
import { LibraryScreen } from "./components/LibraryScreen";
import { PlayerBar } from "./components/PlayerBar";
import { Home, Library, Info, UserRound } from "lucide-react";
import { AudioProvider, useAudioPlayer } from "./AudioContext";

export const fas = initApp({ appId: "radio" });

const NAV: NavItem[] = [
  { label: "Browse", href: "/", title: "Radio — FreeAppStore" },
  { label: "Library", href: "/library", title: "Library — Radio" },
  { label: "About", href: "/about", title: "About — Radio" },
];

export default function App() {
  return <AudioProvider><AppShell /><PlayerBar /></AudioProvider>;
}

function AppShell() {
  const audio = useAudioPlayer();
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
    <Shell app={fas} appName="Radio" nav={NAV} onNavigate={navigate} profileHref="/profile" headerAppearance={false}
      headerActions={audio.station ? <span className="hidden max-w-40 truncate text-sm text-muted lg:block">{audio.isPlaying ? "Playing" : "Paused"}: {audio.station.name}</span> : null}
      renderNav={({ items, currentPath, onNavigate }) => {
        const tabs = [...items, { label: "Profile", href: "/profile" }];
        const icons = [Home, Library, Info, UserRound];
        return <nav aria-label="Main" className="fixed inset-x-0 bottom-0 z-50 flex h-16 max-w-full items-stretch justify-around border-t border-line bg-panel pb-[env(safe-area-inset-bottom)] sm:static sm:h-auto sm:justify-start sm:gap-1 sm:border-0 sm:bg-transparent sm:pb-0">
          {tabs.map((item, i) => { const Icon = icons[i]; return <a key={item.href} href={item.href} aria-current={currentPath.split("?")[0] === item.href ? "page" : undefined} onClick={e => { if (!e.ctrlKey && !e.metaKey && !e.shiftKey && !e.altKey && e.button === 0) { e.preventDefault(); onNavigate(item.href); } }} className={`flex min-h-11 min-w-11 flex-1 flex-col items-center justify-center rounded px-1 text-xs text-ink focus-visible:outline-2 focus-visible:outline-accent sm:flex-none ${item.href === "/profile" ? "sm:hidden" : ""}`}><Icon aria-hidden size={19} /><span>{item.label}</span></a> })}
        </nav>;
      }}>
      <Screens path={path} />
    </Shell>
  );
}

function Screens({ path }: { path: string }) {
  return (
    <>
      <div className="mx-auto w-full max-w-3xl min-w-0 flex-1 p-4 sm:p-8">
        {path === "/profile" ? <ProfilePage app={fas} /> : path === "/about" ? <About /> : path === "/library" ? <LibraryScreen /> : <BrowseScreen />}
      </div>
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
