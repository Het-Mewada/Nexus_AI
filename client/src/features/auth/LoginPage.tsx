import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { motion } from "framer-motion";
import { Eye, EyeOff, Mail, Lock, Fingerprint } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

const loginSchema = z.object({
  email: z.string().email("Please enter a valid email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

type LoginForm = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const navigate = useNavigate();
  const { signIn, signInWithPasskey } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isPasskeyLoading, setIsPasskeyLoading] = useState(false);
  const [isWebAuthnSupported, setIsWebAuthnSupported] = useState(false);

  useEffect(() => {
    if (window.PublicKeyCredential) {
      setIsWebAuthnSupported(true);
    }
  }, []);

  const handlePasskeyLogin = async () => {
    setIsPasskeyLoading(true);
    const { error } = await signInWithPasskey();
    setIsPasskeyLoading(false);

    if (error) {
      // Don't show an error if they just canceled the prompt
      if (!error.toLowerCase().includes("cancel")) {
        toast.error(error);
      }
      return;
    }

    toast.success("Welcome back!");
    navigate("/dashboard");
  };

  const { register, handleSubmit, formState: { errors } } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginForm) => {
    setIsLoading(true);
    const { error } = await signIn(data.email, data.password);
    setIsLoading(false);

    if (error) {
      toast.error(error);
      return;
    }

    toast.success("Welcome back!");
    navigate("/dashboard");
  };

  return (
    <div className="min-h-screen flex">
      {/* Left panel with High-Tech Financial AI Image */}
      <div className="hidden lg:flex lg:flex-1 relative overflow-hidden bg-slate-950">
        <img
          src="/login-bg.png"
          alt="Nexus AI Platform"
          className="absolute inset-0 h-full w-full object-cover object-center opacity-75 transition-scale duration-700 hover:scale-105"
        />

        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/50 to-slate-950/20 backdrop-blur-[2px]" />

        <div className="relative z-10 flex h-full flex-col justify-between p-12 text-white">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-[12px] bg-primary flex items-center justify-center text-xl font-extrabold text-white shadow-lg shadow-primary/30">
              n
            </div>
            <span className="text-xl font-bold tracking-tight text-white">Nexus AI</span>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="space-y-4 max-w-lg"
          >
            <span className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3.5 py-1 text-xs font-semibold text-primary backdrop-blur-md">
              ✨ Next-Gen Financial Intelligence OS
            </span>
            <h1 className="text-4xl font-extrabold tracking-tight text-white leading-tight">
              Manage your entire life with perspective
            </h1>
            <p className="text-base text-slate-300 leading-relaxed">
              Intelligent tracking, autonomous CFO agents, deep analytics, and voice-assisted organization.
            </p>
          </motion.div>

          <div className="border-t border-white/10 pt-4 flex items-center justify-between text-[11px] uppercase tracking-[0.2em] text-slate-400">
            <span>Personal Finance OS</span>
            <span>v2.0 Connected</span>
          </div>
        </div>
      </div>


      {/* Right panel — form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-background">
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md space-y-8"
        >
          <div className="lg:hidden flex items-center gap-3 justify-center mb-4">
            <div className="h-10 w-10 rounded-[11px] bg-accent text-white flex items-center justify-center font-extrabold">
              n
            </div>
            <span className="text-2xl font-bold gradient-text">Nexus AI</span>
          </div>

          <div className="text-center lg:text-left">
            <h2 className="text-3xl font-bold tracking-tight">Welcome back</h2>
            <p className="text-muted-foreground mt-2">Sign in to your account to continue</p>
          </div>

          <div className="space-y-4">
            {isWebAuthnSupported && (
              <>
                <Button 
                  onClick={handlePasskeyLogin} 
                  variant="outline" 
                  size="lg" 
                  className="w-full flex items-center justify-center gap-2"
                  disabled={isPasskeyLoading || isLoading}
                >
                  {isPasskeyLoading ? (
                    <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }} className="h-5 w-5 rounded-full border-2 border-primary border-t-transparent" />
                  ) : (
                    <>
                      <Fingerprint className="h-5 w-5" />
                      Sign in with Face ID / Passkey
                    </>
                  )}
                </Button>
                
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-background px-2 text-muted-foreground">
                      Or continue with email
                    </span>
                  </div>
                </div>
              </>
            )}

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  className="pl-9"
                  {...register("email")}
                />
              </div>
              {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
                <Link to="/forgot-password" className="text-sm text-primary hover:underline">
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  className="pl-9 pr-10"
                  {...register("password")}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.password && <p className="text-sm text-destructive">{errors.password.message}</p>}
            </div>

            <Button type="submit" className="w-full" variant="gradient" size="lg" disabled={isLoading}>
              {isLoading ? (
                <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }} className="h-5 w-5 rounded-full border-2 border-white border-t-transparent" />
              ) : (
                "Sign in"
              )}
            </Button>
          </form>
          </div>

          <p className="text-center text-sm text-muted-foreground">
            Don't have an account?{" "}
            <Link to="/signup" className="text-primary font-medium hover:underline">
              Sign up
            </Link>
          </p>
        </motion.div>
      </div>
    </div>
  );
}
