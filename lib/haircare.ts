// Haircare recommendations: named cuts matched to the face shape from the
// latest scan (texture-aware), plus a daily product stack built from hair
// texture, thinning/beard considerations from the profile + maintenance
// tracker. All pure functions — the card renders whatever this returns.

import type { AnalysisReport, FaceShape, HairTexture } from "@/types/analysis";
import { HAIR_COLOR_LABEL, hairTextureLabel } from "./hair";

// ---------------------------------------------------------------------------
// Cuts by face shape
// ---------------------------------------------------------------------------

export interface CutRec {
  id: string;
  name: string;
  why: string;
  /** Textures this cut really needs; omitted = suits any texture. */
  suits?: Exclude<HairTexture, "unknown">[];
}

export const CUTS_BY_SHAPE: Record<FaceShape, CutRec[]> = {
  oval: [
    {
      id: "textured-crop",
      name: "Textured crop",
      why: "Most styles suit an oval — texture on top adds edge while the short back keeps it clean.",
    },
    {
      id: "classic-side-part",
      name: "Classic side part",
      why: "Oval faces carry structure well; a sharp part plays up the natural balance.",
    },
    {
      id: "french-crop",
      name: "French crop",
      why: "A soft fringe frames the brows and gives a modern, low-maintenance finish.",
    },
  ],
  square: [
    {
      id: "taper-fade",
      name: "Taper fade",
      why: "Keeps definition at the jaw without exaggerating the strong angles.",
    },
    {
      id: "side-swept-fringe",
      name: "Side-swept fringe",
      why: "Softens the jawline with easy width across the forehead.",
    },
    {
      id: "textured-quiff",
      name: "Textured quiff",
      why: "Height and softness that balance the square frame — keep the sides moderate.",
    },
  ],
  round: [
    {
      id: "high-fade-quiff",
      name: "High fade + quiff",
      why: "Height on top elongates the face; tight sides sharpen the silhouette.",
    },
    {
      id: "textured-top-height",
      name: "Textured top with height",
      why: "Vertical volume balances roundness far better than a flat, rounded cut.",
    },
    {
      id: "slick-undercut",
      name: "Slicked-back undercut",
      suits: ["straight", "wavy"],
      why: "Sleek, clean lines add length and structure to the shape.",
    },
  ],
  heart: [
    {
      id: "side-part-volume",
      name: "Side part with volume",
      why: "Weight at the sides balances a wider forehead against a narrower chin.",
    },
    {
      id: "textured-fringe",
      name: "Textured fringe",
      why: "Soft coverage tempers the forehead without hiding the face.",
    },
    {
      id: "soft-slick-back",
      name: "Soft slick back",
      why: "Hair off the forehead while the width on the sides balances the V-shape.",
    },
  ],
  oblong: [
    {
      id: "fringe-crop",
      name: "Fringe crop",
      why: "A horizontal fringe shortens the face and adds width where you want it.",
    },
    {
      id: "curtains-part",
      name: "Curtains / mid-length part",
      why: "Side weight widens the silhouette and breaks up the length.",
    },
    {
      id: "side-swept-bangs",
      name: "Side-swept bangs",
      why: "Adds width and softens the elongated proportions.",
    },
  ],
  diamond: [
    {
      id: "side-swept-fringe",
      name: "Side-swept fringe",
      why: "Softens the narrow forehead while keeping the cheekbones framed.",
    },
    {
      id: "layered-crop",
      name: "Layered crop",
      why: "Layers add width at the jaw and balance the cheekbone emphasis.",
    },
    {
      id: "longer-top-taper",
      name: "Longer top, tapered sides",
      why: "Volume at the top and taper at the sides soften the angular shape.",
    },
  ],
};

/** Best cuts for a shape + texture: texture-compatible first, capped at 3. */
export function pickCuts(
  shape: FaceShape,
  texture: Exclude<HairTexture, "unknown"> | "thinning" | null,
): CutRec[] {
  const all = CUTS_BY_SHAPE[shape];
  const compatible =
    texture && texture !== "thinning"
      ? all.filter((c) => !c.suits || c.suits.includes(texture))
      : [...all];
  const rest = all.filter((c) => !compatible.includes(c));
  return [...compatible, ...rest].slice(0, 3);
}

// ---------------------------------------------------------------------------
// Products by texture / condition / goal
// ---------------------------------------------------------------------------

export interface ProductRec {
  id: string;
  name: string;
  category: string; // matches the regimen card's categories
  note: string;
}

const BASE_PRODUCTS: ProductRec[] = [
  {
    id: "gentle-shampoo",
    name: "Gentle daily shampoo",
    category: "Other",
    note: "A sulfate-free cleanser that keeps your scalp calm between trims.",
  },
  {
    id: "daily-conditioner",
    name: "Daily conditioner",
    category: "Cream",
    note: "Locks in moisture so hair stays soft and healthy-looking.",
  },
];

const TEXTURE_PRODUCTS: Record<
  Exclude<HairTexture, "unknown">,
  ProductRec[]
