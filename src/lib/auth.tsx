import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

type AuthCtx = {
  session: Session | null;
  isAdmin: boolean;
  /** Sessão passou pela verificação em duas etapas (senha + código do aplicativo). */
  mfaVerified: boolean;
  loading: boolean;
  signOut: () => Promise<void>;
};

const Ctx = createContext<AuthCtx | null>(null);

// O nível de verificação vem no próprio token ("aal2" = senha + código); ler daqui evita
// chamar o supabase.auth de dentro do onAuthStateChange.
function sessionAal(session: Session | null): string | null {
  try {
    const payload = session?.access_token.split(".")[1];
    if (!payload) return null;
    const claims = JSON.parse(atob(payload.replace(/-/g, "+").replace(/_/g, "/")));
    return typeof claims.aal === "string" ? claims.aal : null;
  } catch {
    return null;
  }
}

async function checkIsAdmin(userId: string | undefined): Promise<boolean> {
  if (!userId) return false;
  const { data } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();
  return !!data;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    supabase.auth.getSession().then(async ({ data }) => {
      if (!active) return;
      setSession(data.session);
      const admin = await checkIsAdmin(data.session?.user.id);
      if (active) {
        setIsAdmin(admin);
        setLoading(false);
      }
    });

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      checkIsAdmin(newSession?.user.id).then((admin) => {
        if (active) setIsAdmin(admin);
      });
    });

    return () => {
      active = false;
      subscription.subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const mfaVerified = sessionAal(session) === "aal2";

  return <Ctx.Provider value={{ session, isAdmin, mfaVerified, loading, signOut }}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAuth outside provider");
  return ctx;
}
