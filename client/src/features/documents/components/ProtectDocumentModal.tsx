import { useState } from "react";
import { Lock, Fingerprint, Key, ShieldCheck, AlertCircle } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { documentApi } from "@/services/api";
import { isWebAuthnSupported, createPasskeyCredential } from "@/lib/webauthn";
import { toast } from "sonner";
import type { Document } from "@/types";

interface ProtectDocumentModalProps {
  document: Document | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function ProtectDocumentModal({ document, isOpen, onClose, onSuccess }: ProtectDocumentModalProps) {
  const [method, setMethod] = useState<"LOGIN_PASSWORD" | "CUSTOM_PASSWORD">("LOGIN_PASSWORD");
  const [customPassword, setCustomPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [enableBiometrics, setEnableBiometrics] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const resetForm = () => {
    setMethod("LOGIN_PASSWORD");
    setCustomPassword("");
    setConfirmPassword("");
    setEnableBiometrics(false);
    setIsLoading(false);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!document) return;

    if (method === "CUSTOM_PASSWORD") {
      if (!customPassword || customPassword.length < 6) {
        toast.error("Custom password must be at least 6 characters");
        return;
      }
      if (customPassword !== confirmPassword) {
        toast.error("Passwords do not match");
        return;
      }
    }

    setIsLoading(true);
    try {
      // If biometrics selected, check or register WebAuthn passkey
      if (enableBiometrics && isWebAuthnSupported()) {
        try {
          const challengeRes = await documentApi.getWebAuthnRegisterChallenge();
          if (challengeRes.success && challengeRes.data) {
            const passkeyData = await createPasskeyCredential(challengeRes.data);
            await documentApi.verifyWebAuthnRegister(passkeyData);
            toast.success("Biometric passkey registered successfully");
          }
        } catch (bioError: any) {
          toast.error(bioError.message || "Failed to setup biometrics. You can still unlock with password.");
        }
      }

      const res = await documentApi.protectDocument(document.id, {
        method,
        customPassword: method === "CUSTOM_PASSWORD" ? customPassword : undefined,
        enableBiometrics,
      });

      if (res.success) {
        toast.success("Document protected with AES-256-GCM encryption");
        onSuccess();
        handleClose();
      } else {
        toast.error((res as any).error?.message || "Failed to protect document");
      }
    } catch (error: any) {
      toast.error(error.response?.data?.error?.message || error.message || "Failed to protect document");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) handleClose(); }}>
      <DialogContent className="sm:max-w-[480px] rounded-[18px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl font-bold">
            <Lock className="h-5 w-5 text-primary" /> Protect Document
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground mt-1">
            Encrypt <span className="font-semibold text-foreground">{document?.title}</span> server-side with AES-256-GCM. Unencrypted data will never be sent to the browser.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5 pt-2">
          {/* Unlock Method */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Unlock method</Label>
            <Select value={method} onValueChange={(val) => setMethod(val as any)}>
              <SelectTrigger className="h-10 rounded-[10px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="LOGIN_PASSWORD">
                  <div className="flex items-center gap-2">
                    <Key className="h-4 w-4 text-primary" />
                    <span>Login Password</span>
                  </div>
                </SelectItem>
                <SelectItem value="CUSTOM_PASSWORD">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-emerald-500" />
                    <span>Custom Password</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
            <p className="text-[11px] text-muted-foreground">
              {method === "LOGIN_PASSWORD"
                ? "Uses your account password to unlock this document."
                : "Creates a separate password specifically for this document."}
            </p>
          </div>

          {/* Custom Password Fields */}
          {method === "CUSTOM_PASSWORD" && (
            <div className="space-y-3 p-3.5 rounded-[12px] bg-muted/40 border border-border/60">
              <div className="space-y-1.5">
                <Label className="text-xs">New Password</Label>
                <Input
                  type="password"
                  placeholder="••••••••••••"
                  value={customPassword}
                  onChange={(e) => setCustomPassword(e.target.value)}
                  className="h-9 rounded-[8px]"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Confirm Password</Label>
                <Input
                  type="password"
                  placeholder="••••••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="h-9 rounded-[8px]"
                  required
                />
              </div>
            </div>
          )}

          {/* Biometric Unlock Toggle */}
          <div className="flex items-start gap-3 p-3.5 rounded-[12px] border border-border/80 bg-card hover:bg-muted/30 transition-colors">
            <Checkbox
              id="biometrics-check"
              checked={enableBiometrics}
              onCheckedChange={(checked: boolean) => setEnableBiometrics(!!checked)}
              className="mt-0.5"
            />
            <div className="grid gap-1 leading-none">
              <label htmlFor="biometrics-check" className="text-xs font-semibold flex items-center gap-1.5 cursor-pointer">
                <Fingerprint className="h-4 w-4 text-indigo-500" />
                Unlock with Biometrics
              </label>
              <p className="text-[11px] text-muted-foreground">
                Windows Hello / Touch ID / Face ID / Android biometrics as an alternative unlock method.
              </p>
              {!isWebAuthnSupported() && enableBiometrics && (
                <p className="text-[10px] text-amber-500 flex items-center gap-1 mt-1">
                  <AlertCircle className="h-3 w-3" /> Hardware biometrics not detected on this device.
                </p>
              )}
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0 pt-2">
            <Button type="button" variant="outline" onClick={handleClose} disabled={isLoading}>
              Cancel
            </Button>
            <Button type="submit" variant="gradient" disabled={isLoading}>
              {isLoading ? "Encrypting & Protecting..." : "Protect Document"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
