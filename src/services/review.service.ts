// src/services/review.service.ts - file path
import { supabase } from "@/integrations/supabase/client";

export interface ReviewData {
  transactionId: string;
  reviewerId: string;
  reviewedUserId: string;
  rating: number; // 1-5
  comment?: string;
}

export const reviewService = {
  async submitReview(data: ReviewData) {
    //  Insert the review
    const { error: reviewError } = await supabase.from("reviews").insert({
      transaction_id: data.transactionId,
      reviewer_id: data.reviewerId,
      reviewed_user_id: data.reviewedUserId,
      rating: data.rating,
      comment: data.comment?.trim() || null,
    });

    if (reviewError) {
      if (reviewError.code === "23505") {
        throw new Error("You've already reviewed this transaction.");
      }
      throw reviewError;
    }

    //  Fetch profile to update trust score
    const { data: profile } = await supabase
      .from("profiles")
      .select("trust_score, total_transactions")
      .eq("user_id", data.reviewedUserId)
      .maybeSingle();

    if (profile) {
      const totalTx = profile.total_transactions || 1;
      const ratingScaled = data.rating * 2; // Scale 1-5 to 2-10
      
      // Calculate new weighted average
      const currentTotalScore = Number(profile.trust_score || 0) * totalTx;
      const newTrust = Math.min(10, (currentTotalScore + ratingScaled) / (totalTx + 1));
      const roundedTrust = Math.round(newTrust * 10) / 10;

      await supabase
        .from("profiles")
        .update({ trust_score: roundedTrust })
        .eq("user_id", data.reviewedUserId);
    }

    return { success: true };
  }
};