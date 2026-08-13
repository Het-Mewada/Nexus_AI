import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Users, Wallet, Shield, Copy, ArrowDownRight, ArrowUpRight, AlertTriangle, Receipt, History } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { familyApi } from "@/services/api";
import { formatCurrency, formatDate, currencies } from "@/lib/utils";
import { toast } from "sonner";
import type { SharedWallet } from "@/types";
import { BalanceWarningCallout } from "@/components/ui/balance-warning-callout";
import { useAuth } from "@/context/AuthContext";

function GroupLogsTab({ groupId, currencySymbol }: { groupId: string; currencySymbol: string }) {
  const { data: logsResponse, isLoading } = useQuery({
    queryKey: ["group-logs", groupId],
    queryFn: () => familyApi.getGroupLogs(groupId),
  });

  const logs = logsResponse?.data || [];

  const getInitials = (name: string | null | undefined) => name ? name.substring(0, 2).toUpperCase() : "U";

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-16 rounded-lg bg-muted/40 animate-pulse border border-border/40" />
        ))}
      </div>
    );
  }

  if (logs.length === 0) {
    return (
      <div className="text-center py-10 bg-muted/30 rounded-lg border border-dashed">
        <Receipt className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
        <p className="text-sm font-medium">No activity logs recorded yet</p>
        <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
          Deposits and withdrawals in shared wallets will automatically appear here and sync to personal expenses & incomes.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {logs.map((log) => {
        const isDeposit = log.type === "DEPOSIT";
        return (
          <div key={log.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 rounded-xl border bg-card/60 hover:bg-card transition-all gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <Avatar className="h-9 w-9 shrink-0 border">
                <AvatarImage src={log.user?.avatarUrl || undefined} />
                <AvatarFallback className="text-xs">{getInitials(log.user?.name || log.user?.email)}</AvatarFallback>
              </Avatar>

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold text-sm truncate">{log.user?.name || log.user?.email || "Member"}</span>
                  <span className="text-xs text-muted-foreground">
                    {isDeposit ? "deposited into" : "withdrew from"}
                  </span>
                  <Badge variant="secondary" className="text-xs font-medium">
                    {log.wallet?.name || "Shared Wallet"}
                  </Badge>
                </div>

                {log.description && (
                  <p className="text-xs text-muted-foreground mt-1 italic font-sans">"{log.description}"</p>
                )}

                <div className="flex items-center gap-2 mt-1.5">
                  <span className="text-muted-foreground/40">•</span>
                  <span className="text-[11px] text-muted-foreground">
                    {formatDate(log.createdAt)}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0 sm:text-right">
              <div className={`p-1.5 rounded-full ${isDeposit ? "bg-emerald-500/10 text-emerald-500" : "bg-rose-500/10 text-rose-500"}`}>
                {!isDeposit ? <ArrowDownRight className="h-4 w-4" /> : <ArrowUpRight className="h-4 w-4" />}
              </div>
              <span className={`text-base font-bold font-mono ${isDeposit ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}>
                {isDeposit ? "+" : "-"}{currencySymbol}{Number(log.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function FamilyPage() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const currencySymbol = currencies.find(c => c.value === user?.currency)?.symbol || "₹";

  const [createGroupOpen, setCreateGroupOpen] = useState(false);
  const [joinGroupOpen, setJoinGroupOpen] = useState(false);
  const [inviteCode, setInviteCode] = useState("");
  const [groupName, setGroupName] = useState("");

  const [walletOpen, setWalletOpen] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
  const [walletName, setWalletName] = useState("");

  const [transactionOpen, setTransactionOpen] = useState(false);
  const [selectedWallet, setSelectedWallet] = useState<SharedWallet | null>(null);
  const [txType, setTxType] = useState<"DEPOSIT" | "WITHDRAWAL">("DEPOSIT");
  const [txAmount, setTxAmount] = useState("");
  const [txDesc, setTxDesc] = useState("");

  const { data: groupsResponse, isLoading } = useQuery({
    queryKey: ["family"],
    queryFn: familyApi.getGroups,
  });

  const groups = groupsResponse?.data || [];

  const createGroupMutation = useMutation({
    mutationFn: (name: string) => familyApi.createGroup(name),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["family"] }); toast.success("Group created"); setCreateGroupOpen(false); setGroupName(""); },
    onError: () => toast.error("Failed to create group"),
  });

  const joinGroupMutation = useMutation({
    mutationFn: (code: string) => familyApi.joinGroup(code),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["family"] }); toast.success("Joined group successfully"); setJoinGroupOpen(false); setInviteCode(""); },
    onError: () => toast.error("Invalid invite code or already a member"),
  });

  const createWalletMutation = useMutation({
    mutationFn: ({ groupId, name }: { groupId: string; name: string }) => familyApi.createWallet(groupId, name),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["family"] }); toast.success("Wallet created"); setWalletOpen(false); setWalletName(""); },
  });

  const addTxMutation = useMutation({
    mutationFn: ({ walletId, data }: { walletId: string; data: any }) => familyApi.addTransaction(walletId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["family"] });
      queryClient.invalidateQueries({ queryKey: ["group-logs"] });
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
      queryClient.invalidateQueries({ queryKey: ["incomes"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["charts"] });
      queryClient.invalidateQueries({ queryKey: ["cashflow"] });
      toast.success("Transaction recorded & synced with personal finance!");
      setTransactionOpen(false);
      setTxAmount(""); setTxDesc("");
    },
    onError: (err: any) => toast.error(err.response?.data?.error?.message || err.message || "Failed to record transaction"),
  });

  const copyInviteCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast.success("Invite code copied to clipboard!");
  };

  const getInitials = (name: string | null) => name ? name.substring(0, 2).toUpperCase() : "U";

  if (isLoading) {
    return <div className="space-y-4"><Card className="h-40 animate-pulse bg-muted" /><Card className="h-64 animate-pulse bg-muted" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Family & Shared Wallets</h1>
          <p className="text-muted-foreground mt-1">Manage joint finances and collaborate with family</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setJoinGroupOpen(true)} variant="outline">
            Join Group
          </Button>
          <Button onClick={() => setCreateGroupOpen(true)} variant="gradient">
            <Plus className="h-4 w-4 mr-1" /> Create Group
          </Button>
        </div>
      </div>

      {groups.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Users className="h-16 w-16 text-muted-foreground/30 mb-4" />
            <h3 className="text-lg font-semibold">No family groups</h3>
            <p className="text-muted-foreground text-sm mt-1 mb-6 text-center max-w-sm">
              Create a family group to share wallets, track joint expenses, and plan budgets together.
            </p>
            <div className="flex gap-3">
              <Button onClick={() => setJoinGroupOpen(true)} variant="outline">Join via Code</Button>
              <Button onClick={() => setCreateGroupOpen(true)} variant="gradient">Create New Group</Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-8">
          {groups.map((group) => {
            const myRole = group.members.find(m => m.userId === user?.id)?.role;
            const isAdmin = myRole === 'OWNER' || myRole === 'ADMIN';

            return (
              <Card key={group.id} className="overflow-hidden border-t-4 border-t-primary">
                <CardHeader className="bg-muted/30 pb-4 border-b">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <CardTitle className="text-2xl flex items-center gap-2">
                        {group.name}
                        {myRole === 'OWNER' && <Shield className="h-4 w-4 text-emerald-500" />}
                      </CardTitle>
                      <CardDescription>Created {formatDate(group.createdAt)} • {group.members.length} members</CardDescription>
                    </div>

                    <div className="flex items-center gap-2 bg-background border px-3 py-1.5 rounded-md">
                      <span className="text-xs text-muted-foreground font-medium">Invite Code:</span>
                      <span className="font-mono text-sm font-bold tracking-wider">{group.inviteCode}</span>
                      <Button variant="ghost" size="icon" className="h-6 w-6 ml-1" onClick={() => copyInviteCode(group.inviteCode)}>
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="p-0">
                  <Tabs defaultValue="wallets" className="w-full">
                    <div className="px-6 border-b">
                      <TabsList className="bg-transparent h-12 p-0 space-x-6">
                        <TabsTrigger value="wallets" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-0 py-3">
                          Shared Wallets
                        </TabsTrigger>
                        <TabsTrigger value="members" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-0 py-3">
                          Members ({group.members.length})
                        </TabsTrigger>
                        <TabsTrigger value="logs" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-0 py-3">
                          Activity Logs
                        </TabsTrigger>
                        {isAdmin && (
                          <TabsTrigger value="settings" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-0 py-3">
                            Settings
                          </TabsTrigger>
                        )}
                      </TabsList>
                    </div>

                    <TabsContent value="wallets" className="p-6 m-0">
                      <div className="flex justify-between items-center mb-4">
                        <h3 className="font-medium">Group Wallets</h3>
                        {isAdmin && (
                          <Button size="sm" variant="outline" onClick={() => { setSelectedGroup(group.id); setWalletOpen(true); }}>
                            <Plus className="h-3.5 w-3.5 mr-1" /> New Wallet
                          </Button>
                        )}
                      </div>

                      {!group.wallets || group.wallets.length === 0 ? (
                        <div className="text-center py-8 bg-muted/30 rounded-lg border border-dashed">
                          <Wallet className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
                          <p className="text-sm text-muted-foreground">No shared wallets in this group yet.</p>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {group.wallets.map(wallet => (
                            <Card key={wallet.id} className="border shadow-sm">
                              <CardContent className="p-5">
                                <div className="flex justify-between items-start mb-4">
                                  <div className="flex items-center gap-3">
                                    <div className="p-2.5 bg-primary/10 text-primary rounded-full">
                                      <Wallet className="h-5 w-5" />
                                    </div>
                                    <div>
                                      <h4 className="font-semibold">{wallet.name}</h4>
                                      <p className="text-xs text-muted-foreground">Joint Balance</p>
                                    </div>
                                  </div>
                                  <div className="text-right">
                                    <h3 className="text-2xl font-bold">{formatCurrency(Number(wallet.balance))}</h3>
                                  </div>
                                </div>

                                <div className="flex gap-2 mt-4 pt-4 border-t">
                                  <Button size="sm" className="w-full bg-emerald-500 hover:bg-emerald-600 text-white"
                                    onClick={() => { setSelectedWallet(wallet); setTxType("DEPOSIT"); setTransactionOpen(true); }}>
                                    <ArrowDownRight className="h-4 w-4 mr-1" /> Add Funds
                                  </Button>
                                  <Button size="sm" className="w-full" variant="outline"
                                    onClick={() => { setSelectedWallet(wallet); setTxType("WITHDRAWAL"); setTransactionOpen(true); }}>
                                    <ArrowUpRight className="h-4 w-4 mr-1" /> Withdraw
                                  </Button>
                                </div>
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      )}
                    </TabsContent>

                    <TabsContent value="members" className="p-6 m-0">
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {group.members.map(member => (
                          <div key={member.id} className="flex items-center gap-3 p-3 rounded-lg border bg-card">
                            <Avatar className="h-10 w-10">
                              <AvatarImage src={member.user.avatarUrl || undefined} />
                              <AvatarFallback>{getInitials(member.user.name || member.user.email)}</AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">{member.user.name || "Unknown"}</p>
                              <p className="text-xs text-muted-foreground truncate">{member.user.email}</p>
                            </div>
                            <div className="shrink-0">
                              <span className={`text-[10px] uppercase font-bold px-2 py-1 rounded-full ${member.role === 'OWNER' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' :
                                member.role === 'ADMIN' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
                                  'bg-muted text-muted-foreground'
                                }`}>
                                {member.role}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </TabsContent>

                    <TabsContent value="logs" className="p-6 m-0">
                      <GroupLogsTab groupId={group.id} currencySymbol={currencySymbol} />
                    </TabsContent>

                    {isAdmin && (
                      <TabsContent value="settings" className="p-6 m-0 space-y-4">
                        <div className="rounded-lg border border-destructive/20 p-4 bg-destructive/5">
                          <h4 className="text-sm font-semibold text-destructive flex items-center gap-2 mb-2">
                            <AlertTriangle className="h-4 w-4" /> Danger Zone
                          </h4>
                          <p className="text-sm text-muted-foreground mb-4">Deleting this group will permanently remove all shared wallets and transaction history. This action cannot be undone.</p>
                          <Button variant="destructive" size="sm">Delete Group</Button>
                        </div>
                      </TabsContent>
                    )}
                  </Tabs>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Create Group Dialog */}
      <Dialog open={createGroupOpen} onOpenChange={setCreateGroupOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Family Group</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Group Name</Label>
              <Input placeholder="e.g. Smith Family, Vacation Budget" value={groupName} onChange={e => setGroupName(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateGroupOpen(false)}>Cancel</Button>
            <Button onClick={() => createGroupMutation.mutate(groupName)} disabled={!groupName.trim() || createGroupMutation.isPending}>
              Create Group
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Join Group Dialog */}
      <Dialog open={joinGroupOpen} onOpenChange={setJoinGroupOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Join Family Group</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Invite Code</Label>
              <Input placeholder="Enter 8-character code" value={inviteCode} onChange={e => setInviteCode(e.target.value)} className="font-mono uppercase" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setJoinGroupOpen(false)}>Cancel</Button>
            <Button onClick={() => joinGroupMutation.mutate(inviteCode.trim())} disabled={!inviteCode.trim() || joinGroupMutation.isPending}>
              Join Group
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Wallet Dialog */}
      <Dialog open={walletOpen} onOpenChange={setWalletOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Shared Wallet</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Wallet Name</Label>
              <Input placeholder="e.g. Groceries, Emergencies, House Fund" value={walletName} onChange={e => setWalletName(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setWalletOpen(false)}>Cancel</Button>
            <Button onClick={() => selectedGroup && createWalletMutation.mutate({ groupId: selectedGroup, name: walletName })} disabled={!walletName.trim() || createWalletMutation.isPending}>
              Create Wallet
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Transaction (Deposit / Withdraw) Dialog */}
      <Dialog open={transactionOpen} onOpenChange={setTransactionOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{txType === "DEPOSIT" ? "Add Funds to" : "Withdraw Funds from"} {selectedWallet?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Amount ({currencySymbol})</Label>
              <Input type="number" step="0.01" placeholder="0.00" value={txAmount} onChange={e => setTxAmount(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Description / Reason (Optional)</Label>
              <Input placeholder="e.g. Monthly contribution, Grocery expense" value={txDesc} onChange={e => setTxDesc(e.target.value)} />
            </div>
            <BalanceWarningCallout amount={txType === "DEPOSIT" ? txAmount : 0} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTransactionOpen(false)}>Cancel</Button>
            <Button
              className={txType === "DEPOSIT" ? "bg-emerald-500 hover:bg-emerald-600 text-white" : ""}
              onClick={() => selectedWallet && addTxMutation.mutate({ walletId: selectedWallet.id, data: { type: txType, amount: Number(txAmount), description: txDesc } })}
              disabled={!txAmount || Number(txAmount) <= 0 || addTxMutation.isPending}
            >
              Confirm {txType === "DEPOSIT" ? "Deposit" : "Withdrawal"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
