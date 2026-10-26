import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { PopulationRow } from '../types'

type Props = { rows: PopulationRow[] }

export function AgeChart({ rows }: Props) {
  const data = rows.map((r) => ({ age: r.age, population: r.population }))
  if (data.length === 0) {
    return <p className="empty">No age data for this filter combination.</p>
  }
  return (
    <div className="chart">
      <h2>Age distribution</h2>
      <p className="chart-note">Population in thousands (&apos;000)</p>
      <ResponsiveContainer width="100%" height={320}>
        <BarChart data={data} margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="age" interval={0} angle={-35} textAnchor="end" height={70} />
          <YAxis />
          <Tooltip />
          <Bar dataKey="population" fill="#2563eb" name="Population ('000)" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
