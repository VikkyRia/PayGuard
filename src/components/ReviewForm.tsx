// src/components/ReviewForm.tsx
import { useState } from "react";
import { useAuth } from "@/contexts/useAuth";
import { reviewService } from "@/services/review.service";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Star, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface ReviewFormProps {
  transactionId: string;
  reviewedUserId: string;
  reviewedUserName: string;
  onReviewed: () => void;
}

const ReviewForm = ({ transactionId, reviewedUserId, reviewedUserName, onReviewed }: ReviewFormProps) => {
  const { user } = useAuth();
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!user || rating === 0) return;
    
    setLoading(true);
    try {
      await reviewService.submitReview({
        transactionId,
        reviewerId: user.id,
        reviewedUserId,
        rating,
        comment,
      });

      toast.success("Review submitted! Thank you.");
      onReviewed();
    } catch (err: any) {
      toast.error("Review failed", { description: err.message });
    } finally {
      setLoading(false);
    }
  };

  const displayRating = hoveredRating || rating;
  const ratingLabels = ["", "Poor", "Fair", "Good", "Very Good", "Excellent"];

  return (
    <div className="bg-card rounded-xl border border-border p-5 space-y-4 shadow-sm font-body">
      <div>
        <h4 className="font-display font-bold text-foreground text-sm uppercase tracking-tight">
          Rate {reviewedUserName}
        </h4>
        <p className="text-xs text-muted-foreground mt-1">How was your experience with this transaction?</p>
      </div>

      <div className="flex gap-1 items-center">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => setRating(star)}
            onMouseEnter={() => setHoveredRating(star)}
            onMouseLeave={() => setHoveredRating(0)}
            className="p-1 transition-transform active:scale-95"
          >
            <Star
              className={`h-7 w-7 transition-all ${
                star <= displayRating
                  ? "fill-secondary text-secondary drop-shadow-sm"
                  : "text-muted-foreground/30"
              }`}
            />
          </button>
        ))}
        {displayRating > 0 && (
          <span className="text-sm font-medium text-secondary animate-in fade-in slide-in-from-left-2 ml-2">
            {ratingLabels[displayRating]}
          </span>
        )}
      </div>

      <Textarea
        placeholder="Tell others about the item quality or speed of service..."
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        rows={2}
        className="resize-none bg-muted/30 border-border focus:ring-1 focus:ring-secondary/50"
      />

      <Button
        onClick={handleSubmit}
        disabled={rating === 0 || loading}
        size="sm"
        className="w-full font-display font-bold"
      >
        {loading ? (
          <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Submitting...</>
        ) : (
          "Submit Review"
        )}
      </Button>
    </div>
  );
};

export default ReviewForm;
