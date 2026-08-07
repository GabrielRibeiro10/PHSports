import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import {
  RouterProvider,
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
} from "@tanstack/react-router";
import { mapProductRow } from "@/lib/catalog";
import { ProductCard } from "@/components/ProductCard";
import type { Product } from "@/lib/products";
import { XSS_TEXT_PAYLOADS, XSS_URL_PAYLOADS, expectNoUnsafeMarkup } from "@/test/xss-payloads";

vi.mock("@/integrations/supabase/client", () => ({ supabase: { channel: () => ({}) } }));

function renderInRouter(ui: React.ReactNode) {
  const rootRoute = createRootRoute({ component: () => <Outlet /> });
  const indexRoute = createRoute({ getParentRoute: () => rootRoute, path: "/", component: () => <>{ui}</> });
  const productRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: "/produto/$slug",
    component: () => <div>produto</div>,
  });
  const router = createRouter({
    routeTree: rootRoute.addChildren([indexRoute, productRoute]),
    history: createMemoryHistory({ initialEntries: ["/"] }),
  });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return render(<RouterProvider router={router as any} />);
}

function evilProduct(payload: string, url: string): Product {
  return mapProductRow(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    {
      id: "1",
      slug: "camisa-teste",
      name: payload,
      club: payload,
      image_url: url,
      image_url_2: url,
      image_url_3: null,
      image_url_4: null,
      price: 179.9,
      old_price: 259.9,
      discount: 30,
      colors: [payload],
      category: "masculino",
      sizes: null,
      description: payload,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any,
  );
}

describe("ProductCard renders untrusted catalog data safely", () => {
  it.each(XSS_TEXT_PAYLOADS)("never executes markup from %j", async (payload) => {
    const alertSpy = vi.spyOn(window, "alert").mockImplementation(() => {});
    const { container, unmount } = renderInRouter(<ProductCard p={evilProduct(payload, "https://cdn.test/a.png")} />);

    await screen.findByRole("img");
    expectNoUnsafeMarkup(container);
    expect(alertSpy).not.toHaveBeenCalled();
    alertSpy.mockRestore();
    unmount();
  });

  it.each(XSS_URL_PAYLOADS)("never emits an unsafe image src for %j", async (url) => {
    const { container, unmount } = renderInRouter(<ProductCard p={evilProduct("Camisa", url)} />);
    const img = await screen.findByRole("img");
    expect(img.getAttribute("src")).toBe("");
    expectNoUnsafeMarkup(container);
    unmount();
  });

  it("escapes payload text into a text node, not markup", async () => {
    const payload = `<script>alert(1)</script>`;
    const { container, unmount } = renderInRouter(<ProductCard p={evilProduct(payload, "https://cdn.test/a.png")} />);
    await screen.findByRole("img");
    expect(container.querySelector("script")).toBeNull();
    expect(container.innerHTML).not.toContain("<script");
    unmount();
  });
});
