export type Segment = {
  readonly id: string;
  readonly label: string;
  /** Relative weight. Larger = wider slice. Always > 0. */
  readonly weight: number;
  readonly color: string;
};

export type SliceGeometry = {
  readonly index: number;
  /** Degrees, 0 = 12 o'clock, increasing clockwise. */
  readonly startAngle: number;
  readonly endAngle: number;
  readonly midAngle: number;
  /** Fraction of the full wheel, 0..1 */
  readonly share: number;
};
