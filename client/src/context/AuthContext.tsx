import { createContext, useContext, useEffect, useState, useCallback, useRef, type ReactNode } from "react";
import { supabase } from "@/lib/supabase";
import { api } from "@/lib/api-client";
import { toast } from "sonner";
import type { User as AppUser } from "@/types";
import type { User as SupabaseUser, Session } from "@supabase/supabase-js";

interface AuthContextType {
  user: AppUser | null;
  supabaseUser: SupabaseUser | null;
  session: Session | null;
  isLoading: boolean;
  signUp: (email: string, password: string, name: string) => Promise<{ error: string | null }>;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  forgotPassword: (email: string) => Promise<{ error: string | null }>;
  resetPassword: (password: string) => Promise<{ error: string | null }>;
  refreshProfile: () => Promise<void>;
  registerPasskey: () => Promise<{ error: string | null }>;
  signInWithPasskey: () => Promise<{ error: string | null }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [supabaseUser, setSupabaseUser] = useState<SupabaseUser | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const syncPromiseRef = useRef<Promise<void> | null>(null);

  useEffect(() => {
    if (user?.currency) {
      localStorage.setItem("user_currency", user.currency);
    } else if (user === null) {
      localStorage.removeItem("user_currency");
    }
  }, [user?.currency, user]);

  const syncUser = useCallback(async (currentSession: Session) => {
    if (syncPromiseRef.current) {
      return syncPromiseRef.current;
    }

    const promise = (async () => {
      try {
        await api.post("/auth/sync", { isNewUser: false }, {
          headers: { Authorization: `Bearer ${currentSession.access_token}` },
        });
        const { data: res } = await api.get("/users/me", {
          headers: { Authorization: `Bearer ${currentSession.access_token}` },
        });
        if (res.success) {
          setUser(res.data);
        }
      } catch (err: any) {
        if (err.response?.status === 403) {
          toast.error("Your account has been suspended by an administrator.");
          await supabase.auth.signOut();
          setSession(null);
          setSupabaseUser(null);
          setUser(null);
        }
      } finally {
        syncPromiseRef.current = null;
      }
    })();

    syncPromiseRef.current = promise;
    return promise;
  }, []);

  const refreshProfile = useCallback(async () => {
    if (!session) return;
    try {
      const { data: res } = await api.get("/users/me");
      if (res.success) {
        setUser(res.data);
      }
    } catch {
      // Silently fail
    }
  }, [session]);

  useEffect(() => {
    const initAuth = async () => {
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      if (currentSession) {
        setSession(currentSession);
        setSupabaseUser(currentSession.user);
        await syncUser(currentSession);
      }
      setIsLoading(false);
    };

    initAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
      setSession(newSession);
      setSupabaseUser(newSession?.user ?? null);
      if (newSession) {
        if (_event === "SIGNED_IN" || _event === "INITIAL_SESSION") {
          await syncUser(newSession);
        }
      } else {
        setUser(null);
      }
    });

    return () => subscription.unsubscribe();
  }, [syncUser]);

  const signUp = async (email: string, password: string, name: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: name },
        emailRedirectTo: `${window.location.origin}/verify-email`,
      },
    });
    if (error) return { error: error.message };
    return { error: null };
  };

  const signIn = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) return { error: error.message };

      if (data.session) {
        try {
          await syncUser(data.session);
        } catch (err: any) {
          if (err.response?.status === 403) {
            try { await supabase.auth.signOut(); } catch (e) { }
            setSession(null);
            setSupabaseUser(null);
            setUser(null);
            return { error: "Your account has been suspended by an administrator." };
          }
        }
      }

      return { error: null };
    } catch (err: any) {
      return { error: err.message || "An unexpected error occurred" };
    }
  };


  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSupabaseUser(null);
    setSession(null);
  };

  const forgotPassword = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) return { error: error.message };
    return { error: null };
  };

  const resetPassword = async (password: string) => {
    const { error } = await supabase.auth.updateUser({ password });
    if (error) return { error: error.message };
    return { error: null };
  };

  const registerPasskey = async () => {
    try {
      const { error } = await supabase.auth.registerPasskey();
      if (error) return { error: error.message };
      return { error: null };
    } catch (e: any) {
      return { error: e.message || "Failed to register passkey" };
    }
  };

  const signInWithPasskey = async () => {
    try {
      const { error } = await supabase.auth.signInWithPasskey();
      if (error) return { error: error.message };
      return { error: null };
    } catch (e: any) {
      return { error: e.message || "Failed to sign in with passkey" };
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        supabaseUser,
        session,
        isLoading,
        signUp,
        signIn,
        signOut,
        forgotPassword,
        resetPassword,
        refreshProfile,
        registerPasskey,
        signInWithPasskey,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
