/**
 * FIFA World Cup 2026 host venues (subset of the 16 official stadiums)
 * with operational metadata used for grounded assistant responses.
 *
 * Data is illustrative for demonstration and testing purposes.
 */

export const venues = [
  {
    id: 'metlife',
    name: 'MetLife Stadium',
    city: 'New York / New Jersey',
    country: 'USA',
    capacity: 82500,
    role: 'Final venue',
    transit: [
      'NJ Transit rail to Meadowlands Station (event service)',
      'Coach USA bus 351 from Port Authority',
      'Designated rideshare pickup at Lot G',
    ],
    accessibility: [
      'Step-free access at all main gates',
      'Accessible seating on every level',
      'Sensory room near Section 112',
      'Assistive listening devices at Guest Services',
    ],
    parking: ['Accessible parking in Lots A, C, and G (permit required)'],
    gates: ['A', 'B', 'C', 'D'],
  },
  {
    id: 'sofi',
    name: 'SoFi Stadium',
    city: 'Los Angeles',
    country: 'USA',
    capacity: 70000,
    role: 'Group stage & knockout',
    transit: [
      'Metro C Line to Hawthorne/Lennox then shuttle',
      'Event shuttles from Intuit Dome lots',
      'Rideshare zone on Prairie Avenue',
    ],
    accessibility: [
      'Fully step-free concourses',
      'Companion seating available',
      'Wheelchair escort service from transit drop-off',
    ],
    parking: ['Accessible parking in the Pink and Green lots'],
    gates: ['1', '2', '3', '4', '5'],
  },
  {
    id: 'azteca',
    name: 'Estadio Azteca',
    city: 'Mexico City',
    country: 'Mexico',
    capacity: 87000,
    role: 'Opening match venue',
    transit: [
      'Tren Ligero to Estadio Azteca station',
      'Metro Line 2 to Tasqueña then Tren Ligero',
      'Official fan buses from Zócalo',
    ],
    accessibility: [
      'Accessible ramps at Puerta 3 and Puerta 7',
      'Reserved accessible seating in lower ring',
      'Bilingual accessibility stewards',
    ],
    parking: ['Accessible parking at Estacionamiento Sur'],
    gates: ['1', '3', '5', '7', '9'],
  },
  {
    id: 'bmo',
    name: 'BMO Field',
    city: 'Toronto',
    country: 'Canada',
    capacity: 45000,
    role: 'Group stage',
    transit: [
      'TTC 509 Harbourfront streetcar to Exhibition Loop',
      'GO Transit to Exhibition Station',
      'Bike Share Toronto docks at Princes Boulevard',
    ],
    accessibility: [
      'Step-free entry at the East and West stands',
      'Accessible washrooms on all concourses',
      'Quiet zone available on request',
    ],
    parking: ['Accessible parking at the Enercare Centre lot'],
    gates: ['1', '2', '3', '4'],
  },
];

/** Fast id lookup map. */
export const venueById = new Map(venues.map((v) => [v.id, v]));

/**
 * Find a venue by fuzzy matching name, city, or id within free text.
 * @param {string} text
 * @returns {object|null}
 */
export function findVenue(text) {
  if (!text) return null;
  const lower = text.toLowerCase();
  for (const v of venues) {
    if (
      lower.includes(v.id) ||
      lower.includes(v.name.toLowerCase()) ||
      lower.includes(v.city.toLowerCase())
    ) {
      return v;
    }
  }
  return null;
}
