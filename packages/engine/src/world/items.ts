/** Items system: scheduled appearances and pick-ups (potion, rage gem, shield orb). */
import { ITEM_RADIUS } from "../rules";
import { heal } from "./combat";
import type { World } from "./state";

/** Puts on the ground every scheduled item whose time has come. */
export function dropScheduledItems(w: World, time: number) {
  while (w.itemQueue.length && w.itemQueue[0].at <= time) {
    const s = w.itemQueue.shift()!;
    w.items.push({ id: w.newId(), kind: s.kind, x: s.x, y: s.y });
  }
}

/** The first fighter touching an item picks it up. */
export function pickupItems(w: World) {
  if (!w.items.length) return;
  w.items = w.items.filter((it) => {
    const u = w.units.find((u) => u.alive && Math.hypot(u.x - it.x, u.y - it.y) <= u.radius + ITEM_RADIUS);
    if (!u) return true;
    if (it.kind === "potion") heal(w, u, 60);
    else if (it.kind === "rage") u.rageT = 8;
    else u.shield = 60;
    w.events.push({ k: "pickup", id: u.id, item: it.kind, x: it.x, y: it.y });
    return false;
  });
}
