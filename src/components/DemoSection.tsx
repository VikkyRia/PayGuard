import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { CheckCircle2, ArrowRight, Shield, Wallet, Truck, PartyPopper } from "lucide-react";

const demoSteps = [
  {
    id: 1, icon: Shield, title: "Create Transaction",
    buyer: "Chioma", seller: "Emeka's Phone Store", item: "iPhone 15 Pro Max", price: "₦850,000",
    status: "Agreement Created",
    detail: "Both parties agree on the terms. Item details, price, and delivery timeline are locked in.",
  },
  {
    id: 2, icon: Wallet, title: "Secure Payment",
    buyer: "Chioma", seller: "Emeka's Phone Store", item: "iPhone 15 Pro Max", price: "₦850,000",
    status: "Funds Secured in Vault",
    detail: "Chioma pays ₦850,000 via Interswitch. Funds are held securely. Emeka gets notified to ship.",
  },
  {
    id: 3, icon: Truck, title: "Delivery & Inspection",
    buyer: "Chioma", seller: "Emeka's Phone Store", item: "iPhone 15 Pro Max", price: "₦850,000",
    status: "Item Delivered — Inspection Window",
    detail: "Chioma receives the phone and has 48 hours to inspect. She checks IMEI, battery health, and accessories.",
  },
  {
    id: 4, icon: PartyPopper, title: "Transaction Complete!",
    buyer: "Chioma", seller: "Emeka's Phone Store", item: "iPhone 15 Pro Max", price: "₦850,000",
    status: "Funds Released to Seller ✓",
    detail: "Chioma confirms everything is perfect. ₦850,000 is instantly released to Emeka. Both parties are happy!",
  },
];

const DemoSection = () => {
  const [activeStep, setActiveStep] = useState(0);
  const step = demoSteps[activeStep];

  return (
    <section id="demo" className="py-24 bg-muted/30">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <span className="text-xs font-bold text-primary uppercase tracking-[2px]">Live Demo</span>
          <h2 className="text-3xl md:text-5xl font-display font-extrabold text-foreground mt-4 tracking-tight">
            See It in Action
          </h2>
          <p className="text-muted-foreground mt-4 max-w-lg mx-auto leading-relaxed">
            Click through a real escrow transaction between Chioma and Emeka.
          </p>
        </motion.div>

        <div className="max-w-2xl mx-auto">
          {/* Step indicators */}
          <div className="flex items-center justify-between mb-10">
            {demoSteps.map((s, i) => (
              <button key={s.id} onClick={() => setActiveStep(i)} className="flex flex-col items-center gap-2 group">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-display font-bold text-sm transition-all duration-300 ${
                  i <= activeStep ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                }`}>
                  {i < activeStep ? <CheckCircle2 className="h-5 w-5" /> : s.id}
                </div>
                <span className="text-xs text-muted-foreground hidden sm:block">{s.title}</span>
              </button>
            ))}
          </div>

          {/* Demo card */}
          <AnimatePresence mode="wait">
            <motion.div
              key={activeStep}
              initial={{ opacity: 0, y: 20, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.98 }}
              transition={{ duration: 0.35 }}
              className="bg-card rounded-2xl shadow-elevated border border-border overflow-hidden"
            >
              <div className="bg-hero-gradient p-6 flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-primary-foreground/10 flex items-center justify-center">
                  <step.icon className="h-6 w-6 text-secondary" />
                </div>
                <div>
                  <h3 className="font-display text-lg font-bold text-primary-foreground">{step.title}</h3>
                  <p className="text-sm text-primary-foreground/60">{step.status}</p>
                </div>
              </div>

              <div className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="bg-muted/50 rounded-xl p-3">
                    <span className="text-xs text-muted-foreground uppercase tracking-wider">Buyer</span>
                    <p className="font-semibold text-foreground mt-1">{step.buyer}</p>
                  </div>
                  <div className="bg-muted/50 rounded-xl p-3">
                    <span className="text-xs text-muted-foreground uppercase tracking-wider">Seller</span>
                    <p className="font-semibold text-foreground mt-1">{step.seller}</p>
                  </div>
                  <div className="bg-muted/50 rounded-xl p-3">
                    <span className="text-xs text-muted-foreground uppercase tracking-wider">Item</span>
                    <p className="font-semibold text-foreground mt-1">{step.item}</p>
                  </div>
                  <div className="bg-muted/50 rounded-xl p-3">
                    <span className="text-xs text-muted-foreground uppercase tracking-wider">Amount</span>
                    <p className="font-display font-extrabold text-xl text-foreground mt-1">{step.price}</p>
                  </div>
                </div>

                <div className="bg-muted/30 rounded-xl p-4 border border-border">
                  <p className="text-sm text-muted-foreground">{step.detail}</p>
                </div>

                <div className="flex gap-3 pt-2">
                  <Button variant="outline" size="sm" disabled={activeStep === 0} onClick={() => setActiveStep((p) => p - 1)}>
                    Back
                  </Button>
                  <Button size="sm" disabled={activeStep === demoSteps.length - 1} onClick={() => setActiveStep((p) => p + 1)} className="ml-auto">
                    {activeStep === demoSteps.length - 1 ? "Done!" : "Next Step"}{" "}
                    {activeStep < demoSteps.length - 1 && <ArrowRight className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
};

export default DemoSection;
