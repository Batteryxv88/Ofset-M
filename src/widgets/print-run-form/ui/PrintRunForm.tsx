import { useState } from 'react';
import { useSelector } from 'react-redux';
import {
  Alert,
  Box,
  Button,
  Divider,
  MenuItem,
  Paper,
  TextField,
  Typography,
} from '@mui/material';
import type { FormEvent } from 'react';
import type { RootState } from '../../../app/store';
import { createPrintRun } from '../../../features/print-run';
import { PRINTER_OPTIONS } from '../../../entities/printer';
import type { PrinterModel } from '../../../entities/printer';
import './PrintRunForm.scss';

type Props = {
  /** Вызывается после успешной записи — чтобы родитель обновил сводку */
  onSaved: () => void;
};

const PrintRunForm = ({ onSaved }: Props) => {
  const user = useSelector((state: RootState) => state.auth.user);

  const [printerModel, setPrinterModel] = useState<PrinterModel>('6100');
  const [files, setFiles] = useState('');
  const [run, setRun] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [savedOk, setSavedOk] = useState(false);
  const [saving, setSaving] = useState(false);

  const canSubmit =
    Boolean(user?.id) &&
    !saving &&
    Number(files) > 0 &&
    Number(run) > 0;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!canSubmit || !user?.id) return;

    setSaving(true);
    setError(null);
    setSavedOk(false);

    try {
      await createPrintRun({
        userId: user.id,
        printerModel,
        files: Number(files),
        run: Number(run),
      });

      setFiles('');
      setRun('');
      setSavedOk(true);
      setTimeout(() => setSavedOk(false), 3000);
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось записать');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Paper elevation={0} className="print-run-form">
      <div className="print-run-form__head">
        <div>
          <Typography variant="subtitle1">Записать тираж</Typography>
          <Typography variant="caption" color="text.secondary">
            Заполни данные и нажми «Сохранить»
          </Typography>
        </div>
      </div>

      <Divider className="print-run-form__divider" />

      <Box component="form" onSubmit={handleSubmit} className="print-run-form__body">
        <div className="print-run-form__field">
          <Typography variant="caption" color="text.secondary" className="print-run-form__label">
            Принтер
          </Typography>
          <TextField
            select
            value={printerModel}
            onChange={(e) => setPrinterModel(e.target.value as PrinterModel)}
            fullWidth
          >
            {PRINTER_OPTIONS.map((p) => (
              <MenuItem key={p} value={p}>
                {p === '8210' ? `${p} — Ч/Б` : `${p} — Цвет`}
              </MenuItem>
            ))}
          </TextField>
        </div>

        <div className="print-run-form__row">
          <div className="print-run-form__field">
            <Typography variant="caption" color="text.secondary" className="print-run-form__label">
              Файлы
            </Typography>
            <TextField
              value={files}
              onChange={(e) => setFiles(e.target.value)}
              inputMode="numeric"
              placeholder="0"
              fullWidth
            />
          </div>

          <div className="print-run-form__field">
            <Typography variant="caption" color="text.secondary" className="print-run-form__label">
              Тираж
            </Typography>
            <TextField
              value={run}
              onChange={(e) => setRun(e.target.value)}
              inputMode="numeric"
              placeholder="0"
              fullWidth
            />
          </div>
        </div>

        <div className="print-run-form__footer">
          {error && (
            <Alert severity="error" onClose={() => setError(null)}>
              {error}
            </Alert>
          )}

          {savedOk && (
            <div className="print-run-form__ok">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <circle cx="8" cy="8" r="8" fill="rgba(99,102,241,0.2)" />
                <path
                  d="M4.5 8L7 10.5L11.5 6"
                  stroke="#818cf8"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              <Typography variant="caption" color="primary.light">
                Тираж записан
              </Typography>
            </div>
          )}

          <Button
            type="submit"
            variant="contained"
            color="primary"
            disabled={!canSubmit}
            className="print-run-form__submit"
          >
            {saving ? 'Сохраняю...' : 'Сохранить'}
          </Button>
        </div>
      </Box>
    </Paper>
  );
};

export default PrintRunForm;
