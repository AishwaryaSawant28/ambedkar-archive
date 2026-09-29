export interface NavItem {
  href: string;
  label: string;
  kiosk: boolean;
}

export const NAV_ITEMS: NavItem[] = [
  { href: "/", label: "Home", kiosk: true },
  { href: "/explore", label: "Explore", kiosk: true },
  { href: "/search", label: "Search", kiosk: true },
  { href: "/timeline", label: "Timeline", kiosk: true },
  { href: "/collections", label: "Collections", kiosk: true },
  { href: "/media", label: "Media", kiosk: true },
  { href: "/assistant", label: "AI Assistant", kiosk: true },
  { href: "/my-research", label: "My Research", kiosk: false },
  { href: "/admin", label: "Admin", kiosk: false },
  { href: "/ocr", label: "OCR Workspace", kiosk: false },
];
