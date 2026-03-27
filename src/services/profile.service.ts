import { supabase } from "@/integrations/supabase/client";

export type ProfileUpdate = {
  display_name?: string;
  phone?: string | null;
  avatar_url?: string | null;
};

export const profileService = {
  // Fetch the current user's profile
  getProfile: async (userId: string) => {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    if (error) throw new Error("Could not load profile");
    return data;
  },

  // Update editable fields
  updateProfile: async (userId: string, updates: ProfileUpdate) => {
    const { data, error } = await supabase
      .from("profiles")
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq("user_id", userId)
      .select()
      .single();

    if (error) throw new Error("Could not update profile");
    return data;
  },

  // Upload avatar to Supabase Storage, return public URL
  // Bucket name: "avatars" 
  uploadAvatar: async (userId: string, file: File): Promise<string> => {
    const ext = file.name.split(".").pop();
    const path = `${userId}/avatar.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(path, file, { upsert: true, contentType: file.type });

    if (uploadError) throw new Error("Could not upload avatar");

    const { data } = supabase.storage.from("avatars").getPublicUrl(path);
    // Bust the cache so the new image shows immediately
    return `${data.publicUrl}?t=${Date.now()}`;
  },

  // Remove avatar (reset to null) 
  removeAvatar: async (userId: string) => {
    const ext = ["jpg", "jpeg", "png", "webp"];
    // Try to remove all common extensions (we don't know which was uploaded)
    await Promise.allSettled(
      ext.map((e) =>
        supabase.storage.from("avatars").remove([`${userId}/avatar.${e}`])
      )
    );
    return profileService.updateProfile(userId, { avatar_url: null });
  },
};