import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";

export const getRouter = () => {
  const queryClient = new QueryClient();

  const router = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    // troca de página vai direto ao topo (sem animação longa de rolagem)
    scrollRestorationBehavior: "instant",
    // links com âncora (#produtos, #clubes…) rolam suave até a seção
    defaultHashScrollIntoView: { behavior: "smooth", block: "start" },
    defaultPreloadStaleTime: 0,
  });

  return router;
};
