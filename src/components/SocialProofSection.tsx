import { motion } from "framer-motion";
import { TrendingDown, Users, ShieldAlert, Clock } from "lucide-react";

const stats = [
  { icon: TrendingDown, value: "₦2T+", label: "Lost to online fraud annually in Nigeria" },
  { icon: Users, value: "50M+", label: "Nigerians shop online without protection" },
  { icon: ShieldAlert, value: "73%", label: "Of buyers have been scammed at least once" },
  { icon: Clock, value: "< 2min", label: "To create a secure PayGuard transaction" },
];

const differentiators = [
  { traditional: "Send money and pray", payguard: "Funds held until you verify" },
  { traditional: "No recourse after payment", payguard: "48-hour inspection window" },
  { traditional: "Seller disappears after payment", payguard: "BVN-verified seller profiles" },
  { traditional: "No transaction records", payguard: "Full audit trail for every deal" },
  { traditional: "Trust based on vibes", payguard: "Public trust scores for buyers & sellers" },
];

const SocialProofSection = () => {
  return (
    <section className="py-24 bg-background">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-12"
        >
          <span className="text-xs font-bold text-primary uppercase tracking-[2px]">The Problem</span>
          <h2 className="text-3xl md:text-5xl font-display font-extrabold text-foreground mt-4 tracking-tight">
            Nigeria Has a Trust Problem
          </h2>
          <p className="text-muted-foreground mt-4 max-w-135 leading-relaxed">
            Every day, millions lose money to faceless sellers. PayGuard changes that.
          </p>
        </motion.div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-20">
          {stats.map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="bg-card border border-border rounded-2xl p-6 text-center"
            >
              <div className="w-12 h-12 rounded-xl bg-destructive/10 flex items-center justify-center mb-4 mx-auto">
                <stat.icon className="h-6 w-6 text-destructive" />
              </div>
              <p className="font-display text-3xl font-extrabold text-foreground">{stat.value}</p>
              <p className="text-sm text-muted-foreground mt-2 leading-relaxed">{stat.label}</p>
            </motion.div>
          ))}
        </div>

        {/* Comparison */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-10"
        >
          <span className="text-xs font-bold text-primary uppercase tracking-[2px]">Comparison</span>
          <h2 className="text-3xl md:text-4xl font-display font-extrabold text-foreground mt-4">
            Traditional vs PayGuard
          </h2>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="max-w-2xl bg-card rounded-2xl border border-border overflow-hidden"
        >
          <div className="grid grid-cols-2 bg-muted text-sm font-display font-bold">
            <div className="p-4 border-r border-border text-foreground">Traditional Payment</div>
            <div className="p-4 text-primary">PayGuard Escrow</div>
          </div>
          {differentiators.map((d, i) => (
            <div key={i} className="grid grid-cols-2 text-sm border-t border-border">
              <div className="p-4 border-r border-border text-muted-foreground line-through decoration-destructive/40">
                {d.traditional}
              </div>
              <div className="p-4 text-foreground font-medium">
                ✓ {d.payguard}
              </div>
            </div>
          ))}
        </motion.div>

        {/* Differentiators */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mt-16"
        >
          <h3 className="text-xl md:text-2xl font-display font-extrabold text-foreground mb-6">
            Why PayGuard Wins Over Competitors
          </h3>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 max-w-4xl">
            {[
              "Built natively on Interswitch rails",
              "Shareable payment links for WhatsApp & IG",
              "Public trust scores for buyers & sellers",
              "No account needed for buyers to pay",
            ].map((point, i) => (
              <div key={i} className="bg-primary/5 border border-primary/20 rounded-xl p-4 text-sm text-foreground font-medium">
                {point}
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default SocialProofSection;
