import { QueryClient, dehydrate, hydrate, type DehydratedState } from "@tanstack/react-query";
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
    // Leva os dados carregados no servidor (produtos) para o navegador: sem isso o cliente
    // começa com o cache vazio e a hidratação não bate com o HTML do servidor.
    // (Os campos `unknown` do DehydratedState não passam na checagem de tipo do router, mas são
    // dados JSON do catálogo; o cast é só para o TypeScript.)
    dehydrate: () => ({ queryState: dehydrate(queryClient) as unknown as Record<string, string> }),
    hydrate: (data) => hydrate(queryClient, data.queryState as unknown as DehydratedState),
  });

  return router;
};
