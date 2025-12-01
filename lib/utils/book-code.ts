export function generateRandomAssumptionCode(): string {
  const number = Math.floor(Math.random() * 1_000_000)
  return number.toString().padStart(6, "0")
}
