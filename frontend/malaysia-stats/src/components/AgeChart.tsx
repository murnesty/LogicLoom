import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { PARENT_AGE_BANDS } from '../birthModel'
import type { PopulationRow } from '../types'

const PARENT = new Set<string>(PARENT_AGE_BANDS)

type Props = {
  rows: PopulationRow[]
  title?: string
  note?: string
  highlightParentAge?: boolean
}

export function AgeChart({
  rows,
  title = 'Age distribution',
  note = "Population in thousands ('000)",
  highlightParentAge = false,
}: Props) {
  const data = rows.map((r) => ({ age: r.age, population: r.population }))
  if (data.length === 0) {
    return <p className="empty">No age data for this filter combination.</p>
  }
  return (
    <div className="chart">
      <h2>{title}</h2>
      <p className="chart-note">
        {note}
        {highlightParentAge ? ' · Orange bars = ages 20–39 (parent-age window for the birth model).' : ''}
      </p>
      <ResponsiveContainer width="100%" height={320}>
        <BarChart data={data} margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="age" interval={0} angle={-35} textAnchor="end" height={70} />
          <YAxis />
          <Tooltip />
          <Bar dataKey="population" name="Population ('000)">
            {data.map((d) => (
              <Cell
                key={d.age}
                fill={
                  highlightParentAge && PARENT.has(d.age) ? '#c2410c' : '#2563eb'
                }
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
