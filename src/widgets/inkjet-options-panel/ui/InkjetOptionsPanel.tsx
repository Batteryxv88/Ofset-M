import { useCallback, useEffect, useState } from 'react';
import { CircularProgress, Divider, Paper, Typography } from '@mui/material';
import { getInkjetOptions, addInkjetOption, deleteInkjetOption } from '../../../features/inkjet';
import type { InkjetOption, InkjetOptionCategory } from '../../../features/inkjet';
import './InkjetOptionsPanel.scss';

const CATEGORIES: { key: InkjetOptionCategory; label: string }[] = [
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
      <Typography variant="body2" className="ij-opt-cat__title">{label}</Typography>

      {loading && <CircularProgress size={14} className="ij-opt-cat__loader" />}

      <div className="ij-opt-cat__list">
        {items.map((item) => (
          <div key={item.id} className="ij-opt-cat__item">
            <span className="ij-opt-cat__item-label">{item.label}</span>
            <button
              className="ij-opt-cat__del-btn"
              onClick={() => handleDelete(item.id)}
              disabled={deletingId === item.id}
              title="Удалить"
            >
              {deletingId === item.id ? (
                <CircularProgress size={10} color="inherit" />
              ) : (
                '×'
              )}
            </button>
          </div>
        ))}
        {!loading && items.length === 0 && (
          <Typography variant="caption" color="text.secondary" className="ij-opt-cat__empty">
            Список пуст
          </Typography>
        )}
      </div>

      {error && (
        <Typography variant="caption" color="error" className="ij-opt-cat__error">
          {error}
        </Typography>
      )}

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
          {adding ? <CircularProgress size={12} color="inherit" /> : '+ Добавить'}
        </button>
      </div>
    </div>
  );
};

const InkjetOptionsPanel = () => (
  <Paper className="ij-opt-panel" elevation={0}>
    <div className="ij-opt-panel__header">
      <Typography variant="subtitle2" className="ij-opt-panel__title">
        Струйная печать — выпадающие списки
      </Typography>
      <Typography variant="caption" color="text.secondary">
        Значения Менеджеров, Типов изделий и Статусов для форм ввода
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
