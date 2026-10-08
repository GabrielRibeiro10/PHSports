import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ComponentType } from "react";

const signInWithPassword = vi.fn();

vi.mock("@tanstack/react-router", () => ({
  createFileRoute: () => (opts: unknown) => opts,
  useNavigate: () => vi.fn(),
}));
vi.mock("@/lib/auth", () => ({ useAuth: () => ({ session: null, isAdmin: false, loading: false }) }));
vi.mock("@/lib/audit", () => ({ writeAudit: vi.fn() }));
vi.mock("sonner", () => ({ toast: { success: vi.fn() } }));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: { auth: { signInWithPassword, signOut: vi.fn() }, from: vi.fn() },
}));
// O widget real da Cloudflare não roda no teste: um botão faz o papel de "passar no desafio".
vi.mock("@/components/admin/Turnstile", () => ({
  Turnstile: ({ onToken, resetKey }: { onToken: (t: string | null) => void; resetKey: number }) => (
    <button type="button" data-reset={resetKey} onClick={() => onToken(`token-${resetKey}`)}>
      Não sou um robô
    </button>
  ),
}));

const { Route } = await import("@/routes/admin/login");
const LoginPage = (Route as unknown as { component: ComponentType }).component;

const fill = () => {
  fireEvent.change(screen.getByLabelText("E-mail"), { target: { value: "dono@loja.com" } });
  fireEvent.change(screen.getByLabelText("Senha"), { target: { value: "senha-qualquer" } });
};

describe("login do painel com desafio anti-robô", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    signInWithPassword.mockResolvedValue({ data: { user: null }, error: { message: "Invalid login credentials" } });
  });

  it("Entrar fica bloqueado até passar no desafio", () => {
    render(<LoginPage />);
    fill();
    expect(screen.getByRole("button", { name: "Entrar" })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Não sou um robô" }));
    expect(screen.getByRole("button", { name: "Entrar" })).toBeEnabled();
  });

  it("envia o token do desafio junto com a senha e pede um desafio novo depois", async () => {
    render(<LoginPage />);
    fill();
    fireEvent.click(screen.getByRole("button", { name: "Não sou um robô" }));
    fireEvent.click(screen.getByRole("button", { name: "Entrar" }));

    await waitFor(() =>
      expect(signInWithPassword).toHaveBeenCalledWith({
        email: "dono@loja.com",
        password: "senha-qualquer",
        options: { captchaToken: "token-0" },
      }),
    );
    expect(await screen.findByText(/Credenciais inválidas/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Não sou um robô" })).toHaveAttribute("data-reset", "1");
  });
});
