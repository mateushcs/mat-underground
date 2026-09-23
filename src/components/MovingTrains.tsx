import { orderedStopsForLine } from "@/lib/lineStations";
import type { Line } from "@/data/transit";

interface MovingTrainsProps {
  lines: Line[];
  colorForLine: (line: Line) => string;
}

function motionSchedule(lineId: string, reverse: boolean) {
  const stopPositions = orderedStopsForLine(lineId)
    .map((stop) => Math.max(0, Math.min(1, stop.t)))
    .filter((position, index, positions) => index === 0 || position - positions[index - 1] > 0.01);
  const forward = [0, ...stopPositions.filter((position) => position > 0.01 && position < 0.99), 1];
  const positions = reverse ? forward.map((position) => 1 - position).reverse() : forward;
  const dwell = 0.022;
  const points: number[] = [positions[0]];
  const rawTimes: number[] = [0];
  let elapsed = 0;

  for (let index = 1; index < positions.length; index++) {
    elapsed += Math.abs(positions[index] - positions[index - 1]);
    points.push(positions[index]);
    rawTimes.push(elapsed);
    if (index < positions.length - 1) {
      elapsed += dwell;
      points.push(positions[index]);
      rawTimes.push(elapsed);
    }
  }

  return {
    keyPoints: points.join(";"),
    keyTimes: rawTimes.map((time) => (time / elapsed).toFixed(4)).join(";"),
  };
}

// Data packets per line: [duration s, start offset s, reverse].
const PACKETS: [number, number, boolean][] = [
  [11, 0, false],
  [14, 6, true],
];

/**
 * Trains plus sci-fi "data packets": small glowing squares with a light trail,
 * streaming along each coloured line. Driven by SMIL animateMotion, so only the
 * small moving boxes repaint (no full-line dash animation).
 */
export function MovingTrains({ lines, colorForLine }: MovingTrainsProps) {
  const metroLines = lines.filter((line) => line.kind === "metro" && !line.noPage).slice(0, 7);

  return (
    <g className="map-trains" aria-hidden="true" pointerEvents="none">
      <defs>
        {metroLines.map((line) => (
          <linearGradient key={line.id} id={`trail-${line.id}`} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor={`var(--${colorForLine(line)})`} stopOpacity="0" />
            <stop offset="1" stopColor={`var(--${colorForLine(line)})`} stopOpacity="0.9" />
          </linearGradient>
        ))}
      </defs>

      {metroLines.map((line, index) =>
        PACKETS.map(([dur, offset, reverse], p) => (
          <g key={`${line.id}-packet-${p}`} className="map-packet">
            <rect x={-4.5} y={-4.5} width={9} height={9} fill="#ffffff" opacity={0.12} />
            <rect x={-16} y={-0.7} width={15} height={1.4} fill={`url(#trail-${line.id})`} />
            <rect x={-1.6} y={-1.6} width={3.2} height={3.2} fill="#ffffff" />
            <rect x={-2.6} y={-2.6} width={5.2} height={5.2} fill="none" stroke={`var(--${colorForLine(line)})`} strokeWidth={0.6} />
            <animateMotion
              path={line.pathD}
              dur={`${dur + index * 0.7}s`}
              begin={`${-(offset + index * 1.9)}s`}
              repeatCount="indefinite"
              rotate={reverse ? "auto-reverse" : "auto"}
              keyPoints={reverse ? "1;0" : "0;1"}
              keyTimes="0;1"
              calcMode="linear"
            />
          </g>
        )),
      )}

      {metroLines.map((line, index) => {
        const schedule = motionSchedule(line.id, index % 2 === 1);
        const color = `var(--${colorForLine(line)})`;
        return (
          <g key={line.id} className="map-train">
            {/* Light trail */}
            <rect x={-26} y={-1.4} width={19} height={2.8} fill={`url(#trail-${line.id})`} opacity={0.55} />
            <rect
              x={-7}
              y={-2.8}
              width={14}
              height={5.6}
              rx={0.8}
              fill={color}
              stroke="var(--map-bg)"
              strokeWidth={1.2}
              vectorEffect="non-scaling-stroke"
            />
            <rect
              x={-3.8}
              y={-1.15}
              width={5.8}
              height={2.3}
              fill="var(--map-station-fill)"
              fillOpacity={0.72}
            />
            {/* Headlight */}
            <rect className="map-train-light" x={4} y={-1} width={2} height={2} fill="#ffffff" />
            <animateMotion
              path={line.pathD}
              dur={`${30 + index * 3}s`}
              begin={`${-(index + 1) * 4}s`}
              repeatCount="indefinite"
              // Odd trains run the schedule backwards: face their travel direction.
              rotate={index % 2 === 1 ? "auto-reverse" : "auto"}
              calcMode="linear"
              keyPoints={schedule.keyPoints}
              keyTimes={schedule.keyTimes}
            />
          </g>
        );
      })}
    </g>
  );
}
