"use client";
import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Icon } from "@/components/ui/Icon";
import { navItems } from "@/components/layout/nav-items";
import { ViewAsDialog } from "@/components/layout/ViewAsDialog";
import { ClerkBridge } from "@/lib/clerk-bridge";
import { Guard } from "@/lib/guard";
import { useTheme } from "@/hooks/theme";
import type { ThemeMode } from "@/hooks/theme";
import { canSeeRole, metaOf } from "@/lib/routes";
import { useAuth, useSeason } from "@/stores";
import { myProfilePath } from "@/helpers/players.mjs";
import w3cLogo from "@/assets/media/w3c-logo.png";
import w3cLogoWhite from "@/assets/media/w3c-logo-white.png";

// Light, dark, or the operating system setting. The choice is kept in localStorage.
const THEMES: { value: ThemeMode; title: string; icon: string }[] = [
  { value: "light", title: "Light", icon: "mdi-white-balance-sunny" },
  { value: "dark", title: "Dark", icon: "mdi-weather-night" },
  { value: "system", title: "System", icon: "mdi-theme-light-dark" },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const { me, user, viewAs, logout, setViewAs } = useAuth();
  const { slugOf } = useSeason();
  const { themeMode, activeTheme, setThemeMode } = useTheme();
  const [drawer, setDrawer] = useState(false);
  const [viewAsOpen, setViewAsOpen] = useState(false);
  // view-as: an admin sees the app as a lower role; the legacy token session cannot
  const canViewAs = me?.actual_role === "admin" && !user;

  // The dark-ink W3C mark is made for the light theme; the dark theme takes the white original.
  const w3cMark = (activeTheme === "dark" ? w3cLogoWhite : w3cLogo).src;
  const themeIcon = THEMES.find((t) => t.value === themeMode)?.icon || "mdi-theme-light-dark";

  // the nav links are drawn for a session on any route that does not opt out with meta.nav
  const showNavLinks = !!me && metaOf(path).nav !== false;
  // a link is drawn only when the session role reaches the target route's meta.role
  const canSee = (to: string) => canSeeRole(me?.role, metaOf(to.split("?")[0]).role);
  const nav = navItems(me?.season_id ?? null, slugOf)
    .filter((g) => canSee(g.to))
    .map((g) => (g.items ? { ...g, items: g.items.filter((i) => canSee(i.to)) } : g));

  const avatarUrl: string | null = me?.avatar || null; // /me already answers the CDN URL
  const initials = (me?.name || "?").slice(0, 2).toUpperCase();
  const roleLabel = me?.superadmin ? "Super Admin" : me?.role?.replace(/^./, (c: string) => c.toUpperCase());
  const identity = [me?.name, roleLabel].filter(Boolean).join(" · ");
  // a guest has no player page, so his menu item stays on /profile
  const profileTo = myProfilePath(me);
  // the banner names each seat the admin chose; a seat stored before this shape falls back to /me
  const viewAsLabel = (() => {
    const role = viewAs?.role?.replace(/^./, (c: string) => c.toUpperCase()) ?? "";
    const seats = (viewAs?.seats ?? [])
      .map((seat) => {
        const entry = me?.seasons?.find((season: { id: number }) => Number(season.id) === seat.seasonId);
        const team = seat.team ?? entry?.team?.name;
        return team && `${team} (${seat.season ?? entry?.name})`;
      })
      .filter(Boolean);
    return seats.length ? `${role} · ${seats.join(", ")}` : role;
  })();

  return (
    <div className="flex min-h-dvh flex-col">
      <ClerkBridge />
      <header className="flex items-center gap-2 border-b border-border bg-surface px-2 py-1.5">
        {showNavLinks ? (
          // below 960 px the links live in the drawer, above it in the bar; CSS picks, so
          // the first paint on the server matches the client
          <Sheet open={drawer} onOpenChange={setDrawer}>
            <SheetTrigger render={<Button variant="ghost" size="icon" aria-label="Menu" aria-expanded={drawer} className="min-[960px]:hidden"><Icon name="mdi-menu" /></Button>} />
            <SheetContent side="left" className="w-72 p-4">
              <SheetTitle className="sr-only">Menu</SheetTitle>
              <nav aria-label="Main">
                <ul className="flex flex-col gap-1">
                  {nav.map((group) => (
                    <li key={group.to}>
                      {group.items ? (
                        <>
                          <p className="px-2 pt-3 text-xs text-muted-foreground">{group.title}</p>
                          <ul>
                            {group.items.map((item) => (
                              <li key={item.to}>
                                <Link href={item.to} onClick={() => setDrawer(false)} className="block rounded px-2 py-1.5 text-foreground no-underline hover:bg-accent">{item.title}</Link>
                              </li>
                            ))}
                          </ul>
                        </>
                      ) : (
                        <Link href={group.to} onClick={() => setDrawer(false)} className="block rounded px-2 py-1.5 text-foreground no-underline hover:bg-accent">{group.title}</Link>
                      )}
                    </li>
                  ))}
                </ul>
              </nav>
            </SheetContent>
          </Sheet>
        ) : null}
        <Link href="/report" className="app-title font-heading text-lg font-bold text-foreground no-underline">GNL APP</Link>
        <div className="flex-1" />
        {showNavLinks ? (
          <nav className="hidden items-center min-[960px]:flex" aria-label="Main">
            {nav.map((group) =>
              group.items ? (
                <DropdownMenu key={group.to}>
                  <DropdownMenuTrigger render={<Button variant="ghost" className="text-primary-text">{group.title}<Icon name="mdi-chevron-down" /></Button>} />
                  <DropdownMenuContent className="min-w-[180px]">
                    {group.items.map((item) => (
                      <DropdownMenuItem key={item.to} render={<Link href={item.to} />}>
                        {item.mark ? <img src={w3cMark} alt="W3C" className="mr-1 h-[1.4em]" /> : null}
                        {item.title}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <Button key={group.to} variant="ghost" className="text-primary-text" nativeButton={false} render={<Link href={group.to} />}>{group.title}</Button>
              ),
            )}
          </nav>
        ) : null}
        {/* the session menu sits outside the link tree, so a meta.nav route keeps it */}
        {me ? (
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button variant="ghost" size="icon" aria-label={`Account menu, ${identity}`}>
                  <Avatar className="size-9">
                    {avatarUrl ? <AvatarImage src={avatarUrl} alt="" /> : null}
                    <AvatarFallback className="bg-primary text-on-primary">{initials}</AvatarFallback>
                  </Avatar>
                </Button>
              }
            />
            <DropdownMenuContent align="end">
              <div className="px-2 py-1.5">
                <p className="font-medium">{me.name}</p>
                <p className="text-xs text-muted-foreground">{roleLabel}</p>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem render={<Link href={profileTo} />}><Icon name="mdi-account" />Profile</DropdownMenuItem>
              {me?.user ? <DropdownMenuItem render={<Link href="/availability" />}><Icon name="mdi-calendar-month" />Availability</DropdownMenuItem> : null}
              {canViewAs ? (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => setViewAsOpen(true)}><Icon name="mdi-eye-outline" />View as…</DropdownMenuItem>
                </>
              ) : null}
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => logout()}><Icon name="mdi-logout" />Logout</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : null}
        {/* a signed-out visitor lands on the public pages; this is his way in */}
        {!me ? <Button variant="ghost" nativeButton={false} render={<Link href="/login" />}>Sign in</Button> : null}
        <DropdownMenu>
          <DropdownMenuTrigger render={<Button variant="ghost" size="icon" aria-label="Theme"><Icon name={themeIcon} /></Button>} />
          <DropdownMenuContent align="end">
            {THEMES.map((t) => (
              <DropdownMenuCheckboxItem key={t.value} checked={t.value === themeMode} onClick={() => setThemeMode(t.value)}>
                <Icon name={t.icon} />
                {t.title}
              </DropdownMenuCheckboxItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </header>

      <main id="main" className="flex-1">
        {viewAs ? (
          <Alert className="alert m-2 text-warning">
            <AlertDescription className="flex items-center gap-2 text-foreground">
              <span className="flex-1">Viewing as {viewAsLabel}</span>
              <Button size="sm" variant="outline" onClick={() => setViewAs(null)}>Exit</Button>
            </AlertDescription>
          </Alert>
        ) : null}
        {viewAsOpen ? <ViewAsDialog onOpenChange={setViewAsOpen} /> : null}
        <div className="mx-auto w-full max-w-[1280px] px-2 py-3 md:px-4">
          <Guard>{children}</Guard>
        </div>
        {/* A player name opens the panel over the page, so nothing typed is lost: the panel slot. */}
      </main>

      <footer className="flex justify-end px-3 py-1 text-xs">
        <Link href="/credits" className="text-muted-foreground no-underline">Credits</Link>
      </footer>
    </div>
  );
}
