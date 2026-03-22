/** 
 * Compares two dates if they're equal, regardless of time
 */
export function isDateEqual(dateA: Date, dateB: Date) {
  return (
    dateA.getFullYear() === dateB.getFullYear() &&
    dateA.getMonth() === dateB.getMonth() &&
    dateA.getDate()  === dateB.getDate()
  );
}