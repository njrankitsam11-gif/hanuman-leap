import type { ObstacleKindId } from "./chapters/types";

export type KindDef = {
  name: string;
  top: string;
  bottom: string;
  /** Which drawer renders it. */
  style: "column" | "rakshasa";
  /** Vertical sway amplitude of the gap, ·H. */
  sway?: number;
  /** Extra punya on top of the chapter's pass value. */
  bonus?: number;
  /** A boss ends its chapter when passed. */
  boss?: boolean;
};

export const KINDS: Record<ObstacleKindId, KindDef> = {
  cloud: { name: "Cloud", top: "#f4ecdf", bottom: "#b9ab97", style: "column" },
  wave: { name: "Wave", top: "#2b8a9b", bottom: "#134650", style: "column" },
  mainaka: { name: "Mainaka", top: "#8a5a2b", bottom: "#5a3617", style: "column" },
  surasa: { name: "Surasa", top: "#7b2d4a", bottom: "#4a1529", style: "column" },
  simhika: { name: "Simhika", top: "#2f5d63", bottom: "#163036", style: "column" },
  rakshasa: {
    name: "Rakshasa",
    top: "#5b1620",
    bottom: "#2a070c",
    style: "rakshasa",
    sway: 0.152,
    bonus: 15,
  },
  lankini: {
    name: "Lankini",
    top: "#4a2a6b",
    bottom: "#1f0f33",
    style: "rakshasa",
    sway: 0.196,
    bonus: 100,
    boss: true,
  },
  tree: { name: "Ashoka", top: "#4f7d35", bottom: "#22401a", style: "column" },
  tower: { name: "Tower", top: "#d4a54a", bottom: "#7a5518", style: "column", bonus: 15 },
};
