// Illustrative kg CO₂e/km assumptions, not locally calibrated measurements.
// Car assumes one occupant; bus is per passenger. Walking/cycling: direct operation only.
export const emissionFactors = { car: 0.171, bus: 0.097, walking: 0, cycling: 0 };
export type TransportMode = keyof typeof emissionFactors;
export function estimateEmissions(distanceKm: number, factorKgPerKm: number): number {
  if (!Number.isFinite(distanceKm) || !Number.isFinite(factorKgPerKm) || distanceKm < 0 || factorKgPerKm < 0) throw new Error('Distance and emissions factor must be finite and non-negative.');
  return distanceKm * factorKgPerKm;
}
