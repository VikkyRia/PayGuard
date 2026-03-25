import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

const HeroSection = () => {
  return (
    <section className="relative min-h-screen flex flex-col items-center justify-center text-center overflow-hidden bg-background pt-16">
      {/* Glow effect */}
      <div className="hero-glow" />

      <div className="container mx-auto px-4 py-20 relative z-10 max-w-215">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-primary/15 border border-primary/40 mb-8"
        >
          <span className="w-2 h-2 rounded-full bg-primary animate-pulse-glow" />
          <span className="text-sm font-medium text-primary/80">Powered by Interswitch Infrastructure</span>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.1 }}
          className="text-4xl sm:text-5xl md:text-7xl font-display font-extrabold text-foreground leading-[1.05] tracking-tight mb-6"
        >
          Nigeria's Trust Layer for{" "}
          <span className="text-primary">Social Commerce</span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.2 }}
          className="text-lg md:text-xl text-muted-foreground max-w-140 mx-auto mb-12 leading-relaxed"
        >
          PayGuard holds your money safely until you're happy. Buyers pay with confidence. Sellers get paid automatically. No more getting scammed.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.3 }}
          className="flex flex-col sm:flex-row gap-4 justify-center mb-20"
        >
          <Link to="/auth">
            <Button size="lg" className="text-base px-9 py-6 font-display font-bold shadow-elevated">
              Start Selling Safely <ArrowRight className="ml-1 h-5 w-5" />
            </Button>
          </Link>
          <a href="#how-it-works">
            <Button variant="outline" size="lg" className="text-base px-9 py-6 border-border hover:border-primary hover:text-foreground">
              See How It Works
            </Button>
          </a>
        </motion.div>

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.7, delay: 0.5 }}
          className="flex flex-wrap items-center justify-center gap-12 border-t border-border pt-12 max-w-175 mx-auto"
        >
          {[
            { num: "₦2T+", label: "Lost to fraud annually" },
            { num: "0%", label: "Fraud on PayGuard" },
            { num: "48h", label: "Max dispute resolution" },
            { num: "5 APIs", label: "Interswitch integrations" },
          ].map(({ num, label }) => (
            <div key={label} className="text-center">
              <p className="font-display text-2xl font-extrabold text-foreground">{num}</p>
              <p className="text-xs text-muted-foreground mt-1">{label}</p>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
};

export default HeroSection;
