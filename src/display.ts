import type { SellCommand } from '@reiebenezer/gdspark-parser/types';
import type { Flight } from './scenario';
import type { Context } from './context';

export function displayFlights(flights: Flight[]) {
  if (flights.length === 0) {
    console.log('No flights are available for that selection.');
    return;
  }

  flights.forEach((f, i) => {
    const bookingStr = Object.entries(f.booking)
      .map(([k, v]) => `${k}${v.toString().padEnd(2)}`)
      .join('    ');
    console.log(
      `${(i + 1).toString().padStart(2)}    ${f.airlineCode}    ${bookingStr}`,
    );
  });
}

export function displaySelectFlight(command: SellCommand) {
  const { bookingClass, flightNumber, passengerCount } = command;

  console.log(
    `Selected Flight ${flightNumber} for ${passengerCount} passenger(s) in booking class ${bookingClass}`,
  );
}

export function displayError(text: string, context: Context) {
  console.error(text);
  console.error('Saved data was:', context.getDebugString());
}