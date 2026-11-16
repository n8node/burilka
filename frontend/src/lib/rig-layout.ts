// GLB equipment uses world-space coordinates (metres, Y up). Character GLBs
// are authored at their own origin and must be placed on the correct deck.
export const RIG_FLOOR_Y = 8.9;
export const DERRICK_FLOOR_Y = 33.12;

export const crewPlacement: Record<string, readonly [number, number, number]> = {
  "crew-driller": [-4.95, RIG_FLOOR_Y, -1.6],
  "crew-helper1": [-2, RIG_FLOOR_Y, 2.8],
  "crew-helper2": [1, RIG_FLOOR_Y, 4.7],
  "crew-derrick": [5.2, DERRICK_FLOOR_Y, 1.2],
  "crew-mechanic": [-8.6, 0, 8.4],
  "crew-mud": [5.2, 0, -9.8],
  "crew-electric": [-20.5, 0, -13.6],
  "crew-helperB": [2.5, 0, 12],
  "crew-mechB": [4, 0, 12],
  "crew-master": [-7.4, 0, 8.4],
  "crew-gti": [8, 0, 10],
  "crew-shift1": [-28, 0, 12],
  "crew-shift2": [-30, 0, 12],
  "crew-cook": [-103, 0, 23],
};

export const floorLevel = (position: readonly number[]) => {
  if (position[1] >= 30) return "derrick";
  if (position[1] >= RIG_FLOOR_Y - 0.5) return "rig-floor";
  return "ground";
};