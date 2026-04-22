import './TabsStrip.scss';

export type TabItem<T extends string> = {
  id: T;
  label: string;
  disabled?: boolean;
};

type Props<T extends string> = {
  tabs: TabItem<T>[];
  active: T;
  onChange: (id: T) => void;
  /** 'primary' — крупный акцентный (между секциями), 'sub' — вторичный (подвкладки) */
  variant?: 'primary' | 'sub';
};

function TabsStrip<T extends string>({
  tabs, active, onChange, variant = 'primary',
}: Props<T>) {
  return (
    <div className={`tabs-strip tabs-strip--${variant}`}>
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          disabled={tab.disabled}
          className={`tabs-strip__tab ${active === tab.id ? 'tabs-strip__tab--active' : ''}`}
          onClick={() => !tab.disabled && onChange(tab.id)}
          title={tab.disabled ? 'Раздел в разработке' : undefined}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}

export default TabsStrip;
