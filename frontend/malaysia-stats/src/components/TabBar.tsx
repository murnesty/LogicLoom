export type AppTab = 'decades' | 'births'

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
        aria-selected={tab === 'decades'}
        className={tab === 'decades' ? 'tab active' : 'tab'}
        onClick={() => onTab('decades')}
      >
        Decades
      </button>
      <button
        type="button"
        role="tab"
        aria-selected={tab === 'births'}
        className={tab === 'births' ? 'tab active' : 'tab'}
        onClick={() => onTab('births')}
      >
        Births lab
      </button>
    </div>
  )
}
