export type AppTab = 'population' | 'births'

type Props = {
  tab: AppTab
  onTab: (tab: AppTab) => void
}

export function TabBar({ tab, onTab }: Props) {
  return (
    <div className="tabs" role="tablist" aria-label="Malaysia Stats views">
      <button
        type="button"
        role="tab"
        aria-selected={tab === 'population'}
        className={tab === 'population' ? 'tab active' : 'tab'}
        onClick={() => onTab('population')}
      >
        Population
      </button>
      <button
        type="button"
        role="tab"
        aria-selected={tab === 'births'}
        className={tab === 'births' ? 'tab active' : 'tab'}
        onClick={() => onTab('births')}
      >
        Births model
      </button>
    </div>
  )
}
