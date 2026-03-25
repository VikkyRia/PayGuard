import { useState, useEffect } from "react";
import { walletService } from "@/services/wallet.service";
import { useAuth } from "@/contexts/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Wallet, ArrowDownToLine, ArrowUpFromLine, Building2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

const WalletCard = () => {
 const { user } = useAuth();
  const [data, setData] = useState<any>({ wallet: null, transactions: [], bankAccounts: [] });
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  
  // Form States
  const [showAddBank, setShowAddBank] = useState(false);
  const [showWithdraw, setShowWithdraw] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [selectedBank, setSelectedBank] = useState("");
  const [bankForm, setBankForm] = useState({ bank_name: "", account_number: "", account_name: "" });

  const refreshData = async () => {
    if (!user) return;
    try {
      const res = await walletService.getWalletDashboard(user.id);
      setData(res);
    } catch (err) {
      toast.error("Failed to sync wallet data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshData();
    if (!user) return;

    const channel = supabase
      .channel("wallet-updates")
      .on("postgres_changes", { event: "*", schema: "public", table: "wallets", filter: `user_id=eq.${user.id}` }, refreshData)
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user]);

  const handleAddBank = async (e: React.SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user) return;
    setSubmitting(true);
    try {
      await walletService.addBankAccount(user.id, bankForm, data.bankAccounts.length === 0);
      toast.success("Bank account added");
      setBankForm({ bank_name: "", account_number: "", account_name: "" });
      setShowAddBank(false);
      refreshData();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteBank = async (id: string) => {
    try {
      await walletService.deleteBankAccount(id);
      toast.success("Bank account removed");
      refreshData();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleWithdraw = async (e: React.SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    const amount = Number(withdrawAmount);
    if (!user || !data.wallet || amount <= 0 || amount > Number(data.wallet.balance)) {
      toast.error("Invalid amount");
      return;
    }
    
    setSubmitting(true);
    try {
      await walletService.requestWithdrawal(user.id, data.wallet.id, selectedBank, amount);
      toast.success("Withdrawal request submitted!");
      setWithdrawAmount("");
      setShowWithdraw(false);
      refreshData();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="h-64 animate-pulse bg-muted rounded-2xl" />;

  return (
    <div className="bg-card rounded-2xl border border-border overflow-hidden">
      {/* Wallet Balance */}
      <div className="bg-linear-to-br from-primary/10 via-primary/5 to-transparent p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center">
              <Wallet className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Wallet Balance</p>
              <p className="font-display text-3xl font-extrabold text-foreground">
                ₦{Number(data.wallet?.balance || 0).toLocaleString()}
              </p>
            </div>
          </div>
          <Dialog open={showWithdraw} onOpenChange={setShowWithdraw}>
            <DialogTrigger asChild>
              <Button size="sm" disabled={!data.wallet || Number(data.wallet?.balance || 0) <= 0}>
                <ArrowUpFromLine className="h-4 w-4 mr-1" /> Withdraw
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Withdraw Funds</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleWithdraw} className="space-y-4">
                <div>
                  <Label>Amount (₦)</Label>
                  <Input
                    type="number"
                    min="100"
                    max={data.wallet?.balance || 0}
                    value={withdrawAmount}
                    onChange={(e) => setWithdrawAmount(e.target.value)}
                    placeholder="Enter amount"
                    required
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Available: ₦{Number(data.wallet?.balance || 0).toLocaleString()}
                  </p>
                </div>
                <div>
                  <Label>Bank Account</Label>
                  {data.bankAccounts.length === 0 ? (
                    <p className="text-sm text-muted-foreground mt-1">
                      No bank accounts added.{" "}
                      <button type="button" className="text-primary underline" onClick={() => { setShowWithdraw(false); setShowAddBank(true); }}>
                        Add one first
                      </button>
                    </p>
                  ) : (
                    <select
                      className="w-full mt-1 rounded-md border border-border bg-background px-3 py-2 text-sm"
                      value={selectedBank}
                      onChange={(e) => setSelectedBank(e.target.value)}
                      required
                    >
                      <option value="">Select account</option>
                      {data.bankAccounts.map((b:any) => (
                        <option key={b.id} value={b.id}>
                          {b.bank_name} - {b.account_number} ({b.account_name})
                        </option>
                      ))}
                    </select>
                  )}
                </div>
                <Button type="submit" className="w-full" disabled={submitting || data.bankAccounts.length === 0}>
                  {submitting ? "Processing..." : "Request Withdrawal"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-muted-foreground">Total Earned</p>
            <p className="font-display font-bold text-foreground">₦{Number(data.wallet?.total_earned || 0).toLocaleString()}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Total Withdrawn</p>
            <p className="font-display font-bold text-foreground">₦{Number(data.wallet?.total_withdrawn || 0).toLocaleString()}</p>
          </div>
        </div>
      </div>

      {/* Bank Accounts */}
      <div className="p-4 border-t border-border">
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium flex items-center gap-1">
            <Building2 className="h-3 w-3" /> Bank Accounts
          </p>
          <Dialog open={showAddBank} onOpenChange={setShowAddBank}>
            <DialogTrigger asChild>
              <Button variant="ghost" size="sm" className="h-6 text-xs">
                <Plus className="h-3 w-3 mr-1" /> Add
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Bank Account</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleAddBank} className="space-y-4">
                <div>
                  <Label>Bank Name</Label>
                  <Input value={bankForm.bank_name} onChange={(e) => setBankForm({ ...bankForm, bank_name: e.target.value })} placeholder="e.g. First Bank" required />
                </div>
                <div>
                  <Label>Account Number</Label>
                  <Input value={bankForm.account_number} onChange={(e) => setBankForm({ ...bankForm, account_number: e.target.value })} placeholder="0123456789" maxLength={10} required />
                </div>
                <div>
                  <Label>Account Name</Label>
                  <Input value={bankForm.account_name} onChange={(e) => setBankForm({ ...bankForm, account_name: e.target.value })} placeholder="Chima Victoria" required />
                </div>
                <Button type="submit" className="w-full" disabled={submitting}>
                  {submitting ? "Adding..." : "Add Bank Account"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {data.bankAccounts.length === 0 ? (
          <p className="text-xs text-muted-foreground">No bank accounts linked yet.</p>
        ) : (
          <div className="space-y-2">
            {data.bankAccounts.map((b: any) => (
              <div key={b.id} className="flex items-center justify-between bg-muted/50 rounded-lg px-3 py-2">
                <div>
                  <p className="text-sm font-medium text-foreground">{b.bank_name}</p>
                  <p className="text-xs text-muted-foreground">{b.account_number} • {b.account_name}</p>
                </div>
                <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive" onClick={() => handleDeleteBank(b.id)}>
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recent Wallet Activity */}
      {data.transactions.length > 0 && (
        <div className="p-4 border-t border-border">
          <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium mb-3">Recent Activity</p>
          <div className="space-y-2">
            {data.transactions.map((tx: any) => (
              <div key={tx.id} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {tx.type === "credit" ? (
                    <ArrowDownToLine className="h-3 w-3 text-[hsl(160,60%,45%)]" />
                  ) : (
                    <ArrowUpFromLine className="h-3 w-3 text-destructive" />
                  )}
                  <span className="text-xs text-foreground">{tx.description || tx.type}</span>
                </div>
                <span className={`text-xs font-mono font-bold ${tx.type === "credit" || tx.type === "refund" ? "text-[hsl(160,60%,45%)]" : "text-destructive"}`}>
                  {tx.type === "credit" || tx.type === "refund" ? "+" : "-"}₦{Number(tx.amount).toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default WalletCard;
