"use server";

import { createClient } from "@/lib/supabase/server";
import type { OnboardingProfile } from "@/lib/supabase/types";

const allowedGoals = new Set([
  "Improve posture",
  "Optimize hairstyle",
  "Dating profile improvement",
  "Overall grooming",
]);

export async function saveOnboardingProfile(profile: OnboardingProfile) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("You need to be signed in to finish onboarding.");
  }

  const age = Number(profile.age);
  if (!allowedGoals.has(profile.primaryGoal)) {
    throw new Error("Choose your primary goal.");
  }
  if (!Number.isInteger(age) || age < 13 || age > 120) {
    throw new Error("Enter an age between 13 and 120.");
  }

  // The fast-track flow collects only a goal + age. Height/weight/hair stay
  // null (profile-sized defaults like the water target simply fall back), and
  // hair texture comes from the scan's hair read when present.
  const { error } = await supabase.from("profiles").upsert({
    id: user.id,
    age,
    goals: [profile.primaryGoal],
    onboarding_completed: true,
    updated_at: new Date().toISOString(),
  });

  if (error) throw new Error(error.message);
  return { success: true };
}
