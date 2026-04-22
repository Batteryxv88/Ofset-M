import { useCallback, useEffect, useState } from 'react';
import { CircularProgress, Divider, Paper, Typography } from '@mui/material';
import { getInkjetOptions, addInkjetOption, deleteInkjetOption } from '../../../features/inkjet';
import type { InkjetOption, InkjetOptionCategory } from '../../../features/inkjet';
import './InkjetOptionsPanel.scss';

const CATEGORIES: { key: InkjetOptionCategory; label: string }[] = [
  { key: 'worker',       label: 'Печатники смены' },
  { key: 'manager',      label: 'Менеджеры' },
  { key: 'product_type', label: 'Типы изделий' },
  { key: 'status',       label: 'Статусы заказов' },
];

const CategoryList = ({
  category,
  label,
}: {
  category: InkjetOptionCategory;
  label: string;
}) => {
  const [items, setItems]     = useState<InkjetOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [newVal, setNewVal]   = useState('');
  const [adding, setAdding]   = useState(false);
  const [error, setError]     = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setItems(await getInkjetOptions(category));
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [category]);

  useEffect(() => { void load(); }, [load]);

  const handleAdd = async () => {
    if (!newVal.trim()) return;
    setAdding(true);
    setError(null);
    try {
      const added = await addInkjetOption(category, newVal.trim());
      setItems((prev) => [...prev, added]);
      setNewVal('');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Ошибка');
    } finally {
      setAdding(false);
    }
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      await deleteInkjetOption(id);
      setItems((prev) => prev.filter((i) => i.id !== id));
    } catch {
      // silent
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="ij-opt-cat">
      <div className="ij-opt-cat__head">
        <Typography variant="caption" className="ij-opt-cat__title">{label}</Typography>
        {loading && <CircularProgress size={11} />}
      </div>

      {/* Чипы */}
      <div className="ij-opt-cat__chips">
        {items.map((item) => (
          <span key={item.id} className="ij-opt-cat__chip">
            {item.label}
            <button
              className="ij-opt-cat__chip-del"
              onClick={() => handleDelete(item.id)}
              disabled={deletingId === item.id}
              title={`Удалить «${item.label}»`}
            >
              {deletingId === item.id
                ? <CircularProgress size={9} color="inherit" />
                : '×'}
            </button>
          </span>
        ))}
        {!loading && items.length === 0 && (
          <span className="ij-opt-cat__empty">пусто</span>
        )}
      </div>

      {/* Строка добавления */}
      <div className="ij-opt-cat__add">
        <input
          type="text"
          className="ij-opt-cat__input"
          placeholder="Новое значение…"
          value={newVal}
          onChange={(e) => setNewVal(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
          disabled={adding}
        />
        <button
          className="ij-opt-cat__add-btn"
          onClick={handleAdd}
          disabled={adding || !newVal.trim()}
        >
          {adding ? <CircularProgress size={11} color="inherit" /> : '+'}
        </button>
      </div>

      {error && (
        <Typography variant="caption" color="error" className="ij-opt-cat__error">
          {error}
        </Typography>
      )}
    </div>
  );
};

const InkjetOptionsPanel = () => (
  <Paper className="ij-opt-panel" elevation={0}>
    <div className="ij-opt-panel__header">
      <Typography variant="subtitle2" className="ij-opt-panel__title">
        Струйная печать — справочники
      </Typography>
      <Typography variant="caption" color="text.secondary">
        Печатники (для состава смены), Менеджеры, Типы изделий и Статусы заказов
      </Typography>
    </div>

    <Divider className="ij-opt-panel__divider" />

    <div className="ij-opt-panel__grid">
      {CATEGORIES.map((cat) => (
        <CategoryList key={cat.key} category={cat.key} label={cat.label} />
      ))}
    </div>
  </Paper>
);

export default InkjetOptionsPanel;
