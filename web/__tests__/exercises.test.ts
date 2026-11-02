import { describe, it, expect } from 'vitest';
import { EXERCISES, grade } from '../lib/content/exercises';

describe('Practice exercises', () => {
  for (const ex of EXERCISES) {
    it(`reference solution grades correct: ${ex.slug}`, () => {
      expect(grade(ex, ex.solution)).toEqual({ ok: true });
    });

    it(`unfilled starter does not pass: ${ex.slug}`, () => {
      expect(grade(ex, ex.starter).ok).toBe(false);
    });

    it(`defines its target variable: ${ex.slug}`, () => {
      // the solution must actually produce the graded variable
      expect(ex.solution.includes(ex.target)).toBe(true);
    });
  }

  it('fails gracefully on a runtime error', () => {
    const g = grade(EXERCISES[0], 'out = undefined_thing');
    expect(g.ok).toBe(false);
    expect(typeof g.reason).toBe('string');
  });
});
