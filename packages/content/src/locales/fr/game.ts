import type { ItemKind, UnitType } from "@code-royale/engine";
import type { GoalText, ItemText, UnitText } from "../../types";

export const goals: GoalText = {
  win: "Gagne la bataille",
  survivors: (count) => `Gagne avec au moins ${count} combattants en vie`,
  flawless: "Personne de ton équipe ne tombe",
  battleCry: "Fais pousser un cri de guerre à un chevalier (indice 1)",
  waves: (count) => `Survis à ${count} vagues`,
};

export const units: Record<UnitType, UnitText> = {
  knight: {
    name: "Chevalier",
    description: "Un dur à cuire du corps à corps. Il s'approche et frappe fort.",
    special: { name: "Tourbillon", description: "Tourne sur lui-même et frappe très fort tous les ennemis proches." },
  },
  archer: {
    name: "Archer",
    description: "Tire des flèches de loin, mais il est fragile de près.",
    special: { name: "Tir puissant", description: "Une flèche géante qui traverse tout le monde sur son passage." },
  },
  scout: {
    name: "Éclaireur",
    description: "Super rapide, avec le plus grand rayon de détection. Il repère même de loin les ennemis cachés dans les buissons !",
    special: { name: "Bombe fumigène", description: "Disparaît dans un nuage de fumée : invisible et encore plus rapide pendant 3 secondes. Attaquer annule l'effet." },
  },
  mage: {
    name: "Mage",
    description: "Lance des boules de feu qui brûlent aussi les ennemis autour.",
    special: { name: "Météore", description: "Fait tomber un météore géant sur un endroit." },
  },
  goblin: {
    name: "Gobelin",
    description: "Petit, rapide et sournois.",
    special: { name: "Frénésie", description: "Se met en colère et attaque très vite pendant un moment." },
  },
  ogre: {
    name: "Ogre",
    description: "Un géant. Lent, mais chaque coup fait très mal.",
    special: { name: "Piétinement", description: "Piétine le sol et blesse tout le monde autour." },
  },
};

export const items: Record<ItemKind, ItemText> = {
  potion: { name: "Potion", description: "Rend 60 points de vie." },
  rage: { name: "Gemme de rage", description: "Double les dégâts pendant 8 secondes." },
  shield: { name: "Orbe bouclier", description: "Bloque les 60 prochains points de dégâts." },
};
