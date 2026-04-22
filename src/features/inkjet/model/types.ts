export type PrintType = 'uv' | 'wide';
export type InkjetOptionCategory = 'manager' | 'product_type' | 'status' | 'worker';

export type InkjetOption = {
  id: string;
  category: InkjetOptionCategory;
  label: string;
  sort_order: number;
};

/** Печатник струйной печати — это запись из inkjet_options с категорией 'worker' */
export type InkjetWorker = InkjetOption & { category: 'worker' };

export type InkjetJob = {
  id: string;
  user_id: string;
  print_type: PrintType;
  order_number: number | null;
  manager: string | null;
  product_type: string | null;
  quantity: number | null;
  due_date: string | null;
  post_print: string | null;
  setup_minutes: number | null;
  print_width_m: number | null;
  linear_meters: number | null;
  table_count: number | null;
  print_minutes: number | null;
  post_print_minutes: number | null;
  notes: string | null;
  status: string | null;
  /** ID печатников, которые были в смене в момент создания записи */
  worker_ids: string[];
  created_at: string;
  updated_at: string;
};

export type CreateInkjetJobData = Omit<InkjetJob, 'id' | 'user_id' | 'created_at' | 'updated_at'>;
