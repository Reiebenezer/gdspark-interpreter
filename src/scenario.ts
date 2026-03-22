import { createRNG, type Seeder } from '@reiebenezer/ts-utils/random';

export function generateFlights(seed?: number) {
  const seeder = createRNG(seed);

  const numberOfFlights = seeder.nextFromIntRange(10, 200);
  const flights: Flight[] = [];

  for (let i = 0; i < numberOfFlights; i++) {
    flights.push(generateRandomFlightDetails(seeder));
  }

  return flights;
}

export function generateRandomFlightDetails(seeder: Seeder): Flight {
  const dayDurationInMs = 1000 * 60 * 60 * 24;

  const airlineCode = seeder.pickFrom(AIRLINE_IATA_CODES);
  const dateOfFlight = seeder.nextDate(
    new Date(),
    new Date(Date.now() + dayDurationInMs * 5),
  );
  const from = seeder.pickFrom(AIRPORTS);
  const to = seeder.pickFrom(AIRPORTS.filter((c) => c !== from)); // filtered to ensure that there is no same from-to city
  const seats: Flight['booking'] = {
    F: seeder.nextFromIntRange(0, 10),
    J: seeder.nextFromIntRange(0, 10),
    C: seeder.nextFromIntRange(0, 10),
    W: seeder.nextFromIntRange(0, 10),
    N: seeder.nextFromIntRange(0, 10),
    Y: seeder.nextFromIntRange(0, 10),
    L: seeder.nextFromIntRange(0, 10),
    Q: seeder.nextFromIntRange(0, 10),
    V: seeder.nextFromIntRange(0, 10),
    O: seeder.nextFromIntRange(0, 10),
  };

  return {
    airlineCode,
    dateOfFlight,
    from,
    to,
    booking: seats,
  };
}

// ------------------------------------------------------------------------------------
// Types
// ------------------------------------------------------------------------------------
const AIRLINE_IATA_CODES = [
  'PR', // Philippine Airlines
  '5J', // Cebu Pacific
  'Z2', // Air Asia Philippines
  '2P', // PAL Express
  'DG', // CebGo
  'T6', // Airswift
] as const; // ICAO

const AIRPORTS = [
  'MNL', // Ninoy Aquino International Airport
  'CEB', // Mactan-Cebu International Airport
  'ILO', // Iloilo International Airport
  'CRK', // Clark International Airport
  'DVO', // Francisco Bangoy International Airport (Davao)
  'PPS', // Puerto Princesa National Airport
  'MPH', // Godofredo P. Ramos Airport (Caticlan/Boracay)
  'KLO', // Kalibo International Airport
  'ZBO', // Zamboanga Airport
  'BCD', // Bacolod-Silay International Airport
] as const;

/** This set of flight classes is a trimmed-down version of the Philippine Airlines (PAL) list of Booking Class Codes (BCCs) */
export const BOOKING_CLASS_CODES = [
  // ------------------------------------------------------------------------------------
  // FIRST CLASS
  // ------------------------------------------------------------------------------------
  'F',

  // ------------------------------------------------------------------------------------
  // BUSINESS CLASS
  // ------------------------------------------------------------------------------------
  'J',
  'C',

  // ------------------------------------------------------------------------------------
  // ECONOMY PREMIUM (Upgrades or premium seating)
  // ------------------------------------------------------------------------------------
  'W',
  'N',

  // ------------------------------------------------------------------------------------
  // ECONOMY FLEX (100% accrual, lower change fees)
  // ------------------------------------------------------------------------------------
  'Y',
  'L',

  // ------------------------------------------------------------------------------------
  // ECONOMY DISCOUNTED/SAVER (lower accrual, higher fees, no baggage)
  // ------------------------------------------------------------------------------------
  'Q',
  'V',
  'O',
] as const;

export type AirlineCode = (typeof AIRLINE_IATA_CODES)[number];
export type City = (typeof AIRPORTS)[number];
export type BookingClass = (typeof BOOKING_CLASS_CODES)[number];

export interface Flight {
  airlineCode: AirlineCode;
  dateOfFlight: Date;
  from: City;
  to: City;
  booking: Record<BookingClass, number>;
}
