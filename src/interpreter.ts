import {
  AIRPORTS,
  BOOKING_CLASS_CODES,
  MONTHS,
  type AirlineCode,
  type BookingClass,
  type City,
  type Flight,
  type FlightQueryParams,
  type PNRSegment,
  type SessionState,
  type Month,
  type PNRPassengerName,
  type StateUpdater,
  type TestDetails,
  type PNR,
  type Log,
  type StatusCode,
  RuntimeError,
  type Score,
} from './types';
import { generateFlights } from './scenario';
import { parse } from '@reiebenezer/gdspark-parser';
import type {
  AvailabilityCommand,
  Command,
  CommandCode,
  CancelSegmentCommand,
  NameCommand,
  ParsedCommand,
  PassengerEmailCommand,
  PassengerMobileCommand,
  SellSegmentCommand,
  TicketingLimitCommand,
  EndRecordCommand,
} from '@reiebenezer/gdspark-parser/types';
import { derived, effect, signal } from '@reiebenezer/ts-utils/signal';
import { calculateDate, isDateEqual } from './utils';

export default function GDSparkInterpreter(
  seed?: number,
  testDetails?: TestDetails,
) {
  const flights = generateFlights(seed);
  const log = signal<Log>();
  let scoreListener: ((score: Score) => void) | undefined = undefined;
  let commandsEntered = 0;

  // ------------------------------------------------------------------------------------
  // AN
  // ------------------------------------------------------------------------------------

  /**
   * Flight query paramerters (set using the AN command)
   * This exists as a secondary cross check for `filteredFlights[]`
   */
  const flightQueryParams = signal<FlightQueryParams>();

  /**
   * A filtered list of flights from `queryParams`
   *
   * The reason why this can be `undefined` is that there is a difference between a query returning zero values vs no filter at all.
   * Simply put, no filter = `undefined`, and filters that give 0 output = `[]`.
   */
  const displayedFlights = derived(() => {
    const params = flightQueryParams.get();

    if (!params) return undefined;

    return flights.filter(
      (f) =>
        params.dateOfFlight.getFullYear() === f.dateOfFlight.getFullYear() &&
        params.dateOfFlight.getMonth() === f.dateOfFlight.getMonth() &&
        params.dateOfFlight.getDate() === f.dateOfFlight.getDate() &&
        params.origin === f.origin &&
        params.destination === f.destination &&
        (!params.airlineBrandCode || params.airlineBrandCode === f.airlineCode),
    );
  }, [flightQueryParams]);

  // ------------------------------------------------------------------------------------
  // PNR
  // ------------------------------------------------------------------------------------
  const pnr = signal<PNR>({
    names: [],
    segments: [],
    email: undefined,
    mobile: undefined,
  });

  return {
    handleInput(commandString: string) {
      commandsEntered++;

      try {
        const command = parse(commandString);
        switch (command.code) {
          case 'AN':
            handleAN(command);
            break;

          case 'SS':
            handleSS(command);
            break;

          case 'NM':
            handleNM(command);
            break;

          case 'APM':
            handleAPM(command);
            break;

          case 'APE':
            handleAPE(command);
            break;

          case 'XE':
            handleXE(command);
            break;

          case 'TKTL':
            handleTKTL(command);
            break;

          case 'ER':
            handleER(command);
            break;

          case 'FXP':
          case 'FXB':
          case 'TTK':
        }
      } catch (error) {
        if (error instanceof RuntimeError)
          log.set({
            type: 'err',
            text: error.message,
          });
        else {
          throw error;
        }
      }
    },

    /** An effect that listens to changes in flight query params */
    onFlightQuery(
      fn: (params: FlightQueryParams, displayedFlights: Flight[]) => void,
    ) {
      return effect(() => {
        const params = flightQueryParams.get();
        const flights = displayedFlights.get();

        if (params && flights) fn(params, flights);
      }, [flightQueryParams]);
    },

    /** An effect that listens to changes in the PNR */
    onPNRUpdate(fn: (pnr: PNR) => void) {
      return effect(() => {
        const _pnr = pnr.get();
        if (_pnr) fn(_pnr);
      }, [pnr]);
    },

    addLogListener(fn: (log: Log) => void) {
      return effect(
        () => {
          const _log = log.get();
          if (_log) fn(_log);
        },
        [log],
        false,
      );
    },

    addListener(
      fn: (
        flights: Flight[],
        flightQueryParams?: FlightQueryParams,
        displayedFlights?: Flight[],
        pnr?: PNR,
      ) => void,
    ) {
      return effect(
        () =>
          fn(
            flights,
            flightQueryParams.get(),
            displayedFlights.get(),
            pnr.get(),
          ),
        [displayedFlights, pnr],
      );
    },

    onShowScore(fn: (score: Score) => void) {
      scoreListener = fn;

      return () => (scoreListener = undefined);
    },
  };

  // ------------------------------------------------------------------------------------
  // HANDLER FUNCTIONS
  // ------------------------------------------------------------------------------------

  function handleAN(command: AvailabilityCommand) {
    const dateOfFlight = calculateDate(
      command.travelMonth as Month,
      command.travelDay,
    );

    // Check if origin and destination are valid airport entries
    if (!AIRPORTS.includes(command.origin as City))
      throw new RuntimeError('Invalid Origin City');

    if (!AIRPORTS.includes(command.destination as City))
      throw new RuntimeError('Invalid Destination City');

    // ------------------------------------------------------------------------------------
    // UPDATE FLIGHT QUERY PARAMS
    // ------------------------------------------------------------------------------------
    flightQueryParams.set({
      dateOfFlight,
      origin: command.origin as City,
      destination: command.destination as City,
      airlineBrandCode: command.airlineBrandCode as AirlineCode,
    });
  }

  function handleSS(command: SellSegmentCommand) {
    const _displayedFlights = displayedFlights.get();

    // ------------------------------------------------------------------------------------
    // COMMAND CHECKS
    // ------------------------------------------------------------------------------------
    if (!BOOKING_CLASS_CODES.includes(command.bookingClass as BookingClass))
      throw new RuntimeError('Invalid booking class');

    if (!_displayedFlights)
      throw new RuntimeError(
        'Available flights not specified. Enter the AN command first before calling SS.',
      );

    if (
      command.flightNumber <= 0 ||
      command.flightNumber > _displayedFlights.length
    )
      throw new RuntimeError('Invalid segment selection');

    // We are trying to sell this segment
    const {
      airlineCode,
      flightNumber,
      booking,
      dateOfFlight,
      origin,
      destination,
    } = _displayedFlights[command.flightNumber - 1]!;

    // Check for status code
    let statusCode: StatusCode;

    if (booking[command.bookingClass as BookingClass] >= command.passengerCount)
      statusCode = 'HK';
    else {
      log.set({
        type: 'warn',
        text: 'Available seats is insufficient for selected booking class. Will mark as UC',
      });

      statusCode = 'UC';
    }

    pnr.update((prev) => {
      prev.segments.push({
        airlineCode,
        flightNumber,
        bookingClass: command.bookingClass as BookingClass,
        dateOfFlight,
        origin,
        destination,
        statusCode,
        passengerCount: command.passengerCount,
      });

      return { ...prev };
    });
  }

  function handleNM(command: NameCommand) {
    // Condense the name entries into one array
    pnr.update((prev) => {
      prev.names.push(...flattenNames(command));
      return { ...prev };
    });

    function flattenNames(command: NameCommand) {
      return command.entries.reduce((arr, n) => {
        if (n.count < 1)
          throw new RuntimeError(
            'Please specify a given name for the passenger',
          );

        for (const givenName of n.givenNames) {
          arr.push({
            surname: n.surname,
            givenName,
            title: command.title,
          });
        }

        return arr;
      }, [] as PNRPassengerName[]);
    }
  }

  function handleAPM(command: PassengerMobileCommand) {
    if (!/^09\d{9}$/.test(command.mobile))
      throw new RuntimeError(
        'Invalid mobile number. Use number format 09xxxxxxxxx',
      );

    pnr.update((prev) => {
      prev.mobile = command.mobile;
      return { ...prev };
    });
  }

  function handleAPE(command: PassengerEmailCommand) {
    if (!/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(command.email))
      throw new RuntimeError('Invalid email format');

    pnr.update((prev) => {
      prev.email = command.email;
      return { ...prev };
    });
  }

  function handleXE(command: CancelSegmentCommand) {
    if (
      command.lineNumber <= 0 ||
      command.lineNumber > pnr.get().segments.length
    )
      throw new RuntimeError('Invalid segment number');

    pnr.update((prev) => {
      prev.segments.splice(command.lineNumber - 1, 1);
      if (prev.segments.length === 0) {
        log.set({
          type: 'warn',
          text: 'No itinerary segments remaining after delete.',
        });
      }

      return { ...prev };
    });
  }

  function handleTKTL(command: TicketingLimitCommand) {
    const deadline = calculateDate(command.month as Month, command.day);

    pnr.update((prev) => {
      prev.ticketingDeadline = deadline;
      return { ...prev };
    });
  }

  function handleER(_command: EndRecordCommand) {
    // We evaluate here
    const finalPNR = pnr.get();
    const finalFlightQueryParams = flightQueryParams.get();

    // Do nothing if there are no test details
    if (!testDetails) return;

    /** Flight query score */
    const fqScore =
      finalFlightQueryParams ?
        (function compareFlightQuery() {
          let score = 0;

          /** The reason we manually check each param is to ensure that each parameter is correctly scored */

          if (
            isDateEqual(
              finalFlightQueryParams.dateOfFlight,
              testDetails.expectedANQuery.dateOfFlight,
            )
          ) {
            score++;
          }

          if (
            finalFlightQueryParams.origin === testDetails.expectedANQuery.origin
          ) {
            score++;
          }

          if (
            finalFlightQueryParams.destination ===
            testDetails.expectedANQuery.destination
          ) {
            score++;
          }

          if (
            testDetails.expectedANQuery.airlineBrandCode !== undefined &&
            finalFlightQueryParams.airlineBrandCode ===
              testDetails.expectedANQuery.airlineBrandCode
          ) {
            score++;
          }

          return score;
        })()
      : 0;

    const ssScore = (function compareSegments() {
      function simplifyPNRSegment(s: PNRSegment) {
        return `${s.airlineCode} ${s.flightNumber}-${s.bookingClass}-${s.dateOfFlight.toDateString()}-${s.origin}-${s.destination}-${s.passengerCount}`;
      }

      const expectedSegments = new Set(testDetails.expectedPNR.segments.map(simplifyPNRSegment));
      const enteredSegments = new Set(finalPNR.segments.map(simplifyPNRSegment));

      let score = 0;

      for (const ex of expectedSegments) {
        if (enteredSegments.has(ex)) score++;
      }

      return score;
    })();

    const nmScore = (function compareNames() {
      function simplifyName(n: PNRPassengerName) {
        return `${n.surname}/${n.givenName} ${n.title}`;
      }

      const expectedNames = new Set(testDetails.expectedPNR.names.map(simplifyName));
      const enteredNames = new Set(finalPNR.names.map(simplifyName));

      let score = 0;

      for (const ex of expectedNames) {
        if (enteredNames.has(ex)) score++;
      }

      return score;
    })();

    scoreListener?.({
      query: [fqScore, testDetails.expectedANQuery.airlineBrandCode ? 4 : 3],
      segments: [ssScore, testDetails.expectedPNR.segments.length],
      names: [nmScore, testDetails.expectedPNR.names.length],
      isCorrectEmail: testDetails.expectedPNR.email ? testDetails.expectedPNR.email === finalPNR.email : null,
      isCorrectMobile: testDetails.expectedPNR.mobile ? testDetails.expectedPNR.mobile === finalPNR.mobile : null,
      excessCommandDeduction: Math.max(0, commandsEntered - testDetails.minCommandsEntered),
    });
  }
}
