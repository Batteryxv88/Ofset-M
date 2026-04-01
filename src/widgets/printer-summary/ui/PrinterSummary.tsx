import { Divider, Paper, Typography } from '@mui/material';
import { PRINTER_OPTIONS, isPrinterBW } from '../../../entities/printer';
import { formatNum } from '../../../shared/lib';
import './PrinterSummary.scss';

type SummaryRow = {
  printerModel: string;
  totalFiles: number;
  totalRun: number;
};

type Totals = {
  filesTotal: number;
  runTotal: number;
};

type Props = {
  summary: SummaryRow[];
  totals: Totals;
  loading: boolean;
};

const PrinterSummary = ({ summary, totals, loading }: Props) => {
  const rows = summary.length
    ? summary
    : PRINTER_OPTIONS.map((p) => ({ printerModel: p, totalFiles: 0, totalRun: 0 }));

  return (
    <>
      {/* Итого за день */}
      <Paper elevation={0} className="printer-summary-kpi">
        <div className="printer-summary-kpi__item">
          <Typography variant="overline" color="text.secondary">
            Файлы за день
          </Typography>
          <Typography variant="h5" className="printer-summary-kpi__value">
            {loading ? '—' : formatNum(totals.filesTotal)}
          </Typography>
        </div>

        <div className="printer-summary-kpi__sep" />

        <div className="printer-summary-kpi__item">
          <Typography variant="overline" color="text.secondary">
            Тираж за день
          </Typography>
          <Typography variant="h5" className="printer-summary-kpi__value">
            {loading ? '—' : formatNum(totals.runTotal)}
          </Typography>
        </div>
      </Paper>

      {/* Детализация по принтерам */}
      <Paper elevation={0} className="printer-summary">
        <div className="printer-summary__head">
          <div>
            <Typography variant="subtitle1">По принтерам</Typography>
            <Typography variant="caption" color="text.secondary">
              Детализация за сегодня
            </Typography>
          </div>
        </div>

        <Divider className="printer-summary__divider" />

        <div className="printer-summary__list">
          {rows.map((row) => {
            const isBW = isPrinterBW(row.printerModel);
            return (
              <div key={row.printerModel} className="printer-summary__row">
                <div className="printer-summary__row-label">
                  <span
                    className={[
                      'printer-summary__dot',
                      isBW ? 'printer-summary__dot--bw' : '',
                    ].join(' ')}
                  />
                  <Typography variant="body2">{row.printerModel}</Typography>
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    className="printer-summary__type"
                  >
                    {isBW ? 'Ч/Б' : 'Цвет'}
                  </Typography>
                </div>

                <div className="printer-summary__row-metrics">
                  <div className="printer-summary__metric">
                    <Typography variant="caption" color="text.secondary">
                      файлы
                    </Typography>
                    <Typography variant="body2" className="printer-summary__num">
                      {loading ? '—' : formatNum(row.totalFiles)}
                    </Typography>
                  </div>
                  <div className="printer-summary__metric">
                    <Typography variant="caption" color="text.secondary">
                      тираж
                    </Typography>
                    <Typography variant="body2" className="printer-summary__num">
                      {loading ? '—' : formatNum(row.totalRun)}
                    </Typography>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </Paper>
    </>
  );
};

export default PrinterSummary;
