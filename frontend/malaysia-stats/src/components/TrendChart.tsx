import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { PopulationRow } from '../types'

type Props = { rows: PopulationRow[] }

export function TrendChart({ rows }: Props) {
  const data = rows.map((r) => ({
    year: Number(r.date.slice(0, 4)),
    population: r.population,
  }))
  if (data.length === 0) {
    return <p className="empty">No trend data for this filter combination.</p>
  }
  return (
    <div className="chart">
      <h2>Population over time</h2>
      <p className="chart-note">Total population in thousands (&apos;000)</p>
      <ResponsiveContainer width="100%" height={280}>
        <LineChart data={data} margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="year" />
          <YAxis />
          <Tooltip />
          <Line
            type="monotone"
            dataKey="population"
            stroke="#0f766e"
            strokeWidth={2}
            dot={false}
            name="Population ('000)"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
