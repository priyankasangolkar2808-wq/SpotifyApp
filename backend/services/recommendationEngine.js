
const clamp = (value, min = 0, max = 1) =>
  Math.max(min, Math.min(max, value));

function getNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

// Convert "8A", "8B", or " 8A " into a standard Camelot key.
function normalizeCamelotKey(value) {
  if (typeof value !== "string") return null;

  const match = value.trim().toUpperCase().match(/^(1[0-2]|[1-9])\s*([AB])$/);

  if (!match) return null;

  return {
    number: Number(match[1]),
    letter: match[2],
  };
}

// Compare two keys using the Camelot wheel.
function getKeyScore(firstKey, secondKey) {
  const first = normalizeCamelotKey(firstKey);
  const second = normalizeCamelotKey(secondKey);

  // Missing or invalid keys should not receive a false penalty.
  if (!first || !second) return null;

  const difference = Math.abs(first.number - second.number);
  const wheelDistance = Math.min(difference, 12 - difference);
  const sameLetter = first.letter === second.letter;

  if (wheelDistance === 0 && sameLetter) return 1;
  if (wheelDistance === 0 && !sameLetter) return 0.85;
  if (wheelDistance === 1 && sameLetter) return 0.8;
  if (wheelDistance === 1 && !sameLetter) return 0.65;

  return 0.25;
}

// Return 1 for a perfect BPM match, decreasing as BPM differs.
function getBpmScore(firstBpm, secondBpm) {
  const first = getNumber(firstBpm);
  const second = getNumber(secondBpm);

  if (first === null || second === null || first <= 0 || second <= 0) {
    return null;
  }

  // Also consider double-time and half-time relationships.
  const differences = [
    Math.abs(first - second),
    Math.abs(first - second * 2),
    Math.abs(first * 2 - second),
  ];

  const difference = Math.min(...differences);

  return clamp(1 - difference / 30);
}

// Energy and valence should normally be between 0 and 1.
function getAttributeScore(firstValue, secondValue) {
  const first = getNumber(firstValue);
  const second = getNumber(secondValue);

  if (
    first === null ||
    second === null ||
    first < 0 ||
    first > 1 ||
    second < 0 ||
    second > 1
  ) {
    return null;
  }

  return 1 - Math.abs(first - second);
}

function calculateRecommendation(source, candidate) {
  const sourceAcoustic = source.acoustic || {};
  const candidateAcoustic = candidate.acoustic || {};

  const comparisons = [
    {
      name: "BPM",
      score: getBpmScore(sourceAcoustic.bpm, candidateAcoustic.bpm),
      weight: 0.30,
    },
    {
      name: "Camelot key",
      score: getKeyScore(
        sourceAcoustic.camelotKey,
        candidateAcoustic.camelotKey
      ),
      weight: 0.30,
    },
    {
      name: "Energy",
      score: getAttributeScore(
        sourceAcoustic.energy,
        candidateAcoustic.energy
      ),
      weight: 0.20,
    },
    {
      name: "Valence",
      score: getAttributeScore(
        sourceAcoustic.valence,
        candidateAcoustic.valence
      ),
      weight: 0.20,
    },
  ];

  // Renormalize weights if some audio features are unavailable.
  const available = comparisons.filter((item) => item.score !== null);
  const totalWeight = available.reduce((sum, item) => sum + item.weight, 0);

  if (totalWeight === 0) {
    return {
      score: 0,
      reasons: ["Not enough audio metadata to compare these tracks."],
      availableFeatures: 0,
    };
  }

  const weightedScore = available.reduce(
    (sum, item) => sum + item.score * item.weight,
    0
  );

  const score = Math.round((weightedScore / totalWeight) * 100);

  const reasons = available
    .filter((item) => item.score >= 0.75)
    .map((item) => {
      if (item.name === "BPM") return "Similar tempo";
      if (item.name === "Camelot key") return "Harmonically compatible key";
      if (item.name === "Energy") return "Similar energy level";
      return "Similar mood";
    });

  return {
    score,
    reasons:
      reasons.length > 0
        ? reasons
        : ["Best available match across the stored audio features."],
    availableFeatures: available.length,
  };
}

export function rankRecommendations(source, candidates, limit = 10) {
  return candidates
    .filter(
      (candidate) =>
        String(candidate._id) !== String(source._id)
    )
    .map((candidate) => {
      const result = calculateRecommendation(source, candidate);

      return {
        ...candidate.toObject(),
        recommendationScore: result.score,
        recommendationReasons: result.reasons,
        matchedFeatures: result.availableFeatures,
      };
    })
    .filter((track) => track.matchedFeatures > 0)
    .sort((a, b) => b.recommendationScore - a.recommendationScore)
    .slice(0, limit);
}
