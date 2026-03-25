import { MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface WhatsAppShareButtonProps {
  link: string;
  itemName: string;
  amount: number;
  className?: string;
  size?: "sm" | "default" | "lg" | "icon";
}

const WhatsAppShareButton = ({ link, itemName, amount, className, size = "sm" }: WhatsAppShareButtonProps) => {
  const message = encodeURIComponent(
    `Hi! Please complete payment for "${itemName}" (₦${Number(amount).toLocaleString()}) securely via PayGuard:\n${link}\n\nYour funds are protected until you confirm delivery. 🔒`
  );
  const whatsappUrl = `https://wa.me/?text=${message}`;

  return (
    <a href={whatsappUrl} target="_blank" rel="noopener noreferrer">
      <Button variant="outline" size={size} className={`text-[hsl(142,70%,45%)] border-[hsl(142,70%,45%)]/30 hover:bg-[hsl(142,70%,45%)]/10 ${className || ""}`}>
        <MessageCircle className="h-4 w-4 mr-1" />
        WhatsApp
      </Button>
    </a>
  );
};

export default WhatsAppShareButton;
