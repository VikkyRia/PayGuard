import { motion } from "framer-motion";
import { UserPlus, Link2, ShoppingBag, ShieldCheck } from "lucide-react";

const steps = [
  {
    icon: UserPlus,
    title: "Seller Signs Up",
    description: "Create an account and verify your identity via BVN. Takes under 2 minutes.",
  },
  {
    icon: Link2,
    title: "Share Payment Link",
    description: "Generate a shareable escrow link for your item. Drop it on WhatsApp, Instagram, or Twitter.",
  },
  {
    icon: ShoppingBag,
    title: "Buyer Clicks & Pays",
    description: "No account needed. Buyer sees item details, agrees to terms, and pays securely via Interswitch.",
  },
  {
    icon: ShieldCheck,
    title: "Escrow Activates",
    description: "Funds are locked. Seller ships. Buyer inspects. Everyone is protected.",
  },
];

const OnboardingSection = () => {
  return (
    <section className="py-24 bg-background">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-16"
        >
          <span className="text-xs font-bold text-primary uppercase tracking-[2px]">Onboarding</span>
          <h2 className="text-3xl md:text-5xl font-display font-extrabold text-foreground mt-4 tracking-tight">
            From Signup to Sale in Minutes
          </h2>
          <p className="text-muted-foreground mt-4 max-w-135 leading-relaxed">
            Every payment link is a new customer. Sellers share, buyers click, trust is built automatically.
          </p>
        </motion.div>

        <div className="max-w-3xl relative">
          <div className="absolute left-6 top-0 bottom-0 w-px bg-border hidden md:block" />

          <div className="space-y-6">
            {steps.map((step, i) => (
              <motion.div
                key={step.title}
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.15 }}
                className="flex gap-6 items-start"
              >
                <div className="relative z-10 w-12 h-12 rounded-xl bg-primary/15 border border-primary/30 flex items-center justify-center shrink-0">
                  <step.icon className="h-6 w-6 text-primary" />
                </div>
                <div className="bg-card rounded-2xl p-6 border border-border flex-1 hover:border-primary/40 transition-colors">
                  <h3 className="font-display text-lg font-bold text-foreground mb-1">{step.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{step.description}</p>
                </div>
              </motion.div>
            ))}
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mt-12 bg-primary/5 border border-primary/20 rounded-2xl p-6 text-center"
          >
            <p className="font-display font-bold text-foreground text-lg mb-1">
              🔗 Every Link = User Acquisition
            </p>
            <p className="text-sm text-muted-foreground">
              Sellers share payment links on Instagram, WhatsApp, and Twitter. Each link brings a new buyer onto the platform — no marketing budget needed.
            </p>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default OnboardingSection;
