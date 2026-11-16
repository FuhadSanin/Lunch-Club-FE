// Everyone this browser knows by id: the demo team, plus the people the API has sent so far. Screens
// look a name up here (personById) wherever they only hold an id. In memory only.

import type { Person } from '@/model';
import { PEOPLE } from './demo';

// People from the API join the demo team here. Their ids are UUIDs, so they never clash with the demo's.
const known = new Map<string, Person>();
export const rememberPeople = (people: Person[]) => people.forEach((p) => known.set(p.id, p));
export const personById = (id: string) => PEOPLE.find((p) => p.id === id) ?? known.get(id);

// A stable tint for someone the demo doesn't know, from their id.
export const hueOf = (id: string) => [...id].reduce((h, ch) => (h * 31 + ch.charCodeAt(0)) % 360, 7);
