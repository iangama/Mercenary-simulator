import { isoNow } from '../lib/utils/id';
import type { GlobalGameState } from '../types/game';

export function simulateBaseAndPosts(state: GlobalGameState): GlobalGameState {
  const notes: string[] = [];

  const forward_posts = state.forward_posts
    .map((post) => {
      const node = state.map_nodes.find((entry) => entry.id === post.node_id);
      const region = state.regions.find((entry) => entry.id === node?.region_id);
      if (!node || !region) return post;

      const threat =
        (region.front_state === 'siege' ? 18 : region.front_state === 'conflict' ? 10 : region.front_state === 'tense' ? 4 : 0) +
        Math.max(0, region.rival_presence - 30) / 8 +
        Math.max(0, 50 - post.guard_rating) / 5;
      const damage = Math.round(threat - post.level * 3 - (post.specialty === 'military' ? 4 : 0));
      if (damage <= 0) return post;

      const integrity = Math.max(0, post.integrity - damage);
      const stashLoss = integrity === 0 ? Math.min(post.stash_supplies, 12) : Math.min(post.stash_supplies, Math.max(0, Math.floor(damage / 3)));
      if (damage >= 8) notes.push(`${node.name} post comes under pressure and loses ${stashLoss} supplies.`);
      if (integrity === 0) notes.push(`${node.name} forward post collapses under frontier pressure.`);

      return {
        ...post,
        integrity,
        stash_supplies: Math.max(0, post.stash_supplies - stashLoss),
        stash_medicine: Math.max(0, post.stash_medicine - (integrity === 0 ? 2 : 0)),
        stash_ammunition: Math.max(0, post.stash_ammunition - (integrity === 0 ? 3 : 0))
      };
    })
    .filter((post) => post.integrity > 0);

  const hqPressure = state.regions.reduce((max, region) => {
    const score =
      (region.front_state === 'siege' ? 4 : region.front_state === 'conflict' ? 3 : region.front_state === 'tense' ? 2 : 0) +
      (region.rival_presence > 55 ? 2 : 0);
    return Math.max(max, score);
  }, 0);

  const company =
    hqPressure >= 4
      ? {
          ...state.company,
          supplies: Math.max(0, state.company.supplies - 2),
          updated_at: isoNow()
        }
      : state.company;

  if (hqPressure >= 4) notes.push('Base logistics strain under war pressure and reserve supplies are diverted to hold the line.');

  return {
    ...state,
    company,
    forward_posts,
    chronicle: [...notes, ...state.chronicle].slice(0, 80)
  };
}
