export const GENDERS = [
  "Male",
  "Female",
  "Non-binary",
  "Prefer not to say",
] as const;

export const HAIR_TYPES = [
  "Straight",
  "Wavy",
  "Curly",
  "Coily",
  "Thinning",
] as const;

export const GOALS = [
  "Improve posture",
  "Optimize hairstyle",
  "Dating profile improvement",
  "Overall grooming",
] as const;

export type Gender = (typeof GENDERS)[number];
export type HairType = (typeof HAIR_TYPES)[number];
export type Goal = (typeof GOALS)[number];
export type UnitSystem = "imperial" | "metric";

export interface OnboardingProfile {
  gender: Gender | "";
  age: string;
  unitSystem: UnitSystem;
  height: string;
  heightFeet: string;
  heightInches: string;
  weight: string;
  hairType: HairType | "";
  goals: Goal[];
}

export const EMPTY_ONBOARDING_PROFILE: OnboardingProfile = {
  gender: "",
  age: "",
  unitSystem: "imperial",
  height: "",
  heightFeet: "",
  heightInches: "",
  weight: "",
  hairType: "",
  goals: [],
};
