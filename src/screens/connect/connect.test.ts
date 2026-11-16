import { describe, expect, it } from 'vitest';
import { ALL_TOOLS, PROMPTS, TOOL_GROUPS } from './assistant-tools';
import { EXAMPLES } from './what-to-say';

describe('what an assistant can do', () => {
  it('lists every tool once, under one group', () => {
    const names = ALL_TOOLS.map((t) => t.name);
    expect(new Set(names).size).toBe(names.length);
    expect(names.length).toBe(26); // the API repo's mcp_server/server.py has 26 tools: change both together
    TOOL_GROUPS.forEach((g) => expect(g.tools.length).toBeGreaterThan(0));
  });

  it('asks first before anything that is hard to undo', () => {
    const asksFirst = ALL_TOOLS.filter((t) => t.asksFirst).map((t) => t.name);
    expect(asksFirst.sort()).toEqual(['cancel_lunch', 'confirm_lunch', 'delete_local_menu']);
  });

  it('describes every tool and prompt in words, not code', () => {
    [...ALL_TOOLS, ...PROMPTS].forEach((t) => {
      expect(t.name).toMatch(/^[a-z]+(_[a-z]+)*$/);
      expect(t.does.length).toBeGreaterThan(10);
    });
  });
});

describe('the examples', () => {
  it('only use tools that exist', () => {
    const known = new Set(ALL_TOOLS.map((t) => t.name));
    EXAMPLES.forEach((e) => e.tools.forEach((t) => expect(known.has(t), `${e.id} uses ${t}`).toBe(true)));
  });

  it('each has a sentence to say, an answer, a caption and a picture size', () => {
    expect(new Set(EXAMPLES.map((e) => e.id)).size).toBe(EXAMPLES.length);
    EXAMPLES.forEach((e) => {
      [e.say, e.reply, e.seen, e.alt].forEach((text) => expect(text.trim().length).toBeGreaterThan(10));
      expect(e.size.w).toBeGreaterThan(0);
      expect(e.size.h).toBeGreaterThan(0);
    });
  });
});
