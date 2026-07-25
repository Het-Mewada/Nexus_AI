import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from "react";
import { supabase } from "@/lib/supabase";
import { api } from "@/lib/api-client";
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
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [supabaseUser, setSupabaseUser] = useState<SupabaseUser | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const syncUser = useCallback(async (currentSession: Session) => {
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
    } catch {
      // User will be created on first sync
    }
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
        if (_event === "SIGNED_IN") {
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
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { error: error.message };
    return { error: null };
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
