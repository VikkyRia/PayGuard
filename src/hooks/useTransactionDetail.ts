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

    if (txData) {
      setTx(txData);
      const [seller, buyer, reviewsRes] = await Promise.all([
        supabase
          .from("profiles")
          .select("*")
          .eq("user_id", txData.seller_id)
          .single(),
        supabase
          .from("profiles")
          .select("*")
          .eq("user_id", txData.buyer_id)
          .single(),
        supabase.from("reviews").select("*").eq("transaction_id", txData.id),
      ]);
      setSellerProfile(seller.data);
      setBuyerProfile(buyer.data);
      setReviews(reviewsRes.data || []);
      if (user) {
        setHasReviewed(
          (reviewsRes.data || []).some((r: any) => r.reviewer_id === user.id),
        );
      }
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchData();

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
