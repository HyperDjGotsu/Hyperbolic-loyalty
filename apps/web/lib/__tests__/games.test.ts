import { describe, it, expect } from 'vitest';
import { canonicalFavoriteGames, SELECTABLE_GAME_IDS } from '../games';

describe('canonicalFavoriteGames', () => {
  it('keeps known games in the order picked and drops duplicates', () => {
    expect(canonicalFavoriteGames(['pokemon', 'one_piece', 'pokemon'])).toEqual(['pokemon', 'one_piece']);
  });
  it('drops unknown and non-string entries', () => {
    expect(canonicalFavoriteGames(['pokemon', 'made_up_game', 7, null])).toEqual(['pokemon']);
  });
  it('limits to 8 by default', () => {
    expect(canonicalFavoriteGames(SELECTABLE_GAME_IDS)).toHaveLength(8);
    expect(canonicalFavoriteGames(SELECTABLE_GAME_IDS, 3)).toHaveLength(3);
  });
  it('returns an empty list for anything that is not a list', () => {
    expect(canonicalFavoriteGames(undefined)).toEqual([]);
    expect(canonicalFavoriteGames('pokemon')).toEqual([]);
  });
});