> = {
  straight: [
    {
      id: "sea-salt-spray",
      name: "Sea salt spray",
      category: "Other",
      note: "Adds the grip and volume straight hair needs to hold a textured crop.",
    },
    {
      id: "light-clay",
      name: "Light styling clay",
      category: "Clay",
      note: "Matte, low-shine hold that keeps a part sharp without stiffness.",
    },
  ],
  wavy: [
    {
      id: "wave-cream",
      name: "Wave-enhancing cream",
      category: "Cream",
      note: "Defines the wave and cuts frizz so the natural pattern sits with your shape.",
    },
    {
      id: "sea-salt-spray",
      name: "Sea salt spray",
      category: "Other",
      note: "Boosts texture and gives waves a lived-in finish.",
    },
  ],
  curly: [
    {
      id: "curl-cream",
      name: "Curl-defining cream",
      category: "Cream",
      note: "Keeps curls hydrated and defined instead of frizzy.",
    },
    {
      id: "curl-refresher",
      name: "Curl refresher mist",
      category: "Other",
      note: "Revives day-old curls between washes.",
    },
  ],
  coily: [
    {
      id: "leave-in-conditioner",
      name: "Moisturizing leave-in conditioner",
      category: "Cream",
      note: "Deep moisture for coils — keeps definition and shine.",
    },
    {
      id: "hair-oil",
      name: "Lightweight hair oil",
      category: "Oil",
      note: "Seals in moisture and adds healthy-looking sheen.",
    },
  ],
};

const THINNING_PRODUCTS: ProductRec[] = [
  {
    id: "thickening-shampoo",
    name: "Thickening shampoo",
    category: "Other",
    note: "Volumizes the hair you have — gentler on a sensitive scalp.",
  },
  {
    id: "scalp-serum",
    name: "Scalp care serum",
    category: "Serum",
    note: "Nourishes the scalp, which supports healthier-looking hair over time.",
  },
  {
    id: "volumizing-powder",
    name: "Volumizing powder",
    category: "Other",
    note: "Instant root lift for a fuller-looking style.",
  },
  {
    id: "light-clay",
    name: "Light styling clay",
    category: "Clay",
    note: "Volumizing hold that never weighs thinning hair down.",
  },
];

const BEARD_PRODUCTS: ProductRec[] = [
  {
    id: "beard-oil",
    name: "Beard oil",
    category: "Oil",
    note: "Softens the beard and keeps the skin underneath comfortable.",
  },
  {
    id: "beard-balm",
    name: "Beard balm",
    category: "Wax",
    note: "Light hold + conditioning for a tidy beard shape.",
  },
];

const FALLBACK_PRODUCTS: ProductRec[] = [
  {
    id: "sea-salt-spray",
    name: "Sea salt spray",
    category: "Other",
    note: "A universal texture booster until your next scan pins your hair type.",
  },
  {
    id: "light-clay",
    name: "Light styling clay",
    category: "Clay",
    note: "Matte, flexible hold that works on nearly any cut.",
  },
];

// ---------------------------------------------------------------------------
// Match assembly
// ---------------------------------------------------------------------------

/** Onboarding profile fields the recommendations read. */
export interface HaircareProfile {
  hair_type?: string | null;
  goals?: string[] | null;
}

function mapProfileTexture(
  hairType: string,
): Exclude<HairTexture, "unknown"> | "thinning" | null {
  const lower = hairType.toLowerCase();
  if (lower === "straight") return "straight";
  if (lower === "wavy") return "wavy";
  if (lower === "curly") return "curly";
  if (lower === "coily") return "coily";
  if (lower === "thinning") return "thinning";
  return null;
}

export interface HaircareMatches {
  hasScan: boolean;
  shape: FaceShape | null;
  texture: Exclude<HairTexture, "unknown"> | "thinning" | null;
  textureLabel: string | null;
  colorLabel: string | null;
  cuts: CutRec[];
  products: ProductRec[];
  beardGoal: boolean;
}

/**
 * Everything the match card needs: face shape + hair read from the latest
 * scan (falling back to the onboarding hair type), texture-filtered cuts,
 * and a product stack for texture / thinning / beard goal. `haircareStatus`
 * is the maintenance tracker's saved status (e.g. "beard").
 */
export function haircareMatches(
  report: AnalysisReport | null,
  profile: HaircareProfile | null,
  haircareStatus: { status?: string } | null,
): HaircareMatches {
  const shape = report?.shape ?? null;

  const scanTexture =
    report?.hair?.visible && report.hair.texture !== "unknown"
      ? (report.hair.texture as Exclude<HairTexture, "unknown">)
      : null;
  const profileTexture = profile?.hair_type
    ? mapProfileTexture(profile.hair_type)
    : null;
  const texture = scanTexture ?? profileTexture;

  let textureLabel: string | null = null;
  if (scanTexture && report?.hair) {
    textureLabel = hairTextureLabel(report.hair);
  } else if (profile?.hair_type) {
    textureLabel = profile.hair_type;
  }

  const colorLabel =
    report?.hair?.visible && report.hair.color !== "unknown"
      ? HAIR_COLOR_LABEL[report.hair.color]
      : null;

  const beardGoal =
    haircareStatus?.status === "beard" ||
    (profile?.goals ?? []).includes("Beard");

  const cuts = shape ? pickCuts(shape, texture) : [];
  const products = buildProducts(texture, beardGoal);

  return {
    hasScan: Boolean(report),
    shape,
    texture,
    textureLabel,
    colorLabel,
    cuts,
    products,
    beardGoal,
  };
}

function buildProducts(
  texture: Exclude<HairTexture, "unknown"> | "thinning" | null,
  beardGoal: boolean,
): ProductRec[] {
  const products: ProductRec[] = [];
  if (texture === "thinning") {
    products.push(...THINNING_PRODUCTS);
  } else if (texture) {
    products.push(...BASE_PRODUCTS, ...TEXTURE_PRODUCTS[texture]);
  } else {
    products.push(...BASE_PRODUCTS, ...FALLBACK_PRODUCTS);
  }
  if (beardGoal) products.push(...BEARD_PRODUCTS);
  return products.slice(0, 6);
}