import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

const CTASection = () => {
  return (
    <section className="py-24 bg-hero-gradient relative overflow-hidden">
      <div className="absolute top-0 right-0 w-96 h-96 bg-primary-foreground/5 rounded-full blur-3xl" />
      <div className="absolute bottom-0 left-0 w-64 h-64 bg-primary-foreground/3 rounded-full blur-3xl" />
      <div className="container mx-auto px-4 relative z-10 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <h2 className="text-3xl md:text-5xl font-display font-extrabold text-primary-foreground mb-4">
            Ready to Trade Without Fear?
          </h2>
          <p className="text-lg text-primary-foreground/60 max-w-md mx-auto mb-8">
            Join thousands of Nigerians already using PayGuard for safe transactions.
          </p>
          <Link to="/auth">
            <Button size="lg" className="text-base px-10 py-6 bg-foreground text-background hover:bg-foreground/90 font-display font-bold">
              Create Your First Transaction <ArrowRight className="ml-1 h-5 w-5" />
            </Button>
          </Link>
        </motion.div>
      </div>
    </section>
  );
};

export default CTASection;
