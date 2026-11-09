import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import * as nav from "../config/navigation";
import Sidebar from "../components/Sidebar"; // adjust the path or name if yours differs

const items =
  nav.default || nav.navigation || nav.navItems || nav.menuItems || Object.values(nav).find(Array.isArray) || [];

describe("navigation config", () => {
  it("has items with a label and a path starting with /", () => {
    expect(items.length).toBeGreaterThan(0);
    items.forEach((i) => {
      expect(i.label).toBeTruthy();
      expect(i.path.startsWith("/")).toBe(true);
    });
  });

  it("has no duplicate paths", () => {
    const paths = items.map((i) => i.path);
    expect(new Set(paths).size).toBe(paths.length);
  });

  it("points Settings to /settings and Help to /help", () => {
    expect(items.find((i) => i.label === "Settings")?.path).toBe("/settings");
    expect(items.find((i) => i.label === "Help & Support")?.path).toBe("/help");
  });
});

describe("Sidebar", () => {
  it("renders every menu item as a link with the right path", () => {
    render(
      <MemoryRouter initialEntries={["/dashboard"]}>
        <Sidebar />
      </MemoryRouter>
    );
    items.forEach((i) => {
      const links = screen.getAllByRole("link", { name: new RegExp(i.label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i") });
      expect(links.some((a) => a.getAttribute("href") === i.path)).toBe(true);
    });
  });
});