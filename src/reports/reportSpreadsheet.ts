import type { ReportExportRow } from './report';

export async function createReportWorkbook(
  reportName: string,
  rows: readonly ReportExportRow[],
) {
  const { utils, write } = await import('@e965/xlsx');
  const workbook = utils.book_new();
  const worksheet = utils.json_to_sheet(
    rows.length > 0 ? [...rows] : [{ Message: 'No matching data' }],
  );

  worksheet['!autofilter'] = { ref: worksheet['!ref'] ?? 'A1:A1' };
  utils.book_append_sheet(workbook, worksheet, reportName.slice(0, 31));

  return write(workbook, {
    bookType: 'xlsx',
    type: 'array',
  }) as ArrayBuffer;
}
