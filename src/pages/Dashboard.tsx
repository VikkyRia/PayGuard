import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Navigate, Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { LogOut, User, LayoutDashboard, Plus, ShieldCheck, Wallet, Truck } from "lucide-react";
import { Button } from "@/components/ui/button";
import CreateTransactionForm from "@/components/CreateTransactionForm";
import TransactionActions from "@/components/TransactionActions";
import KYCVerification from "@/components/KYCVerification";
import WhatsAppShareButton from "@/components/WhatsAppShareButton";
import WalletCard from "@/components/WalletCard";

const statusColors: Record<string, string> = {
  pending_payment: "bg-muted text-muted-foreground",
  funded: "bg-primary/15 text-primary border border-primary/30",
  shipped: "bg-secondary/15 text-secondary border border-secondary/30",
  delivered: "bg-secondary/20 text-secondary border border-secondary/30",
  inspection: "bg-accent/20 text-accent border border-accent/30",
  completed: "bg-[hsl(160,60%,45%)]/15 text-[hsl(160,60%,45%)] border border-[hsl(160,60%,45%)]/30",
  disputed: "bg-destructive/15 text-destructive border border-destructive/30",
  refunded: "bg-muted text-muted-foreground",
  cancelled: "bg-muted text-muted-foreground",
};

