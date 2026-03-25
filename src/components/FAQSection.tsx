import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { motion } from "framer-motion";

const faqs = [
  { q: "How does PayGuard protect me from scams?", a: "Funds are held as a temporary transaction hold via Interswitch — never co-mingled with other funds. The seller only receives money after the buyer confirms delivery. We're a payment flow manager, not a bank or wallet provider." },
  { q: "What payment methods are supported?", a: "We support all major Nigerian payment methods through Interswitch — bank transfers, debit cards (Verve, Mastercard, Visa), USSD, and QR code payments." },
  { q: "How much does it cost?", a: "We charge a small flat fee of 1.5% per transaction (capped at ₦5,000). No hidden charges. The fee is shared between buyer and seller." },
  { q: "What if the item delivered is wrong or damaged?", a: "You have a 48-hour inspection window. Disputes are handled in tiers: under ₦50,000 are auto-resolved using trust scores and delivery data; ₦50K–₦500K get admin review within 24 hours; above ₦500K requires both parties to submit evidence within 48 hours." },
  { q: "What stops a buyer from making fake disputes?", a: "Both buyers and sellers have trust scores. If a buyer has 3+ disputes in their history, their claim is automatically flagged and requires photo/video evidence before it's even accepted. Bad actors get caught fast." },
  { q: "How is PayGuard different from Escrow.ng or Truspay?", a: "PayGuard is built natively on Interswitch rails for deeper Nigerian banking integration. We offer shareable payment links that work inside WhatsApp/Instagram chats, public trust scores for both buyers and sellers, and zero-signup for buyers — they just click and pay." },
  { q: "Can I use PayGuard for services, not just products?", a: "Absolutely! PayGuard works for freelance work, digital products, event tickets, and any transaction where trust is needed between two parties." },
];

const FAQSection = () => {
  return (
    <section id="faq" className="py-24 bg-background">
      <div className="container mx-auto px-4 max-w-2xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <span className="text-xs font-bold text-primary uppercase tracking-[2px]">FAQ</span>
          <h2 className="text-3xl md:text-4xl font-display font-extrabold text-foreground mt-4">
            Common Questions
          </h2>
        </motion.div>

        <Accordion type="single" collapsible className="space-y-3">
          {faqs.map((faq, i) => (
            <AccordionItem
              key={i}
              value={`faq-${i}`}
              className="bg-card rounded-xl px-6 border border-border"
            >
              <AccordionTrigger className="text-left font-display font-semibold text-foreground hover:no-underline">
                {faq.q}
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground leading-relaxed">
                {faq.a}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
};

export default FAQSection;
