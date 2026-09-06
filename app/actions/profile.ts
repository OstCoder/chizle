"use server";

import { createClient } from "@/lib/supabase/server";
import type { OnboardingProfile } from "@/lib/supabase/types";

const allowedGenders = new Set([
  "Male",
  "Female",
  "Non-binary",
  "Prefer not to say",
]);
const allowedHairTypes = new Set([
  "Straight",
  "Wavy",
  "Curly",
  "Coily",
  "Thinning",
]);
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
  const height = Number(profile.height);
  const weight = Number(profile.weight);

  if (!allowedGenders.has(profile.gender)) throw new Error("Choose a gender.");
  if (!Number.isInteger(age) || age < 13 || age > 120) {
    throw new Error("Enter an age between 13 and 120.");
  }
  if (!Number.isFinite(height) || height <= 0 || !Number.isFinite(weight) || weight <= 0) {
    throw new Error("Enter valid height and weight values.");
  }
  if (!allowedHairTypes.has(profile.hairType)) throw new Error("Choose a hair type.");
  if (!profile.goals.length || profile.goals.some((goal) => !allowedGoals.has(goal))) {
    throw new Error("Choose at least one goal.");
  }

  const { error } = await supabase.from("profiles").upsert({
    id: user.id,
    gender: profile.gender,
    age,
    height,
    height_unit: profile.unitSystem,
    weight,
    weight_unit: profile.unitSystem,
    hair_type: profile.hairType,
    goals: profile.goals,
    onboarding_completed: true,
    updated_at: new Date().toISOString(),
  });

  if (error) throw new Error(error.message);
  return { success: true };
}
