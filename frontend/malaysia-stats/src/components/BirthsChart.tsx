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
import type { BirthModelResult } from '../birthModel'

type Props = {
  model: BirthModelResult | null
}

export function BirthsChart({ model }: Props) {
  if (!model || model.series.length === 0) {
    return (
      <p className="empty">
        Not enough overlapping births and parent-age data to train the model.
      </p>
    )
  }

  const data = model.series.map((p) => ({
    year: p.year,
    actual: p.actual,
    model: p.model,
  }))

  const kPerThousand = model.rate * 1000
  const trainLabel = `${model.trainYears[0]}–${model.trainYears[model.trainYears.length - 1]}`

  return (
    <div className="chart">
      <h2>Live births — actual vs model</h2>
      <p className="chart-note">
        Illustrative model: births ≈ population aged 20–39 × rate trained on {trainLabel}
        {' '}(~{kPerThousand.toFixed(1)} births per 1,000 people aged 20–39). Dashed line =
        model (backtest then forecast to 2030). Not official DOSM.
      </p>
      <ResponsiveContainer width="100%" height={320}>
        <LineChart data={data} margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="year" />
          <YAxis />
          <Tooltip
            formatter={(value: number | string, name: string) => [
              typeof value === 'number' ? Math.round(value).toLocaleString() : value,
              name,
            ]}
          />
          <Legend />
          <Line
            type="monotone"
            dataKey="actual"
            stroke="#2563eb"
            strokeWidth={2}
            dot={false}
            connectNulls={false}
            name="Actual births"
          />
          <Line
            type="monotone"
            dataKey="model"
            stroke="#c2410c"
            strokeWidth={2}
            strokeDasharray="6 4"
            dot={false}
            connectNulls={false}
            name="Model (illustrative)"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