const Dashboard = () => {
  const { user, isAdmin, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const [showForm, setShowForm] = useState(false);
  const [showKYC, setShowKYC] = useState(false);
  const [activeTab, setActiveTab] = useState<"transactions" | "wallet">("transactions");
  const [transactions, setTransactions] = useState<any[]>([]);
  const [profile, setProfile] = useState<any>(null);
  const [dataLoading, setDataLoading] = useState(true);

  const fetchData = async () => {
    if (!user) return;
    setDataLoading(true);
    const [txRes, profRes] = await Promise.all([
      supabase.from("transactions").select("*").or(`seller_id.eq.${user.id},buyer_id.eq.${user.id}`).order("created_at", { ascending: false }),
      supabase.from("profiles").select("*").eq("user_id", user.id).maybeSingle(),
    ]);
    setTransactions(txRes.data || []);
    setProfile(profRes.data);
    setDataLoading(false);
  };

  useEffect(() => {
    if (!user) return;
    const init = async () => {
      await fetchData();
    };
    init();
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel("dashboard-transactions")
      .on("postgres_changes", { event: "*", schema: "public", table: "transactions" }, () => fetchData())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user]);

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-background"><p className="text-muted-foreground">Loading...</p></div>;
  if (!user) return <Navigate to="/auth" replace />;

  const active = transactions.filter(t => !["completed", "refunded", "cancelled"].includes(t.status)).length;
  const completed = transactions.filter(t => t.status === "completed").length;

  return (
    <div className="min-h-screen bg-background">
      <nav className="border-b border-border bg-background/85 backdrop-blur-xl sticky top-0 z-50">
        <div className="container mx-auto flex items-center justify-between h-16 px-4">
          <Link to="/" className="font-display text-xl font-extrabold text-foreground">
            Pay<span className="text-primary">Guard</span>
          </Link>
          <div className="flex items-center gap-3">
            {isAdmin && (
              <Link to="/admin">
                <Button variant="outline" size="sm">
                  <LayoutDashboard className="h-4 w-4 mr-1" /> Admin
                </Button>
              </Link>
            )}
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <User className="h-4 w-4" />
              <span className="hidden sm:inline">{user.email}</span>
            </div>
            <Button variant="ghost" size="sm" onClick={signOut}>
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </nav>

      <main className="container mx-auto px-4 py-6 sm:py-12">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 sm:mb-8">
          <div>
            <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-foreground mb-1">Dashboard</h1>
            <p className="text-sm sm:text-base text-muted-foreground truncate max-w-[250px] sm:max-w-none">Welcome back, {user.user_metadata?.display_name || user.email}.</p>
          </div>
          <div className="flex gap-2">
            {!profile?.bvn_verified && !profile?.nin_verified && (
              <Button variant="outline" size="sm" onClick={() => setShowKYC(true)}>
                <ShieldCheck className="h-4 w-4 mr-1" /> <span className="hidden sm:inline">Verify </span>KYC
              </Button>
            )}
            {!showForm && (
              <Button size="sm" onClick={() => setShowForm(true)}>
                <Plus className="h-4 w-4 mr-1" /> New<span className="hidden sm:inline"> Transaction</span>
              </Button>
            )}
          </div>
        </div>

        {showKYC && (
          <div className="mb-8">
            <KYCVerification onVerified={() => { setShowKYC(false); fetchData(); }} onCancel={() => setShowKYC(false)} />
          </div>
        )}

        {showForm && (
          <div className="bg-card rounded-2xl p-5 sm:p-8 border border-border mb-6 sm:mb-8 max-w-lg">
            <h2 className="font-display text-lg sm:text-xl font-bold text-foreground mb-1">Create Transaction</h2>
            <p className="text-sm text-muted-foreground mb-4 sm:mb-6">Funds will be held safely until your buyer confirms delivery.</p>
            <CreateTransactionForm onCreated={() => { setShowForm(false); fetchData(); }} onCancel={() => setShowForm(false)} />
          </div>
        )}

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-2 sm:gap-5 mb-6 sm:mb-8">
          {[
            { label: "In Escrow", value: `₦${transactions.filter(t => t.status === 'funded').reduce((a, t) => a + Number(t.amount), 0).toLocaleString()}`, sub: `${active} active` },
            { label: "Completed", value: completed.toString(), sub: "settled" },
            { label: "Trust", value: Number(profile?.trust_score || 5).toFixed(0), sub: Number(profile?.trust_score || 5) >= 8 ? "Excellent" : "Building" },
          ].map((stat) => (
            <div key={stat.label} className="bg-card rounded-xl sm:rounded-2xl p-3 sm:p-6 border border-border">
              <p className="text-[10px] sm:text-xs text-muted-foreground uppercase tracking-wider font-medium">{stat.label}</p>
              <p className="font-display text-lg sm:text-3xl font-extrabold text-foreground mt-1 sm:mt-2">{stat.value}</p>
              <p className="text-[10px] sm:text-xs text-[hsl(160,60%,45%)] mt-0.5 sm:mt-1">{stat.sub}</p>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-muted/50 p-1 rounded-xl w-fit mb-6">
          <button
            type="button"
            onClick={() => setActiveTab("transactions")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === "transactions" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
          >
            Transactions
          </button>
          <button
            onClick={() => setActiveTab("wallet")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-1.5 ${activeTab === "wallet" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
          >
            <Wallet className="h-4 w-4" /> Wallet
          </button>
        </div>

        {activeTab === "wallet" ? (
          <div className="max-w-lg">
            <WalletCard />
          </div>
        ) : dataLoading ? (
          <p className="text-muted-foreground">Loading transactions...</p>
        ) : transactions.length === 0 ? (
          <div className="bg-card rounded-2xl p-8 border border-border text-center">
            <p className="text-muted-foreground">No transactions yet. Create your first escrow transaction to get started.</p>
            <Button className="mt-4" onClick={() => setShowForm(true)}>
              <Plus className="h-4 w-4 mr-1" /> Create Transaction
            </Button>
          </div>
        ) : (
          <>
            {/* Mobile card view */}
            <div className="space-y-3 md:hidden">
              {transactions.map((tx) => (
                <div
                  key={tx.id}
                  className="bg-card rounded-xl border border-border p-4 space-y-3"
                  onClick={() => navigate(`/transaction/${tx.id}`)}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-medium text-foreground">{tx.item_name}</p>
                      <p className="font-mono text-xs text-muted-foreground">{tx.reference_code}</p>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${statusColors[tx.status] || ""}`}>
                      {tx.status.replace(/_/g, " ")}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <p className="font-display text-lg font-bold text-foreground">₦{Number(tx.amount).toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground">{new Date(tx.created_at).toLocaleDateString()}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap" onClick={(e) => e.stopPropagation()}>
                    <TransactionActions transaction={tx} userId={user.id} onUpdated={fetchData} />
                    {!["pending_payment", "cancelled", "refunded", "completed"].includes(tx.status) && (
                      <Button variant="outline" size="sm" className="text-xs h-7" onClick={() => navigate(`/transaction/${tx.id}`)}>
                        <Truck className="h-3 w-3 mr-1" /> Track
                      </Button>
                    )}
                    {tx.shareable_link && (
                      <>
                        <button onClick={() => navigator.clipboard.writeText(tx.shareable_link)} className="text-xs text-primary hover:underline font-medium">
                          Copy Link
                        </button>
                        <WhatsAppShareButton link={tx.shareable_link} itemName={tx.item_name} amount={tx.amount} size="sm" className="h-6 text-xs px-2" />
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop table view */}
            <div className="hidden md:block bg-card rounded-2xl border border-border overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="text-left p-3 font-medium text-muted-foreground text-xs uppercase tracking-wider">Ref</th>
                      <th className="text-left p-3 font-medium text-muted-foreground text-xs uppercase tracking-wider">Item</th>
                      <th className="text-left p-3 font-medium text-muted-foreground text-xs uppercase tracking-wider">Amount</th>
                      <th className="text-left p-3 font-medium text-muted-foreground text-xs uppercase tracking-wider">Status</th>
                      <th className="text-left p-3 font-medium text-muted-foreground text-xs uppercase tracking-wider">Actions</th>
                      <th className="text-left p-3 font-medium text-muted-foreground text-xs uppercase tracking-wider">Link</th>
                      <th className="text-left p-3 font-medium text-muted-foreground text-xs uppercase tracking-wider">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {transactions.map((tx) => (
                      <tr key={tx.id} className="border-t border-border hover:bg-muted/20 transition-colors cursor-pointer" onClick={() => navigate(`/transaction/${tx.id}`)}>
                        <td className="p-3 font-mono text-xs text-muted-foreground">{tx.reference_code}</td>
                        <td className="p-3 font-medium text-foreground">{tx.item_name}</td>
                        <td className="p-3 font-display font-bold text-foreground">₦{Number(tx.amount).toLocaleString()}</td>
                        <td className="p-3">
                          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${statusColors[tx.status] || ""}`}>
                            {tx.status.replace(/_/g, " ")}
                          </span>
                        </td>
                        <td className="p-3" onClick={(e) => e.stopPropagation()}>
                          <div className="flex flex-col gap-1.5">
                            <TransactionActions transaction={tx} userId={user.id} onUpdated={fetchData} />
                            {!["pending_payment", "cancelled", "refunded", "completed"].includes(tx.status) && (
                              <Button variant="outline" size="sm" className="text-xs h-7" onClick={() => navigate(`/transaction/${tx.id}`)}>
                                <Truck className="h-3 w-3 mr-1" /> Track
                              </Button>
                            )}
                          </div>
                        </td>
                        <td className="p-3" onClick={(e) => e.stopPropagation()}>
                          {tx.shareable_link ? (
                            <div className="flex gap-1.5">
                              <button onClick={() => navigator.clipboard.writeText(tx.shareable_link)} className="text-xs text-primary hover:underline font-medium">
                                Copy
                              </button>
                              <WhatsAppShareButton link={tx.shareable_link} itemName={tx.item_name} amount={tx.amount} size="sm" className="h-6 text-xs px-2" />
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </td>
                        <td className="p-3 text-muted-foreground text-xs">{new Date(tx.created_at).toLocaleDateString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
};

export default Dashboard;