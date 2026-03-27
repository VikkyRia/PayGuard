import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/useAuth";

export function useTransactionDetail(id: string | undefined) {
  const { user } = useAuth();
  const [tx, setTx] = useState<any>(null);
  const [sellerProfile, setSellerProfile] = useState<any>(null);
  const [buyerProfile, setBuyerProfile] = useState<any>(null);
  const [reviews, setReviews] = useState<any[]>([]);
  const [hasReviewed, setHasReviewed] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    if (!id) return;
    setLoading(true);

    const { data: txData } = await supabase
      .from("transactions")
      .select("*")
      .eq("id", id)
      .single();

    if (txData && txData.seller_id) {
      setTx(txData);

      // Prepare our promises
      const sellerPromise = supabase
        .from("profiles")
        .select("*")
        .eq("user_id", txData.seller_id)
        .single();

      const reviewsPromise = supabase
        .from("reviews")
        .select("*")
        .eq("transaction_id", txData.id);

      // Only create the buyer promise if the buyer_id actually exists
      const buyerPromise = txData.buyer_id
        ? supabase
            .from("profiles")
            .select("*")
            .eq("user_id", txData.buyer_id)
            .single()
        : Promise.resolve({ data: null }); // Return a dummy "resolved" promise if no buyer

      // Run them all
      const [seller, buyer, reviewsRes] = await Promise.all([
        sellerPromise,
        buyerPromise,
        reviewsPromise,
      ]);

      // Set states safely
      if (seller.data) setSellerProfile(seller.data);
      if (buyer.data) setBuyerProfile(buyer.data);

      const reviewsData = reviewsRes.data || [];
      setReviews(reviewsData);

      if (user) {
        setHasReviewed(reviewsData.some((r) => r.reviewer_id === user.id));
      }
    }
    setLoading(false);
  };

  useEffect(() => {
    const getData = async () => {
      await fetchData();
    };
    getData();

    if (id) {
      const channel = supabase
        .channel(`tx-${id}`)
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "transactions",
            filter: `id=eq.${id}`,
          },
          (payload) => {
            setTx(payload.new);
          },
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [id]);

  return {
    tx,
    sellerProfile,
    buyerProfile,
    reviews,
    hasReviewed,
    loading,
    fetchData,
    user,
  };
}
