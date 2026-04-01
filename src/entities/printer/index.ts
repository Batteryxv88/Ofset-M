export const PRINTER_OPTIONS = ['6100', '7210', '3070', '8210'] as const;

export type PrinterModel = (typeof PRINTER_OPTIONS)[number];

/** Принтеры цветной печати */
export const COLOR_PRINTERS: ReadonlyArray<string> = ['6100', '7210', '3070'];

/** Принтеры чёрно-белой печати */
export const BW_PRINTERS: ReadonlyArray<string> = ['8210'];

export function isPrinterBW(model: string): boolean {
  return BW_PRINTERS.includes(model);
}
