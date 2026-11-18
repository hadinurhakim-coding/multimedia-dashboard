export type CellValue = string | number | boolean | null;
export type CellEdit = { sheet: string; address: string; value: CellValue };
export type LppCell = { address: string; value: CellValue; formula: boolean };
export type LppSheet = { name: string; rows: number; columns: number; cells: LppCell[]; merges: string[] };
export type LppWorkbook = { hash: string; sheets: LppSheet[] };
export type LppTemplate = { id: string; name: string; formAvailable?: boolean; documentationTableAvailable?: boolean };
export type LppPhotos = Record<string, string>;
export type LppDraft = {
  id: string; title: string; templateId: string; templateHash: string;
  edits: CellEdit[]; photos?: LppPhotos; updatedAt: string; revision: string;
  createdAt?: string; reportDate?: string;
};
