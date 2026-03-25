import { motion } from "framer-motion";

const features = [
  {
    emoji: "🔒",
    title: "Interswitch-Powered Escrow",
    description: "Your money is held via Interswitch's 20-year-old banking-grade infrastructure. Not in our pocket. Not in a crypto wallet. In real rails.",
  },
  {
    emoji: "🔗",
    title: "One Link. Any Platform.",
    description: "Sellers generate a unique payment link and drop it directly into WhatsApp, Instagram DMs, or Twitter. Buyers pay instantly — no app download needed.",
  },
  {
    emoji: "⚡",
    title: "Auto-Release. Zero Friction.",
    description: "When the buyer confirms delivery (or 48 hours pass), funds release instantly to the seller's bank account. No chasing, no delays.",
  },
  {
    emoji: "🏆",
    title: "Trust Score System",
    description: "Both buyers and sellers are scored. Bad actors can't hide. Every payment link shows the seller's trust score so buyers know who they're dealing with.",
  },
  {
    emoji: "⚖️",
    title: "Fair Dispute Resolution",
    description: "Raise a dispute with evidence. Our tiered system resolves small disputes automatically and reviews large ones within 24–48 hours.",
  },
  {
    emoji: "📲",
    title: "SMS Notifications",
    description: "Every critical step — payment received, item shipped, funds released — is confirmed via SMS. Works on any phone, with or without data.",
  },
];

const FeaturesSection = () => {
  return (
    <section id="features" className="py-24 bg-background">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-16"
        >
          <span className="text-xs font-bold text-primary uppercase tracking-[2px]">Why PayGuard Wins</span>
          <h2 className="text-3xl md:text-5xl font-display font-extrabold text-foreground mt-4 tracking-tight">
            Built different. Built for Nigeria.
          </h2>
        </motion.div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, i) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08 }}
              className="bg-card border border-border rounded-2xl p-8 hover:border-primary hover:-translate-y-1 transition-all duration-300"
            >
              <div className="w-13 h-13 rounded-[14px] bg-primary/12 border border-primary/20 flex items-center justify-center text-2xl mb-5">
                {feature.emoji}
              </div>
              <h3 className="font-display text-base font-bold text-foreground mb-2">{feature.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{feature.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;
