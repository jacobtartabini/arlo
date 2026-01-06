import { useState, useEffect, useCallback, useRef } from "react";
import { Loader2, Save, ExternalLink, AlertCircle, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { getAuthHeaders } from "@/lib/arloAuth";
import { cn } from "@/lib/utils";
import type { DriveFile } from "@/types/files";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

interface GoogleSheetsViewerProps {
  file: DriveFile;
  accountId: string;
  onOpenInDrive: () => void;
}

interface CellValue {
  stringValue?: string;
  numberValue?: number;
  boolValue?: boolean;
  formulaValue?: string;
}

interface CellData {
  userEnteredValue?: CellValue;
  formattedValue?: string;
  effectiveFormat?: {
    backgroundColor?: { red?: number; green?: number; blue?: number };
    textFormat?: {
      bold?: boolean;
      italic?: boolean;
      fontSize?: number;
    };
  };
}

interface RowData {
  values?: CellData[];
}

interface GridData {
  rowData?: RowData[];
  startRow?: number;
  startColumn?: number;
}

interface SheetProperties {
  sheetId: number;
  title: string;
  index: number;
  gridProperties?: {
    rowCount?: number;
    columnCount?: number;
  };
}

interface Sheet {
  properties: SheetProperties;
  data?: GridData[];
}

interface SpreadsheetData {
  spreadsheetId: string;
  properties: {
    title: string;
  };
  sheets: Sheet[];
}

interface CellEdit {
  row: number;
  col: number;
  value: string;
  sheetTitle: string;
}

export function GoogleSheetsViewer({ file, accountId, onOpenInDrive }: GoogleSheetsViewerProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [spreadsheet, setSpreadsheet] = useState<SpreadsheetData | null>(null);
  const [activeSheetIndex, setActiveSheetIndex] = useState(0);
  const [pendingEdits, setPendingEdits] = useState<CellEdit[]>([]);
  const [editingCell, setEditingCell] = useState<{ row: number; col: number } | null>(null);
  const [editValue, setEditValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const fetchSpreadsheet = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const headers = await getAuthHeaders();
      if (!headers) {
        throw new Error('Not authenticated');
      }

      const response = await fetch(`${SUPABASE_URL}/functions/v1/google-workspace-api`, {
        method: 'POST',
        headers: {
          ...headers,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'get_sheet',
          accountId,
          fileId: file.drive_file_id,
        }),
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({ error: 'Request failed' }));
        throw new Error(err.error || 'Failed to load spreadsheet');
      }

      const data = await response.json();
      if (data?.spreadsheet) {
        setSpreadsheet(data.spreadsheet);
      }
    } catch (err) {
      console.error('Failed to fetch spreadsheet:', err);
      setError('Failed to load spreadsheet. You may need to reconnect your Google account with updated permissions.');
    } finally {
      setLoading(false);
    }
  }, [file.drive_file_id, accountId]);

  useEffect(() => {
    fetchSpreadsheet();
  }, [fetchSpreadsheet]);

  useEffect(() => {
    if (editingCell && inputRef.current) {
      inputRef.current.focus();
    }
  }, [editingCell]);

  const getCellValue = (cell: CellData | undefined): string => {
    if (!cell) return "";
    if (cell.formattedValue) return cell.formattedValue;
    if (cell.userEnteredValue?.stringValue) return cell.userEnteredValue.stringValue;
    if (cell.userEnteredValue?.numberValue !== undefined) return String(cell.userEnteredValue.numberValue);
    if (cell.userEnteredValue?.boolValue !== undefined) return cell.userEnteredValue.boolValue ? "TRUE" : "FALSE";
    if (cell.userEnteredValue?.formulaValue) return cell.userEnteredValue.formulaValue;
    return "";
  };

  const getColumnLabel = (index: number): string => {
    let label = "";
    let n = index;
    while (n >= 0) {
      label = String.fromCharCode(65 + (n % 26)) + label;
      n = Math.floor(n / 26) - 1;
    }
    return label;
  };

  const handleCellClick = (row: number, col: number, currentValue: string) => {
    setEditingCell({ row, col });
    setEditValue(currentValue);
  };

  const handleCellBlur = () => {
    if (editingCell && spreadsheet) {
      const sheet = spreadsheet.sheets[activeSheetIndex];
      const currentValue = getCellValue(sheet.data?.[0]?.rowData?.[editingCell.row]?.values?.[editingCell.col]);
      
      if (editValue !== currentValue) {
        setPendingEdits(prev => {
          const existing = prev.findIndex(e => 
            e.row === editingCell.row && e.col === editingCell.col && e.sheetTitle === sheet.properties.title
          );
          
          const newEdit: CellEdit = {
            row: editingCell.row,
            col: editingCell.col,
            value: editValue,
            sheetTitle: sheet.properties.title,
          };
          
          if (existing >= 0) {
            const updated = [...prev];
            updated[existing] = newEdit;
            return updated;
          }
          return [...prev, newEdit];
        });
      }
    }
    setEditingCell(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleCellBlur();
    } else if (e.key === 'Escape') {
      setEditingCell(null);
    }
  };

  const handleSave = async () => {
    if (!spreadsheet || pendingEdits.length === 0) return;
    
    setSaving(true);
    try {
      // Group edits by sheet and build range updates
      const editsBySheet = pendingEdits.reduce((acc, edit) => {
        if (!acc[edit.sheetTitle]) acc[edit.sheetTitle] = [];
        acc[edit.sheetTitle].push(edit);
        return acc;
      }, {} as Record<string, CellEdit[]>);

      for (const [sheetTitle, edits] of Object.entries(editsBySheet)) {
        for (const edit of edits) {
          const range = `${sheetTitle}!${getColumnLabel(edit.col)}${edit.row + 1}`;
          
          const headers = await getAuthHeaders();
          if (!headers) {
            throw new Error('Not authenticated');
          }

          const response = await fetch(`${SUPABASE_URL}/functions/v1/google-workspace-api`, {
            method: 'POST',
            headers: {
              ...headers,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              action: 'update_sheet',
              accountId,
              fileId: file.drive_file_id,
              content: {
                range,
                values: [[edit.value]],
              },
            }),
          });

          if (!response.ok) {
            const err = await response.json().catch(() => ({ error: 'Request failed' }));
            throw new Error(err.error || 'Failed to save spreadsheet');
          }
        }
      }
      
      toast.success('Spreadsheet saved');
      setPendingEdits([]);
      await fetchSpreadsheet();
    } catch (err) {
      console.error('Failed to save spreadsheet:', err);
      toast.error('Failed to save changes');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Loading spreadsheet...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 p-8">
        <AlertCircle className="h-12 w-12 text-destructive" />
        <p className="text-center text-muted-foreground">{error}</p>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchSpreadsheet}>
            Try Again
          </Button>
          <Button onClick={onOpenInDrive}>
            <ExternalLink className="mr-2 h-4 w-4" />
            Open in Google Sheets
          </Button>
        </div>
      </div>
    );
  }

  const activeSheet = spreadsheet?.sheets[activeSheetIndex];
  const rows = activeSheet?.data?.[0]?.rowData || [];
  const maxCols = Math.max(...rows.map(r => r.values?.length || 0), 10);
  const displayRows = Math.max(rows.length, 20);

  return (
    <div className="flex h-full flex-col">
      {/* Toolbar */}
      <div className="flex items-center justify-between border-b bg-muted/30 px-4 py-2">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">{spreadsheet?.properties.title || file.name}</span>
          {pendingEdits.length > 0 && (
            <span className="rounded bg-amber-100 px-2 py-0.5 text-xs text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
              {pendingEdits.length} unsaved {pendingEdits.length === 1 ? 'change' : 'changes'}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {pendingEdits.length > 0 && (
            <Button size="sm" onClick={handleSave} disabled={saving}>
              {saving ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              Save
            </Button>
          )}
        </div>
      </div>

      {/* Sheet Tabs */}
      {spreadsheet && spreadsheet.sheets.length > 1 && (
        <div className="border-b bg-muted/20 px-2">
          <Tabs value={String(activeSheetIndex)} onValueChange={(v) => setActiveSheetIndex(parseInt(v))}>
            <TabsList className="h-8 bg-transparent">
              {spreadsheet.sheets.map((sheet, idx) => (
                <TabsTrigger key={sheet.properties.sheetId} value={String(idx)} className="h-7 text-xs">
                  {sheet.properties.title}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>
      )}

      {/* Spreadsheet Grid */}
      <div className="flex-1 overflow-auto">
        <table className="w-full border-collapse text-sm">
          <thead className="sticky top-0 z-10 bg-muted">
            <tr>
              <th className="w-10 border-b border-r bg-muted p-1 text-center text-xs font-medium text-muted-foreground">
                #
              </th>
              {Array.from({ length: maxCols }, (_, i) => (
                <th key={i} className="min-w-[100px] border-b border-r bg-muted p-1 text-center text-xs font-medium text-muted-foreground">
                  {getColumnLabel(i)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: displayRows }, (_, rowIdx) => {
              const row = rows[rowIdx];
              return (
                <tr key={rowIdx} className="group">
                  <td className="border-b border-r bg-muted/50 p-1 text-center text-xs text-muted-foreground">
                    {rowIdx + 1}
                  </td>
                  {Array.from({ length: maxCols }, (_, colIdx) => {
                    const cell = row?.values?.[colIdx];
                    const value = getCellValue(cell);
                    const isEditing = editingCell?.row === rowIdx && editingCell?.col === colIdx;
                    const hasPendingEdit = pendingEdits.some(e => 
                      e.row === rowIdx && e.col === colIdx && e.sheetTitle === activeSheet?.properties.title
                    );

                    return (
                      <td
                        key={colIdx}
                        className={cn(
                          "border-b border-r p-0 transition-colors",
                          hasPendingEdit && "bg-amber-50 dark:bg-amber-900/20",
                          !isEditing && "hover:bg-muted/30 cursor-cell"
                        )}
                        onClick={() => !isEditing && handleCellClick(rowIdx, colIdx, value)}
                      >
                        {isEditing ? (
                          <Input
                            ref={inputRef}
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            onBlur={handleCellBlur}
                            onKeyDown={handleKeyDown}
                            className="h-6 rounded-none border-0 bg-background px-1 text-sm focus-visible:ring-2 focus-visible:ring-primary"
                          />
                        ) : (
                          <div className="min-h-[24px] truncate px-1 py-0.5 text-sm">
                            {value}
                          </div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between border-t bg-muted/30 px-4 py-2 text-xs text-muted-foreground">
        <span>
          {activeSheet?.properties.title} • Click cells to edit
        </span>
        <Button variant="link" size="sm" className="h-auto p-0 text-xs" onClick={onOpenInDrive}>
          Open in Google Sheets for formulas & charts
        </Button>
      </div>
    </div>
  );
}
