import { parse } from '@reiebenezer/gdspark-parser';
import ContextHandler from './context';
import { generateFlights } from './scenario';
import { handleCommand } from './interpreter';

async function main() {
  // ------------------------------------------------------------------------------------
  // PREPARE STATE
  // ------------------------------------------------------------------------------------

  /** Intialize the context */
  const context = ContextHandler();

  /** Initialize the scenario */
  console.log('Generating scenario...');
  const flights = generateFlights();
  
  process.stdout.write('> ');

  // Loop CLI
  for await (const line of console) {
    const command = parse(line);
    const index = context.addToCommandStack(command);

    console.log(command);
    handleCommand(command, context, flights);

    process.stdout.write('> ');
  }
}

main();
