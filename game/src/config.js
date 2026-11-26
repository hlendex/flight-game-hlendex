// AERORIDGE — tuning numbers, palette and mission definitions.
// Every magic number the flight model, world and missions share lives here
// so a balance change is one edit, never a hunt through the code.

/** The simulation's fixed step, in seconds: 60 updates a second. */
export const STEP = 1 / 60;

/** World dimensions in metres. The island is a disc of land in an ocean. */
export const WORLD = {
  size: 2600, // terrain plane spans -1300..1300 on x and z
  islandRadius: 1050, // land fades into sea beyond this radius
  seaLevel: 0,
  mountainHeight: 260, // tallest peak
  hillHeight: 90,
};

/** The runway: a flat strip the terrain is pressed down to meet. */
export const RUNWAY = {
  centerX: 0,
  centerZ: 420,
  headingDeg: 0, // runway points north (-z)
  length: 420,
  width: 34,
  altitude: 6, // terrain height at the strip
};

/** Where the plane starts: parked on the runway threshold, facing north. */
export const SPAWN = {
  x: 0,
  y: RUNWAY.altitude + 1.6,
  z: RUNWAY.centerZ + 150,
  headingDeg: 0,
};

export const PLANE = {
  cruiseSpeed: 42, // m/s at full throttle, level flight
  maxSpeed: 68,
  stallSpeed: 15, // below this the nose drops on its own
  minSpeed: 8,
  accel: 14, // m/s^2 at full throttle
  drag: 0.055, // quadratic drag coefficient
  rollRate: 2.4, // rad/s toward the target bank
  maxBankDeg: 55,
  pitchRate: 1.5, // rad/s
  maxPitchDeg: 38,
  climbBleed: 9.8, // gravity component along the flight path
  turnCoordination: 1.0, // banking induces yaw this strongly
  gearHeight: 1.6, // wheels touch the ground at this height above terrain
  crashDescent: 9, // m/s downward at touchdown = a crash
  crashSpeed: 55, // m/s sideways into terrain = a crash
};

export const FUEL = {
  capacity: 100,
  burnPerSecond: 0.55, // at full throttle
  burnIdle: 0.12,
  lowWarning: 25,
};

export const RINGS = {
  count: 10,
  radius: 10, // fly-through ring radius in metres
  tube: 1.1,
  minAltitude: 35,
  maxAltitude: 190,
};

export const MISSIONS = {
  ringRush: {
    id: 'ring-rush',
    title: 'RING RUSH',
    blurb: 'Fly all 10 rings, then land on the runway before the fuel runs out.',
    timeLimit: 300, // seconds
    ringPoints: 100,
    timeBonusPerSecond: 2,
    landingBonus: 250,
  },
  landing: {
    id: 'precision-landing',
    title: 'PRECISION LANDING',
    blurb: 'Take off, fly the circuit, and grease the landing on the centreline.',
    timeLimit: 300,
    ringPoints: 0,
    landingBonus: 500,
  },
  free: {
    id: 'free-flight',
    title: 'FREE FLIGHT',
    blurb: 'No timer, no fuel pressure. Explore the island.',
    timeLimit: 0,
    ringPoints: 50,
    landingBonus: 0,
  },
};

/** Scoring for a landing: how the touchdown is graded. */
export const LANDING_SCORE = {
  perfectDescent: 2.5, // m/s or less: full marks
  hardDescent: 9, // m/s: zero marks
  perfectSpeed: 24, // m/s touchdown speed: full marks
  fastSpeed: 45,
  centrelineFull: 4, // metres off centreline: full marks
  centrelineZero: 17,
};

export const PALETTE = {
  skyTop: 0x2f6fd0,
  skyHorizon: 0xbfd9ee,
  sun: 0xfff2c8,
  sea: 0x1d6f8e,
  seaDeep: 0x14506a,
  sand: 0xe8d29a,
  grass: 0x5da24a,
  grassDark: 0x3f7a37,
  rock: 0x8a7f74,
  snow: 0xf2f5f7,
  forest: 0x2e6b2f,
  trunk: 0x6b4a2b,
  runway: 0x3a3f46,
  runwayMark: 0xf5f5f0,
  planeBody: 0xff7a2f, // sunset orange
  planeCream: 0xfff3dd,
  planeDark: 0x2b2f36,
  ringNext: 0xffb020, // amber: the ring to fly through now
  ringDone: 0x37d67a, // green: flown through
  ringLater: 0x7fb4d8, // pale blue: waiting its turn
  hud: '#7df9ff',
  hudAmber: '#ffb020',
  hudRed: '#ff5252',
};

export const FONT = 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';
