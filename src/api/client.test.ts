import { describe, expect, it, vi } from 'vitest';

// The client reads the sign-in token from Firebase, which a unit test has no use for.
vi.mock('@/lib/firebase', () => ({ idToken: async () => null }));
const { messageOf } = await import('./client');

describe('messageOf: what a person is told when a request fails', () => {
  it("uses the API's own sentence when it has one", () => {
    expect(messageOf(409, { detail: 'Picks for this lunch are closed.' })).toBe('Picks for this lunch are closed.');
    expect(messageOf(400, { cutoff_at: ['Pick a cutoff within the next 24 hours.'] })).toBe('Pick a cutoff within the next 24 hours.');
  });

  it("names the field when the framework's stock complaint doesn't", () => {
    expect(messageOf(400, { name: ['This field is required.'] })).toBe('Name is required.');
    expect(messageOf(400, { delivery_address: ['This field may not be blank.'] })).toBe('Delivery address may not be blank.');
    expect(messageOf(400, { quantity: ['Ensure this value is less than or equal to 20.'] })).toBe(
      'Quantity: Ensure this value is less than or equal to 20.',
    );
  });

  it('finds a complaint inside a nested form or a list', () => {
    expect(messageOf(400, { address: { lat: ["Give the address's latitude and longitude together."] } })).toBe(
      "Give the address's latitude and longitude together.",
    );
    expect(messageOf(400, { items: [{}, { dish_name: ['This field is required.'] }] })).toBe('Dish name is required.');
  });

  it('never shows a bare status code', () => {
    for (const status of [400, 403, 404, 409, 413, 429, 500, 502, 503]) {
      const message = messageOf(status, undefined);
      expect(message).not.toMatch(/\d{3}/);
      expect(message.length).toBeGreaterThan(20);
    }
    expect(messageOf(401, { detail: 'Authentication credentials were not provided.' })).toBe('Your sign-in has expired. Sign in again.');
  });
});
