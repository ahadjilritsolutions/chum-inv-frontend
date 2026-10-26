"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { clearAuthSession } from "@/lib/auth/auth-client";
import { logout } from "@/services/auth/auth";
import { useAccess } from "@/lib/auth/AccessProvider";
import {
  aideFaqNavItem,
  logoutNavItem,
  visibleNavItems,
  type NavItem,
} from "@/lib/inv/nav-items";
import type { AuthUser } from "@/types/auth/auth";

// ── Shared row style ──────────────────────────────────────────────────────────
// Rows are laid out at the EXPANDED width (240px) at all times; collapsing is
// done by clipping the aside, not by re-flowing the row. That is what makes the
// hover expansion slide instead of jump.
const rowBase =
  "flex items-center h-[44px] w-[240px] text-white/75 hover:text-white " +
  "hover:bg-white/10 transition-colors cursor-pointer";

// ── Icon slot (always 60px, stays visible when collapsed) ─────────────────────
function IconSlot({
  icon: Icon,
  iconColor,
  iconBg,
  size = 15,
}: {
  icon: NavItem["icon"];
  iconColor: string;
  iconBg: string;
  size?: number;
}) {
  return (
    <span className="w-[60px] min-w-[60px] flex items-center justify-center shrink-0">
      <span
        className="w-7 h-7 flex items-center justify-center rounded-[9px]"
        style={{ color: iconColor, backgroundColor: iconBg }}
      >
        <Icon size={size} />
      </span>
    </span>
  );
}

/**
 * Active matching for hrefs that carry a query string.
 *
 * A leaf like `/articles?statut=reforme` is active only when the path matches AND
 * every one of its query params matches — so "Articles" (no query) does not
 * light up all of its children, and switching tab moves the highlight.
 */
function isHrefActive(
  href: string,
  pathname: string,
  searchParams: URLSearchParams,
): boolean {
  const [hrefPath, hrefQuery] = href.split("?");
  if (pathname !== hrefPath) return false;
  if (!hrefQuery) return true;
  for (const [k, v] of new URLSearchParams(hrefQuery)) {
    if (searchParams.get(k) !== v) return false;
  }
  return true;
}

