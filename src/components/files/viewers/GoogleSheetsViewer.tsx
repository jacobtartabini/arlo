import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { Loader2, Save, ExternalLink, AlertCircle, Cloud, CloudOff, ChevronLeft, ChevronRight } from "lucide-react";
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
    horizontalAlignment?: string;
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
    frozenRowCount?: number;
    frozenColumnCount?: number;
  };
}

interface Sheet {
  properties: SheetProperties;
  data?: GridData[];
}

interface SpreadsheetData {
  spreadsheetId: string;
  properties: { title: string };
  sheets: Sheet[];
}

interface CellEdit {
  row: number;
  col: number;
  value: string;
  sheetTitle: string;
}

type SaveStatus = 'saved' | 'saving' | 'unsaved' | 'error';

export function GoogleSheetsViewer({ file, accountId, onOpenInDrive }: GoogleSheetsViewerProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [spreadsheet, setSpreadsheet] = useState<SpreadsheetData | null>(null);
  const [activeSheetIndex, setActiveSheetIndex] = useState(0);
  const [pendingEdits, setPendingEdits] = useState<CellEdit[]>([]);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('saved');
  
  // Cell editing state
  const [selectedCell, setSelectedCell] = useState<{ row: number; col: number } | null>(null);
  const [editingCell, setEditingCell] = useState<{ row: number; col: number } | null>(null);
  const [editValue, setEditValue] = useState("");
  const [formulaBarValue, setFormulaBarValue] = useState("");
  
  const inputRef = useRef<HTMLInputElement>(null);
  const formulaInputRef = useRef<HTMLInputElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const fetchSpreadsheet = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const headers = await getAuthHeaders();
      if (!headers) throw new Error('Not authenticated');

      const response = await fetch(`${SUPABASE_URL}/functions/v1/google-workspace-api`, {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
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
      setError('Failed to load spreadsheet. You may need to reconnect your Google account.');
    } finally {
      setLoading(false);
    }
  }, [file.drive_file_id, accountId]);

  useEffect(() => {
    fetchSpreadsheet();
    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, [fetchSpreadsheet]);

  useEffect(() => {
    if (editingCell && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
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

  const getRawCellValue = (cell: CellData | undefined): string => {
    if (!cell) return "";
    if (cell.userEnteredValue?.formulaValue) return cell.userEnteredValue.formulaValue;
    return getCellValue(cell);
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

  const getCellAddress = (row: number, col: number): string => {
    return `${getColumnLabel(col)}${row + 1}`;
  };

  const activeSheet = spreadsheet?.sheets[activeSheetIndex];
  const rows = useMemo(() => activeSheet?.data?.[0]?.rowData || [], [activeSheet]);
  const maxCols = useMemo(() => Math.max(...rows.map(r => r.values?.length || 0), 26), [rows]);
  const displayRows = useMemo(() => Math.max(rows.length, 50), [rows]);

  const handleCellClick = (row: number, col: number) => {
    const cell = rows[row]?.values?.[col];
    setSelectedCell({ row, col });
    setFormulaBarValue(getRawCellValue(cell));
  };

  const handleCellDoubleClick = (row: number, col: number) => {
    const cell = rows[row]?.values?.[col];
    setEditingCell({ row, col });
    setEditValue(getRawCellValue(cell));
    setFormulaBarValue(getRawCellValue(cell));
  };

  const commitCellEdit = useCallback(() => {
    if (!editingCell || !spreadsheet) return;
    
    const sheet = spreadsheet.sheets[activeSheetIndex];
    const currentValue = getRawCellValue(rows[editingCell.row]?.values?.[editingCell.col]);
    
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
      
      setSaveStatus('unsaved');
      
      // Trigger autosave
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = setTimeout(() => {
        handleSave();
      }, 2000);
    }
    
    setEditingCell(null);
  }, [editingCell, editValue, spreadsheet, activeSheetIndex, rows]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (!selectedCell && !editingCell) return;

    const cell = selectedCell || editingCell;
    if (!cell) return;

    if (editingCell) {
      if (e.key === 'Enter') {
        e.preventDefault();
        commitCellEdit();
        // Move down
        if (cell.row < displayRows - 1) {
          setSelectedCell({ row: cell.row + 1, col: cell.col });
          const nextCell = rows[cell.row + 1]?.values?.[cell.col];
          setFormulaBarValue(getRawCellValue(nextCell));
        }
      } else if (e.key === 'Tab') {
        e.preventDefault();
        commitCellEdit();
        // Move right
        if (cell.col < maxCols - 1) {
          setSelectedCell({ row: cell.row, col: cell.col + 1 });
          const nextCell = rows[cell.row]?.values?.[cell.col + 1];
          setFormulaBarValue(getRawCellValue(nextCell));
        }
      } else if (e.key === 'Escape') {
        setEditingCell(null);
        setEditValue("");
      }
      return;
    }

    // Navigation when not editing
    switch (e.key) {
      case 'ArrowUp':
        e.preventDefault();
        if (cell.row > 0) {
          const newRow = cell.row - 1;
          setSelectedCell({ row: newRow, col: cell.col });
          setFormulaBarValue(getRawCellValue(rows[newRow]?.values?.[cell.col]));
        }
        break;
      case 'ArrowDown':
        e.preventDefault();
        if (cell.row < displayRows - 1) {
          const newRow = cell.row + 1;
          setSelectedCell({ row: newRow, col: cell.col });
          setFormulaBarValue(getRawCellValue(rows[newRow]?.values?.[cell.col]));
        }
        break;
      case 'ArrowLeft':
        e.preventDefault();
        if (cell.col > 0) {
          const newCol = cell.col - 1;
          setSelectedCell({ row: cell.row, col: newCol });
          setFormulaBarValue(getRawCellValue(rows[cell.row]?.values?.[newCol]));
        }
        break;
      case 'ArrowRight':
      case 'Tab':
        e.preventDefault();
        if (cell.col < maxCols - 1) {
          const newCol = cell.col + 1;
          setSelectedCell({ row: cell.row, col: newCol });
          setFormulaBarValue(getRawCellValue(rows[cell.row]?.values?.[newCol]));
        }
        break;
      case 'Enter':
        e.preventDefault();
        handleCellDoubleClick(cell.row, cell.col);
        break;
      case 'F2':
        e.preventDefault();
        handleCellDoubleClick(cell.row, cell.col);
        break;
      default:
        // Start typing to edit
        if (e.key.length === 1 && !e.ctrlKey && !e.metaKey) {
          handleCellDoubleClick(cell.row, cell.col);
          setEditValue(e.key);
        }
    }
  }, [selectedCell, editingCell, displayRows, maxCols, rows, commitCellEdit]);

  const handleSave = async () => {
    if (!spreadsheet || pendingEdits.length === 0) return;
    
    setSaveStatus('saving');
    
    try {
      for (const edit of pendingEdits) {
        const range = `${edit.sheetTitle}!${getColumnLabel(edit.col)}${edit.row + 1}`;
        
        const headers = await getAuthHeaders();
        if (!headers) throw new Error('Not authenticated');

        const response = await fetch(`${SUPABASE_URL}/functions/v1/google-workspace-api`, {
          method: 'POST',
          headers: { ...headers, 'Content-Type': 'application/json' },
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
          throw new Error('Failed to save spreadsheet');
        }
      }
      
      setSaveStatus('saved');
      setPendingEdits([]);
      toast.success('Spreadsheet saved');
      await fetchSpreadsheet();
    } catch (err) {
      console.error('Failed to save spreadsheet:', err);
      setSaveStatus('error');
      toast.error('Failed to save changes');
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
          <Button variant="outline" onClick={fetchSpreadsheet}>Try Again</Button>
          <Button onClick={onOpenInDrive}>
            <ExternalLink className="mr-2 h-4 w-4" />
            Open in Google Sheets
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col" onKeyDown={handleKeyDown} tabIndex={0}>
      {/* Toolbar */}
      <div className="flex items-center justify-between border-b bg-muted/30 px-3 py-2">
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium truncate max-w-[200px]">
            {spreadsheet?.properties.title || file.name}
          </span>
        </div>
        
        <div className="flex items-center gap-2">
          {saveStatus === 'saved' && (
            <span className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
              <Cloud className="h-3.5 w-3.5" />
              Saved
            </span>
          )}
          {saveStatus === 'saving' && (
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Saving...
            </span>
          )}
          {saveStatus === 'unsaved' && (
            <>
              <span className="flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400">
                <CloudOff className="h-3.5 w-3.5" />
                {pendingEdits.length} unsaved
              </span>
              <Button size="sm" className="h-7" onClick={handleSave}>
                <Save className="mr-1 h-3.5 w-3.5" />
                Save
              </Button>
            </>
          )}
          {saveStatus === 'error' && (
            <span className="flex items-center gap-1 text-xs text-destructive">
              <AlertCircle className="h-3.5 w-3.5" />
              Error
            </span>
          )}
        </div>
      </div>

      {/* Formula Bar */}
      <div className="flex items-center gap-2 border-b bg-background px-3 py-1.5">
        <div className="flex h-7 min-w-[80px] items-center justify-center rounded border bg-muted/50 px-2 text-xs font-medium">
          {selectedCell ? getCellAddress(selectedCell.row, selectedCell.col) : ''}
        </div>
        <div className="h-4 w-px bg-border" />
        <Input
          ref={formulaInputRef}
          value={formulaBarValue}
          onChange={(e) => {
            setFormulaBarValue(e.target.value);
            if (selectedCell) {
              setEditValue(e.target.value);
              setEditingCell(selectedCell);
            }
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && editingCell) {
              commitCellEdit();
            }
          }}
          className="h-7 flex-1 font-mono text-sm"
          placeholder="Select a cell"
        />
      </div>

      {/* Sheet Tabs */}
      {spreadsheet && spreadsheet.sheets.length > 1 && (
        <div className="flex items-center gap-1 border-b bg-muted/20 px-2 py-1">
          <Button variant="ghost" size="sm" className="h-6 w-6 p-0" disabled>
            <ChevronLeft className="h-3.5 w-3.5" />
          </Button>
          <div className="flex-1 overflow-x-auto">
            <Tabs value={String(activeSheetIndex)} onValueChange={(v) => setActiveSheetIndex(parseInt(v))}>
              <TabsList className="h-7 bg-transparent p-0">
                {spreadsheet.sheets.map((sheet, idx) => (
                  <TabsTrigger 
                    key={sheet.properties.sheetId} 
                    value={String(idx)} 
                    className="h-6 rounded-sm px-3 text-xs data-[state=active]:bg-background"
                  >
                    {sheet.properties.title}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          </div>
          <Button variant="ghost" size="sm" className="h-6 w-6 p-0" disabled>
            <ChevronRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}

      {/* Spreadsheet Grid */}
      <div ref={gridRef} className="flex-1 overflow-auto">
        <table className="w-max min-w-full border-collapse text-sm">
          <thead className="sticky top-0 z-10">
            <tr>
              <th className="sticky left-0 z-20 w-12 border-b border-r bg-muted p-0">
                <div className="flex h-6 items-center justify-center text-[10px] font-medium text-muted-foreground">
                  #
                </div>
              </th>
              {Array.from({ length: maxCols }, (_, i) => (
                <th 
                  key={i} 
                  className={cn(
                    "min-w-[100px] border-b border-r bg-muted p-0",
                    selectedCell?.col === i && "bg-primary/10"
                  )}
                >
                  <div className="flex h-6 items-center justify-center text-[10px] font-medium text-muted-foreground">
                    {getColumnLabel(i)}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: displayRows }, (_, rowIdx) => {
              const row = rows[rowIdx];
              return (
                <tr key={rowIdx}>
                  <td 
                    className={cn(
                      "sticky left-0 z-10 border-b border-r bg-muted/50 p-0",
                      selectedCell?.row === rowIdx && "bg-primary/10"
                    )}
                  >
                    <div className="flex h-6 w-12 items-center justify-center text-[10px] text-muted-foreground">
                      {rowIdx + 1}
                    </div>
                  </td>
                  {Array.from({ length: maxCols }, (_, colIdx) => {
                    const cell = row?.values?.[colIdx];
                    const value = getCellValue(cell);
                    const isEditing = editingCell?.row === rowIdx && editingCell?.col === colIdx;
                    const isSelected = selectedCell?.row === rowIdx && selectedCell?.col === colIdx;
                    const hasPendingEdit = pendingEdits.some(e => 
                      e.row === rowIdx && e.col === colIdx && e.sheetTitle === activeSheet?.properties.title
                    );
                    
                    const format = cell?.effectiveFormat;
                    const isBold = format?.textFormat?.bold;
                    const isItalic = format?.textFormat?.italic;
                    const alignment = format?.horizontalAlignment;

                    return (
                      <td
                        key={colIdx}
                        className={cn(
                          "border-b border-r p-0 transition-colors",
                          hasPendingEdit && "bg-amber-50 dark:bg-amber-900/20",
                          isSelected && !isEditing && "ring-2 ring-inset ring-primary",
                          !isEditing && !isSelected && "hover:bg-muted/30"
                        )}
                        onClick={() => handleCellClick(rowIdx, colIdx)}
                        onDoubleClick={() => handleCellDoubleClick(rowIdx, colIdx)}
                      >
                        {isEditing ? (
                          <Input
                            ref={inputRef}
                            value={editValue}
                            onChange={(e) => {
                              setEditValue(e.target.value);
                              setFormulaBarValue(e.target.value);
                            }}
                            onBlur={commitCellEdit}
                            className="h-6 min-w-[100px] rounded-none border-0 bg-white px-1.5 text-sm focus-visible:ring-2 focus-visible:ring-primary dark:bg-background"
                          />
                        ) : (
                          <div 
                            className={cn(
                              "flex h-6 min-w-[100px] items-center truncate px-1.5 text-sm",
                              isBold && "font-semibold",
                              isItalic && "italic",
                              alignment === 'RIGHT' && "justify-end",
                              alignment === 'CENTER' && "justify-center"
                            )}
                          >
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
      <div className="flex items-center justify-between border-t bg-muted/30 px-4 py-1.5 text-xs text-muted-foreground">
        <span>
          {activeSheet?.properties.title} • {rows.length} rows
        </span>
        <Button variant="link" size="sm" className="h-auto p-0 text-xs" onClick={onOpenInDrive}>
          <ExternalLink className="mr-1 h-3 w-3" />
          Open in Google Sheets
        </Button>
      </div>
    </div>
  );
}
