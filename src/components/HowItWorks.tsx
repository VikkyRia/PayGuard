import { motion } from "framer-motion";
import { Link2, CreditCard, Lock, Package, Zap } from "lucide-react";

const steps = [
  {
    icon: Link2,
    step: "01",
    emoji: "🔗",
    title: "Seller creates a payment link",
    description: "Add item name, price, and expected delivery window. PayGuard generates a unique shareable link instantly.",
  },
  {
    icon: CreditCard,
    step: "02",
    emoji: "💳",
    title: "Buyer pays via the link",
    description: "Pay by card, bank transfer, or USSD. Powered by Interswitch PAYDirect — the same rails the banks use.",
  },
  {
    icon: Lock,
    step: "03",
    emoji: "🔒",
    title: "Funds held in escrow",
    description: "Money is secured in PayGuard's Interswitch-powered holding account. Neither party can access it yet.",
  },
  {
    icon: Package,
    step: "04",
    emoji: "📦",
    title: "Seller ships, buyer confirms",
    description: "Seller enters tracking info. Buyer taps 'Confirm Delivery' or matches OTP on pickup.",
  },
  {
    icon: Zap,
    step: "05",
    emoji: "⚡",
    title: "Funds released instantly",
    description: "Interswitch Transfer API fires immediately. Money lands in seller's bank account in seconds.",
  },
];

const HowItWorks = () => {
  return (
    <section id="how-it-works" className="py-24 bg-background">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-16"
        >
          <span className="text-xs font-bold text-primary uppercase tracking-[2px]">How It Works</span>
          <h2 className="text-3xl md:text-5xl font-display font-extrabold text-foreground mt-4 tracking-tight">
            Escrow in 5 simple steps
          </h2>
          <p className="text-muted-foreground mt-4 max-w-135 leading-relaxed">
            Money doesn't move until you're satisfied. That's the promise.
          </p>
        </motion.div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
          {steps.map((step, i) => (
            <motion.div
              key={step.step}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="relative group bg-card border border-border rounded-2xl p-7 hover:border-primary hover:-translate-y-1 transition-all duration-300 overflow-hidden"
            >
              {/* Top accent line */}
              <div className="absolute top-0 left-0 right-0 h-0.75 bg-linear-to-r from-primary to-primary/60 opacity-0 group-hover:opacity-100 transition-opacity" />
              
              <div className="w-10 h-10 rounded-[10px] bg-primary/15 border border-primary/30 flex items-center justify-center font-display font-extrabold text-primary text-sm mb-5">
                {step.step}
              </div>
              <p className="text-2xl mb-4">{step.emoji}</p>
              <h3 className="font-display text-base font-bold text-foreground mb-2">{step.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{step.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;
