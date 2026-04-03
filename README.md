# GDSpark Interpreter

Internal interpreter utilities for running GDSpark command flows in frontend applications.

## Installation

```bash
npm install @reiebenezer/gdspark-interpreter
```

## Package API

The package currently exposes these public entrypoints:

- `Interpreter` from `@reiebenezer/gdspark-interpreter`
- `generateFlights` from `@reiebenezer/gdspark-interpreter/scenario`
- shared types from `@reiebenezer/gdspark-interpreter/types`

## Basic Usage

```ts
import { Interpreter } from '@reiebenezer/gdspark-interpreter';
import type { TestConstraints } from '@reiebenezer/gdspark-interpreter/types';

const constraints: TestConstraints = {
  expectedANQuery: {
    dateOfFlight: new Date('2026-04-10'),
    origin: 'MNL',
    destination: 'CEB',
  },
  expectedPNR: {
    names: [],
    segments: [],
  },
};

const interpreter = Interpreter(constraints, 12345);
```

- The first argument is a `TestConstraints` object used by the interpreter flow.
- The second argument is an optional seed used to generate deterministic flight scenarios.

## Handling Commands

Pass raw command strings to `handleInput()`.

```ts
interpreter.handleInput('AN10APRMNLCEB');
interpreter.handleInput('SS1Y1');
interpreter.handleInput('NM1DELA CRUZ/JUAN MR');
interpreter.handleInput('APM09171234567');
interpreter.handleInput('APEjuan@example.com');
```

The interpreter parses each command internally and updates its reactive state.

## Listening For State Changes

Use `addListener()` to receive the latest displayed flights and PNR state whenever the interpreter changes.

```ts
const stopListening = interpreter.addListener(({ displayedFlights, pnr }) => {
  console.log('Flights:', displayedFlights);
  console.log('PNR:', pnr);
});
```

The listener receives:

- `displayedFlights`: `Flight[] | undefined`
- `pnr`: `PNR`

`addListener()` returns an unsubscribe function.

## Listening For Logs

Use `addLogListener()` to react to runtime warnings and validation errors.

```ts
const stopLogListener = interpreter.addLogListener((log) => {
  console.log(log.type, log.text);
});
```

The log payload has this shape:

```ts
interface Log {
  type: 'warn' | 'err' | 'info';
  text: string;
}
```

`addLogListener()` also returns an unsubscribe function.

## Scenario Utilities

If you need direct access to generated flights for debugging or UI previews, import `generateFlights()` from the scenario entrypoint.

```ts
import { generateFlights } from '@reiebenezer/gdspark-interpreter/scenario';

const flights = generateFlights(12345);
```

## Notes

- `ER` is not implemented yet.
- This package is intended for internal use with GDSpark.
