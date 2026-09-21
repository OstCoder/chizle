// Fast-track onboarding collects just a primary goal and age; the scan itself
// fills in the rest. Kept as a compact type so the server action and the
// onboarding wizard share one contract.

export const GOALS = [
  "Improve posture",
  "Optimize hairstyle",
  "Dating profile improvement",
  "Overall grooming",
] as const;

export type Goal = (typeof GOALS)[number];

export interface OnboardingProfile {
  primaryGoal: Goal | "";
  age: string;
}

export const EMPTY_ONBOARDING_PROFILE: OnboardingProfile = {
  primaryGoal: "",
  age: "",
};