// ── Single nav node ───────────────────────────────────────────────────────────
function NavNode({ item, onClose }: { item: NavItem; onClose?: () => void }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [expanded, setExpanded] = useState(false);

  const childActive =
    item.children?.some((c) => isHrefActive(c.href, pathname, searchParams)) ?? false;
  // The parent lights up on its bare route only; once a child's query is in the
  // URL the highlight belongs to that child.
  const parentActive = isHrefActive(item.href, pathname, searchParams);
  const isOpen = expanded || childActive || parentActive;

  if (item.children?.length) {
    return (
      <li>
        <div
          className={cn(
            "flex items-center w-[240px] h-[44px] text-white/75 transition-colors",
            (parentActive || isOpen) && "bg-white/[0.12] text-white",
          )}
        >
          <Link
            href={item.href}
            onClick={onClose}
            className="flex items-center flex-1 min-w-0 h-full no-underline text-current hover:text-white hover:bg-white/10 transition-colors"
          >
            <IconSlot icon={item.icon} iconColor={item.iconColor} iconBg={item.iconBg} />
            <span className="flex-1 whitespace-nowrap text-[13.5px] font-medium">
              {item.label}
            </span>
          </Link>
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            aria-label={isOpen ? "Réduire" : "Développer"}
            aria-expanded={isOpen}
            className={cn(
              "mr-3 shrink-0 w-6 h-6 flex items-center justify-center rounded transition-transform duration-200 text-white/75 hover:text-white hover:bg-white/10 cursor-pointer",
              isOpen && "rotate-90",
            )}
          >
            <ChevronRight size={13} />
          </button>
        </div>

        {isOpen && (
          <ul className="list-none m-0 p-0 bg-black/10">
            {item.children.map((child) => (
              <li key={child.href}>
                <Link
                  href={child.href}
                  onClick={onClose}
                  className={cn(
                    "flex items-center h-[40px] w-[240px] text-white/65 hover:text-white",
                    "hover:bg-white/10 no-underline transition-colors",
                    isHrefActive(child.href, pathname, searchParams) &&
                      "bg-white/[0.12] text-white",
                  )}
                >
                  <IconSlot
                    icon={child.icon}
                    iconColor={child.iconColor}
                    iconBg={child.iconBg}
                    size={13}
                  />
                  <span className="whitespace-nowrap text-[13px]">{child.label}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </li>
    );
  }

  return (
    <li>
      <Link
        href={item.href}
        onClick={onClose}
        aria-current={parentActive ? "page" : undefined}
        className={cn(
          rowBase,
          "no-underline",
          pathname.startsWith(item.href) &&
            "bg-white/[0.14] text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08)]",
        )}
      >
        <IconSlot icon={item.icon} iconColor={item.iconColor} iconBg={item.iconBg} />
        <span className="flex-1 whitespace-nowrap text-[13.5px] font-medium">
          {item.label}
        </span>
        {/* No "coming soon" marker any more: the rail only lists screens that
            exist. An entry that opens an empty page teaches people not to
            click. */}
      </Link>
    </li>
  );
}

interface SidebarProps {
  user: AuthUser;
  isOpen?: boolean;
  onClose?: () => void;
}

/**
 * Navigation rail — the DEP frontend's sidebar, item-for-item.
 *
 * Desktop: a 60px icon rail that expands to 240px on hover.
 * Mobile:  a 240px drawer that slides in from the left.
 */
export default function Sidebar({ user, isOpen = false, onClose }: SidebarProps) {
  const router = useRouter();
  // The rail shows what this session can reach. An administrator acting as
  // someone else keeps the admin.* codes, so Administration — the way back to
  // their own role — never vanishes from under them.
  const { can } = useAccess();

  async function handleLogout() {
    // End it on the server FIRST: the local wipe only hides the token, while
    // the session row is what keeps the user "connected" for everyone else.
    await logout();
    clearAuthSession();
    router.replace("/login");
  }

  const initials =
    ((user.prenom?.[0] ?? "") + (user.nom?.[0] ?? "")).toUpperCase() || "?";

  return (
    <aside
      className={cn(
        "fixed left-0 top-[57px] h-[calc(100vh-57px)] z-[1035]",
        "flex flex-col overflow-hidden",
        "[background:var(--gradient-sidebar)]",
        "shadow-[3px_0_18px_rgba(0,0,0,0.25)]",
        // Mobile: fixed 240px drawer, slides in/out via transform
        "w-[240px] transition-transform duration-300 ease-in-out",
        isOpen ? "translate-x-0" : "-translate-x-full",
        // Desktop: always visible icon rail, expands to 240px on hover
        "md:translate-x-0 md:w-[60px] md:hover:w-[240px] md:transition-[width] md:duration-300 md:ease-in-out",
      )}
    >
      <div
        className={cn(
          "flex-1 overflow-y-auto overflow-x-hidden py-2",
          "[scrollbar-width:thin] [scrollbar-color:rgba(255,255,255,0.1)_transparent]",
        )}
      >
        <nav>
          <ul className="list-none m-0 p-0 flex flex-col">
            {visibleNavItems(can).map((item) => (
              <NavNode key={item.label} item={item} onClose={onClose} />
            ))}

            {/* Aide et FAQ — external portal, opens in a new tab */}
            <li className="mt-2 border-t border-white/10">
              <a
                href={aideFaqNavItem.href}
                target="_blank"
                rel="noopener noreferrer"
                onClick={onClose}
                className={cn(rowBase, "no-underline")}
              >
                <IconSlot
                  icon={aideFaqNavItem.icon}
                  iconColor={aideFaqNavItem.iconColor}
                  iconBg={aideFaqNavItem.iconBg}
                />
                <span className="whitespace-nowrap text-[13.5px] font-medium">
                  {aideFaqNavItem.label}
                </span>
              </a>
            </li>

            {/* Logout */}
            <li className="border-t border-white/10">
              <button
                type="button"
                onClick={handleLogout}
                className={cn(
                  rowBase,
                  "border-0 bg-transparent font-[inherit] w-[240px]",
                  "!text-red-400 hover:!text-red-300",
                )}
              >
                <IconSlot
                  icon={logoutNavItem.icon}
                  iconColor={logoutNavItem.iconColor}
                  iconBg={logoutNavItem.iconBg}
                />
                <span className="whitespace-nowrap text-[13.5px] font-medium">
                  {logoutNavItem.label}
                </span>
              </button>
            </li>
          </ul>
        </nav>
      </div>

      {/* User initials at the bottom */}
      <div className="shrink-0 border-t border-white/10 h-[52px] flex items-center">
        <span className="w-[60px] min-w-[60px] flex items-center justify-center shrink-0">
          <span className="w-8 h-8 rounded-full bg-white/20 border border-white/30 flex items-center justify-center text-white font-bold text-xs">
            {initials}
          </span>
        </span>
        <span className="whitespace-nowrap text-sm font-medium text-white/80 overflow-hidden">
          {user.prenom} {user.nom}
        </span>
      </div>
    </aside>
  );
}
