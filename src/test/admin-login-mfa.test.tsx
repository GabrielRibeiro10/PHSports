import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ComponentType } from "react";

const navigate = vi.fn();
const auth = { session: null as unknown, isAdmin: false, mfaVerified: false, loading: false, signOut: vi.fn() };
const mfa = {
  listFactors: vi.fn(),
  enroll: vi.fn(),
  unenroll: vi.fn(),
  challengeAndVerify: vi.fn(),
};

vi.mock("@tanstack/react-router", () => ({
  createFileRoute: () => (opts: unknown) => opts,
  useNavigate: () => navigate,
}));
vi.mock("@/lib/auth", () => ({ useAuth: () => auth }));
vi.mock("@/lib/audit", () => ({ writeAudit: vi.fn() }));
vi.mock("sonner", () => ({ toast: { success: vi.fn() } }));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: { auth: { mfa, signOut: vi.fn(), signInWithPassword: vi.fn() }, from: vi.fn() },
}));

const { Route } = await import("@/routes/admin/login");
const LoginPage = (Route as unknown as { component: ComponentType }).component;

const adminWithPasswordOnly = () => {
  auth.session = { user: { id: "u1", email: "dono@loja.com" }, access_token: "x.y.z" };
  auth.isAdmin = true;
  auth.mfaVerified = false;
};

describe("login do painel com verificação em duas etapas", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    auth.session = null;
    auth.isAdmin = false;
    auth.mfaVerified = false;
    mfa.unenroll.mockResolvedValue({ data: {}, error: null });
    mfa.enroll.mockResolvedValue({
      data: { id: "fator-novo", totp: { qr_code: "data:image/svg+xml;utf-8,<svg/>", secret: "SEGREDO123" } },
      error: null,
    });
    mfa.challengeAndVerify.mockResolvedValue({ data: {}, error: null });
  });

  it("sem sessão mostra só e-mail e senha", () => {
    render(<LoginPage />);
    expect(screen.getByLabelText("E-mail")).toBeInTheDocument();
    expect(screen.getByLabelText("Senha")).toBeInTheDocument();
    expect(mfa.listFactors).not.toHaveBeenCalled();
  });

  it("primeiro acesso: senha certa mostra o QR code e ativa com o código digitado", async () => {
    adminWithPasswordOnly();
    mfa.listFactors.mockResolvedValue({ data: { totp: [], all: [{ id: "velho", factor_type: "totp", status: "unverified" }] }, error: null });
    render(<LoginPage />);

    expect(await screen.findByAltText(/QR code/)).toHaveAttribute("src", "data:image/svg+xml;utf-8,<svg/>");
    expect(screen.getByText("SEGREDO123")).toBeInTheDocument();
    expect(mfa.unenroll).toHaveBeenCalledWith({ factorId: "velho" });
    expect(mfa.enroll).toHaveBeenCalledTimes(1);
    expect(navigate).not.toHaveBeenCalled();

    fireEvent.change(screen.getByLabelText("Código de 6 números"), { target: { value: "123 456" } });
    fireEvent.click(screen.getByRole("button", { name: "Ativar e entrar" }));
    await waitFor(() => expect(mfa.challengeAndVerify).toHaveBeenCalledWith({ factorId: "fator-novo", code: "123456" }));
  });

  it("já cadastrado: pede o código, sem gerar QR novo", async () => {
    adminWithPasswordOnly();
    mfa.listFactors.mockResolvedValue({ data: { totp: [{ id: "fator-ok" }], all: [{ id: "fator-ok", factor_type: "totp", status: "verified" }] }, error: null });
    render(<LoginPage />);

    expect(await screen.findByText("Verificação em duas etapas")).toBeInTheDocument();
    expect(mfa.enroll).not.toHaveBeenCalled();
    expect(screen.queryByAltText(/QR code/)).not.toBeInTheDocument();
  });

  it("código errado não entra e avisa", async () => {
    adminWithPasswordOnly();
    mfa.listFactors.mockResolvedValue({ data: { totp: [{ id: "fator-ok" }], all: [] }, error: null });
    mfa.challengeAndVerify.mockResolvedValue({ data: null, error: { message: "Invalid TOTP code entered" } });
    render(<LoginPage />);

    fireEvent.change(await screen.findByLabelText("Código de 6 números"), { target: { value: "000000" } });
    fireEvent.click(screen.getByRole("button", { name: "Entrar" }));
    expect(await screen.findByText(/Código inválido/)).toBeInTheDocument();
    expect(navigate).not.toHaveBeenCalled();
  });

  it("só vai para o painel com a sessão verificada pelo código", () => {
    adminWithPasswordOnly();
    auth.mfaVerified = true;
    render(<LoginPage />);
    expect(navigate).toHaveBeenCalledWith({ to: "/admin" });
    expect(mfa.listFactors).not.toHaveBeenCalled();
  });
});
