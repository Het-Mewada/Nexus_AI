import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Bell, Palette, Trash2, Lock, Fingerprint } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import { userApi, settingsApi } from "@/services/api";
import { getInitials, currencies } from "@/lib/utils";
import { toast } from "sonner";
import type { User as UserType, UserSettings } from "@/types";

const profileSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  currency: z.string().min(1, "Currency is required"),
  timezone: z.string().min(1, "Timezone is required"),
  initialBalance: z.coerce.number().optional(),
});

type ProfileForm = z.infer<typeof profileSchema>;

export default function SettingsPage() {
  const { user, refreshProfile, signOut } = useAuth();
  const { theme, setTheme } = useTheme();
  const queryClient = useQueryClient();
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const { resetPassword, registerPasskey } = useAuth();
  const [isRegisteringPasskey, setIsRegisteringPasskey] = useState(false);

  const { register, handleSubmit, setValue, formState: { errors } } = useForm<ProfileForm>({
    resolver: zodResolver(profileSchema),
    defaultValues: { name: user?.name || "", currency: user?.currency || "INR", timezone: user?.timezone || "UTC", initialBalance: user?.initialBalance || undefined },
  });

  const { data: settings } = useQuery({
    queryKey: ["settings"],
    queryFn: () => settingsApi.get(),
    select: (res) => res.data as UserSettings,
  });

  const updateProfile = useMutation({
    mutationFn: (data: Partial<UserType>) => userApi.updateProfile(data),
    onSuccess: (updatedUser) => { 
      toast.success("Profile updated"); 
      refreshProfile();
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      if (updatedUser?.data?.currency !== user?.currency) {
        queryClient.invalidateQueries(); // Force all pages to refetch converted amounts
      }
    },
    onError: () => toast.error("Failed to update profile"),
  });

  const updateSettings = useMutation({
    mutationFn: (data: Partial<UserSettings>) => settingsApi.update(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["settings"] }); toast.success("Settings saved"); },
    onError: () => toast.error("Failed to save settings"),
  });

  const handleDeleteAccount = async () => {
    if (deleteConfirm !== "DELETE") return;
    setIsDeleting(true);
    try {
      await userApi.deleteAccount();
      toast.success("Account deleted successfully");
      await signOut();
    } catch (err) {
      toast.error("Failed to delete account");
      setIsDeleting(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }
    setIsChangingPassword(true);
    const { error } = await resetPassword(newPassword);
    setIsChangingPassword(false);
    
    if (error) {
      toast.error(error);
    } else {
      toast.success("Password changed successfully! All other sessions have been logged out.");
      setNewPassword("");
    }
  };

  const handleRegisterPasskey = async () => {
    setIsRegisteringPasskey(true);
    const { error } = await registerPasskey();
    setIsRegisteringPasskey(false);

    if (error) {
      toast.error(error);
    } else {
      toast.success("Passkey registered successfully! You can now use it to log in.");
    }
  };

  const onProfileSubmit = (data: ProfileForm) => updateProfile.mutate(data);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground mt-1">Manage your account preferences and settings</p>
      </div>

      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList className="inline-flex flex-wrap h-auto justify-start">
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="preferences">Preferences</TabsTrigger>
          <TabsTrigger value="account">Account</TabsTrigger>
        </TabsList>

        {/* Profile Tab */}
        <TabsContent value="profile">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Profile Information</CardTitle>
              <CardDescription>Update your basic profile details.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col sm:flex-row items-center gap-6 mb-8">
                <Avatar className="h-24 w-24">
                  <AvatarImage src={user?.avatarUrl || undefined} />
                  <AvatarFallback className="text-2xl bg-primary/10 text-primary">{getInitials(user?.name || user?.email || "U")}</AvatarFallback>
                </Avatar>
                <div className="space-y-1 text-center sm:text-left">
                  <h3 className="font-semibold text-xl">{user?.name}</h3>
                  <p className="text-muted-foreground">{user?.email}</p>
                </div>
              </div>
              <form onSubmit={handleSubmit(onProfileSubmit)} className="space-y-4 max-w-xl">
                <div className="space-y-2">
                  <Label>Full Name</Label>
                  <Input {...register("name")} />
                  {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Currency</Label>
                    <Select defaultValue={user?.currency} onValueChange={(v) => setValue("currency", v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {currencies.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Timezone</Label>
                    <Select defaultValue={user?.timezone} onValueChange={(v) => setValue("timezone", v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="UTC">UTC</SelectItem>
                        <SelectItem value="Asia/Kolkata">Asia/Kolkata (IST)</SelectItem>
                        <SelectItem value="America/New_York">America/New_York (EST)</SelectItem>
                        <SelectItem value="Europe/London">Europe/London (GMT)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                {user?.initialBalance == null && (
                  <div className="space-y-2">
                    <Label>Initial Balance (Set Once)</Label>
                    <Input type="number" {...register("initialBalance")} placeholder="Your current bank balance" />
                    <p className="text-xs text-muted-foreground font-medium text-emerald-600 dark:text-emerald-400">Please enter amount in {user?.currency || 'INR'} ({currencies.find(c => c.value === (user?.currency || 'INR'))?.symbol || '₹'})</p>
                    <p className="text-xs text-muted-foreground">This synchronizes your dashboard balance. It can only be set once.</p>
                  </div>
                )}
                <Button type="submit" variant="gradient" disabled={updateProfile.isPending}>
                  {updateProfile.isPending ? "Saving..." : "Save Changes"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Preferences Tab */}
        <TabsContent value="preferences" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Palette className="h-5 w-5 text-primary" /> Appearance</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Theme</p>
                  <p className="text-sm text-muted-foreground">Select your preferred application theme</p>
                </div>
                <Select value={theme} onValueChange={(v: any) => setTheme(v)}>
                  <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="light">Light</SelectItem>
                    <SelectItem value="dark">Dark</SelectItem>
                    <SelectItem value="system">System Default</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Bell className="h-5 w-5 text-primary" /> Notifications</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Email Notifications</Label>
                  <p className="text-sm text-muted-foreground">Receive alerts via email</p>
                </div>
                <Switch
                  checked={settings?.emailNotifications}
                  onCheckedChange={(v) => updateSettings.mutate({ emailNotifications: v })}
                />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Weekly Report</Label>
                  <p className="text-sm text-muted-foreground">Get a weekly summary of your finances</p>
                </div>
                <Switch
                  checked={settings?.weeklyReport}
                  onCheckedChange={(v) => updateSettings.mutate({ weeklyReport: v })}
                />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Monthly Report</Label>
                  <p className="text-sm text-muted-foreground">Get a detailed monthly breakdown</p>
                </div>
                <Switch
                  checked={settings?.monthlyReport}
                  onCheckedChange={(v) => updateSettings.mutate({ monthlyReport: v })}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Account Tab */}
        <TabsContent value="account" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Lock className="h-5 w-5 text-primary" /> Change Password</CardTitle>
              <CardDescription>Update your password. This will automatically log out all other devices.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handlePasswordChange} className="space-y-4 max-w-sm">
                <div className="space-y-2">
                  <Label>New Password</Label>
                  <Input 
                    type="password" 
                    value={newPassword} 
                    onChange={(e) => setNewPassword(e.target.value)} 
                    placeholder="••••••••" 
                  />
                </div>
                <Button type="submit" disabled={isChangingPassword || !newPassword}>
                  {isChangingPassword ? "Updating..." : "Update Password"}
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Fingerprint className="h-5 w-5 text-primary" /> Passkeys (WebAuthn)</CardTitle>
              <CardDescription>Set up Face ID, Touch ID, or a security key for passwordless login.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 border rounded-lg bg-secondary/20">
                <div>
                  <h4 className="font-medium">Passwordless Login</h4>
                  <p className="text-sm text-muted-foreground">Sign in instantly using your device's biometric authentication.</p>
                </div>
                <Button onClick={handleRegisterPasskey} disabled={isRegisteringPasskey} variant="outline" className="w-full sm:w-auto">
                  {isRegisteringPasskey ? "Waiting for device..." : "Set up Face ID / Fingerprint"}
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="border-destructive/20 shadow-none">
            <CardHeader>
              <CardTitle className="text-destructive flex items-center gap-2"><Trash2 className="h-5 w-5" /> Danger Zone</CardTitle>
              <CardDescription>Permanent actions that cannot be undone.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 border border-destructive/20 bg-destructive/5 rounded-lg">
                <div>
                  <h4 className="font-semibold text-destructive">Delete Account</h4>
                  <p className="text-sm text-muted-foreground">Permanently delete your account and all financial data. This action is irreversible.</p>
                </div>
                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="destructive">Delete Account</Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle className="text-destructive">Delete Account</DialogTitle>
                      <DialogDescription>
                        Are you completely sure? This will permanently delete your account and remove all your financial data from our servers.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <p className="text-sm font-medium">Please type <span className="font-bold text-destructive">DELETE</span> to confirm.</p>
                      <Input value={deleteConfirm} onChange={(e) => setDeleteConfirm(e.target.value)} placeholder="DELETE" className="border-destructive focus-visible:ring-destructive" />
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setDeleteConfirm("")}>Cancel</Button>
                      <Button variant="destructive" onClick={handleDeleteAccount} disabled={deleteConfirm !== "DELETE" || isDeleting}>
                        {isDeleting ? "Deleting..." : "Permanently Delete Account"}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
