import { useState, useEffect } from "react";
import { Lock, Fingerprint, Key, FileText, Image as ImageIcon, File, Download, Loader2, ShieldCheck, Eye } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { documentApi } from "@/services/api";
import { supabase } from "@/lib/supabase";
import { isWebAuthnSupported, getPasskeyAssertion } from "@/lib/webauthn";

import { toast } from "sonner";
import type { Document } from "@/types";

interface UnlockDocumentModalProps {
  document: Document | null;
  mode: "VIEW" | "DOWNLOAD";
  isOpen: boolean;
  onClose: () => void;
}

export function UnlockDocumentModal({ document: doc, mode, isOpen, onClose }: UnlockDocumentModalProps) {
  const [password, setPassword] = useState("");
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [streamUrl, setStreamUrl] = useState<string | null>(null);
  const [isBlobLoading, setIsBlobLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      // Memory cleanup: revoke Object URL immediately on close
      if (streamUrl && streamUrl.startsWith("blob:")) {
        URL.revokeObjectURL(streamUrl);
      }
      setPassword("");
      setIsAuthenticating(false);
      setIsUnlocked(false);
      setStreamUrl(null);
      setIsBlobLoading(false);
    }
  }, [isOpen]);

  const handleClose = () => {
    onClose();
  };

  const executeUnlockSuccess = async (unlockToken: string) => {
    setIsUnlocked(true);
    setIsBlobLoading(true);

    try {
      const url = documentApi.getStreamUrl(doc!.id, unlockToken);
      const { data: { session } } = await supabase.auth.getSession();
      const headers: Record<string, string> = {};
      if (session?.access_token) {
        headers["Authorization"] = `Bearer ${session.access_token}`;
      }

      const response = await fetch(url, { headers });
      if (!response.ok) {
        const errorJson = await response.json().catch(() => ({}));
        throw new Error(errorJson?.error?.message || "Failed to stream decrypted document");
      }

      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      setStreamUrl(blobUrl);

      if (mode === "DOWNLOAD") {
        const a = window.document.createElement("a");
        a.href = blobUrl;
        const ext = doc?.name.split(".").pop()?.toLowerCase() || "";
        a.download = ext ? `${doc?.title}.${ext}` : doc?.title || "document";
        window.document.body.appendChild(a);
        a.click();
        window.document.body.removeChild(a);
        toast.success("Decrypted document downloaded");
        handleClose();
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to load decrypted document stream");
      setIsUnlocked(false);
    } finally {
      setIsBlobLoading(false);
    }
  };


  const handlePasswordUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!doc || !password) return;

    setIsAuthenticating(true);
    try {
      const res = await documentApi.unlockDocument(doc.id, {
        type: "PASSWORD",
        password,
      });

      if (res.success && res.data?.unlockToken) {
        toast.success("Document unlocked successfully");
        await executeUnlockSuccess(res.data.unlockToken);
      } else {
        toast.error("Incorrect password. Access denied.");
      }
    } catch (error: any) {
      toast.error(error.response?.data?.error?.message || "Incorrect password. Access denied.");
    } finally {
      setIsAuthenticating(false);
    }
  };

  const handleBiometricUnlock = async () => {
    if (!doc) return;

    setIsAuthenticating(true);
    try {
      const challengeRes = await documentApi.getWebAuthnAuthChallenge();
      if (!challengeRes.success || !challengeRes.data) {
        throw new Error("Failed to generate biometric authentication challenge");
      }

      const assertion = await getPasskeyAssertion(challengeRes.data);
      const res = await documentApi.unlockDocument(doc.id, {
        type: "BIOMETRIC",
        ...assertion,
      });

      if (res.success && res.data?.unlockToken) {
        toast.success("Biometrics verified. Document unlocked.");
        await executeUnlockSuccess(res.data.unlockToken);
      } else {
        toast.error("Biometric authentication failed");
      }
    } catch (error: any) {
      toast.error(error.message || "Biometric authentication failed");
    } finally {
      setIsAuthenticating(false);
    }
  };

  const getFileExt = (fileName?: string) => fileName?.split(".").pop()?.toLowerCase() || "";

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) handleClose(); }}>
      <DialogContent className={isUnlocked && mode === "VIEW" ? "max-w-4xl w-full h-[85vh] flex flex-col rounded-[18px]" : "sm:max-w-[440px] rounded-[18px]"}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl font-bold">
            {isUnlocked ? <ShieldCheck className="h-5 w-5 text-emerald-500" /> : <Lock className="h-5 w-5 text-primary" />}
            {isUnlocked ? doc?.title : "Protected Document"}
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground mt-1">
            {isUnlocked
              ? `${doc?.name} • Decrypted AES-256-GCM Stream`
              : "Authentication required. Enter your password or use biometrics to unlock."}
          </DialogDescription>
        </DialogHeader>

        {/* View Mode (Unlocked) */}
        {isUnlocked && mode === "VIEW" ? (
          <div className="flex-1 min-h-0 bg-muted/30 rounded-[12px] overflow-hidden relative flex items-center justify-center p-2">
            {isBlobLoading ? (
              <div className="flex flex-col items-center justify-center space-y-2">
                <Loader2 className="h-8 w-8 text-primary animate-spin" />
                <p className="text-xs text-muted-foreground">Decrypting AES-256-GCM payload...</p>
              </div>
            ) : streamUrl ? (
              ["jpg", "jpeg", "png", "gif"].includes(getFileExt(doc?.name)) ? (
                <img src={streamUrl} alt={doc?.title} className="max-w-full max-h-full object-contain rounded-[8px]" />
              ) : getFileExt(doc?.name) === "pdf" ? (
                <iframe src={`${streamUrl}#view=FitH`} className="w-full h-full border-0 rounded-[8px]" title={doc?.title} />
              ) : (
                <div className="text-center p-8">
                  <File className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground text-sm">Preview not available for this format.</p>
                </div>
              )
            ) : (
              <p className="text-xs text-destructive">Stream unavailable</p>
            )}
          </div>
        ) : (
          /* Authentication Screen (Locked) */
          <div className="space-y-5 pt-2">
            {/* Biometric Option */}
            {doc?.enableBiometrics && isWebAuthnSupported() && (
              <div className="p-4 rounded-[14px] border border-indigo-500/30 bg-indigo-500/5 flex flex-col items-center text-center space-y-3">
                <div className="h-10 w-10 rounded-full bg-indigo-500/10 flex items-center justify-center">
                  <Fingerprint className="h-6 w-6 text-indigo-500" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold">Biometric Unlock</h4>
                  <p className="text-[11px] text-muted-foreground mt-0.5">Use Touch ID, Face ID, or Windows Hello</p>
                </div>
                <Button
                  type="button"
                  onClick={handleBiometricUnlock}
                  disabled={isAuthenticating}
                  variant="outline"
                  className="w-full h-9 rounded-[10px] border-indigo-500/30 text-indigo-500 hover:bg-indigo-500/10 gap-2 font-medium text-xs"
                >
                  {isAuthenticating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Fingerprint className="h-4 w-4" />}
                  Authenticate with Biometrics
                </Button>
              </div>
            )}

            {doc?.enableBiometrics && isWebAuthnSupported() && (
              <div className="relative flex items-center justify-center">
                <span className="bg-card px-3 text-[10px] uppercase font-bold text-muted-foreground tracking-widest z-10">Or use password</span>
                <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-border/60" /></div>
              </div>
            )}

            {/* Password Form */}
            <form onSubmit={handlePasswordUnlock} className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">
                  {doc?.protectionMethod === "CUSTOM_PASSWORD" ? "Document Password" : "Login Password"}
                </Label>
                <Input
                  type="password"
                  placeholder="••••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-10 rounded-[10px]"
                  autoFocus
                  required
                />
              </div>

              <DialogFooter className="gap-2 sm:gap-0 pt-2">
                <Button type="button" variant="outline" onClick={handleClose} disabled={isAuthenticating}>
                  Cancel
                </Button>
                <Button type="submit" variant="gradient" disabled={isAuthenticating || !password}>
                  {isAuthenticating ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Decrypting...
                    </>
                  ) : (
                    <>
                      <Key className="h-4 w-4 mr-2" /> Unlock & Access
                    </>
                  )}
                </Button>
              </DialogFooter>
            </form>
          </div>
        )}

        {isUnlocked && mode === "VIEW" && (
          <DialogFooter className="mt-2 sm:justify-end">
            <Button type="button" variant="outline" onClick={handleClose}>
              Close
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
