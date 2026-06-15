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

export function MovingTrains({ lines, colorForLine }: MovingTrainsProps) {
  const metroLines = lines.filter((line) => line.kind === "metro" && !line.noPage).slice(0, 7);

  return (
    <g className="map-trains" aria-hidden="true" pointerEvents="none">
      {metroLines.map((line, index) => {
        const schedule = motionSchedule(line.id, index % 2 === 1);
        return (
          <g key={line.id} className="map-train">
            <rect
              x={-7}
              y={-2.8}
              width={14}
              height={5.6}
              rx={2.8}
              fill={`var(--${colorForLine(line)})`}
              stroke="var(--map-bg)"
              strokeWidth={1.2}
              vectorEffect="non-scaling-stroke"
            />
            <rect
              x={-3.8}
              y={-1.15}
              width={5.8}
              height={2.3}
              rx={0.8}
              fill="var(--map-station-fill)"
              fillOpacity={0.72}
            />
            <circle cx={4.6} cy={0} r={0.9} fill="var(--map-station-fill)" />
            <animateMotion
              path={line.pathD}
              dur={`${30 + index * 3}s`}
              begin={`${-(index + 1) * 4}s`}
              repeatCount="indefinite"
              rotate="auto"
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
