import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

export type DecadeComparePoint = {
  year: number
  actualBirths: number | null
  modelBirths: number | null
  marriages: number | null
  marriageRate: number | null
}

type Props = {
  points: DecadeComparePoint[]
  decadeLabel: string
}

export function DecadeCompareChart({ points, decadeLabel }: Props) {
  if (points.length === 0) {
    return <p className="empty">No births/marriage rows for {decadeLabel}.</p>
  }

  return (
    <div className="chart">
      <h2>{decadeLabel}: births vs model · marriages</h2>
      <p className="chart-note">
        Solid blue = actual births · Dashed orange = parent-age model · Green =
        registered marriages (count). Use the gap between blue and orange to see
        where the simple model misses reality (timing, marriage, fertility change).
      </p>
      <ResponsiveContainer width="100%" height={320}>
        <LineChart data={points} margin={{ top: 8, right: 12, left: 8, bottom: 8 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="year" />
          <YAxis yAxisId="left" />
          <YAxis yAxisId="right" orientation="right" />
          <Tooltip
            formatter={(value: number | string, name: string) => [
              typeof value === 'number' ? Math.round(value).toLocaleString() : value,
              name,
            ]}
          />
          <Legend />
          <Line
            yAxisId="left"
            type="monotone"
            dataKey="actualBirths"
            stroke="#2563eb"
            strokeWidth={2}
            dot={false}
            connectNulls={false}
            name="Actual births"
          />
          <Line
            yAxisId="left"
            type="monotone"
            dataKey="modelBirths"
            stroke="#c2410c"
            strokeWidth={2}
            strokeDasharray="6 4"
            dot={false}
            connectNulls={false}
            name="Model births"
          />
          <Line
            yAxisId="right"
            type="monotone"
            dataKey="marriages"
            stroke="#15803d"
            strokeWidth={2}
            dot={false}
            connectNulls={false}
            name="Marriages"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
