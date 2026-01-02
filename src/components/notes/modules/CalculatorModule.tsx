"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { X, GripVertical, FlipVertical2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { safeMathEval } from "@/lib/safe-math";

interface CalculatorModuleProps {
  id: string;
  onClose: () => void;
  onDragResult: (result: string) => void;
}

type Mode = "basic" | "scientific";

export function CalculatorModule({ id, onClose, onDragResult }: CalculatorModuleProps) {
  const [display, setDisplay] = useState("0");
  const [expression, setExpression] = useState("");
  const [mode, setMode] = useState<Mode>("basic");
  const [memory, setMemory] = useState<number>(0);

  const handleNumber = useCallback((num: string) => {
    setDisplay(prev => prev === "0" ? num : prev + num);
    setExpression(prev => prev + num);
  }, []);

  const handleOperator = useCallback((op: string) => {
    setDisplay("0");
    setExpression(prev => prev + ` ${op} `);
  }, []);

  const handleClear = useCallback(() => {
    setDisplay("0");
    setExpression("");
  }, []);

  const handleEquals = useCallback(() => {
    try {
      // Use safe math evaluator instead of eval()
      const result = safeMathEval(expression);
      const resultStr = Number.isFinite(result) ? result.toString() : "Error";
      setDisplay(resultStr);
      setExpression(resultStr);
    } catch {
      setDisplay("Error");
      setExpression("");
    }
  }, [expression]);

  const handleScientific = useCallback((fn: string) => {
    setExpression(prev => prev + `${fn}(`);
    setDisplay(fn + "(");
  }, []);

  const handleDragResultStart = useCallback((e: React.DragEvent) => {
    e.dataTransfer.setData("text/plain", display);
    e.dataTransfer.effectAllowed = "copy";
  }, [display]);

  const basicButtons = [
    ["C", "±", "%", "÷"],
    ["7", "8", "9", "×"],
    ["4", "5", "6", "-"],
    ["1", "2", "3", "+"],
    ["0", ".", "="],
  ];

  const scientificButtons = [
    ["sin", "cos", "tan", "π"],
    ["log", "ln", "√", "^"],
    ["(", ")", "e", "!"],
  ];

  return (
    <Card className="w-72 overflow-hidden shadow-2xl border-border/60">
      {/* Header */}
      <div className="flex items-center justify-between bg-muted/50 px-3 py-2 border-b border-border/40 cursor-move">
        <div className="flex items-center gap-2">
          <GripVertical className="h-4 w-4 text-muted-foreground" />
          <span className="text-xs font-medium">Calculator</span>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={() => setMode(mode === "basic" ? "scientific" : "basic")}
            title={mode === "basic" ? "Scientific mode" : "Basic mode"}
          >
            <FlipVertical2 className="h-3 w-3" />
          </Button>
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onClose}>
            <X className="h-3 w-3" />
          </Button>
        </div>
      </div>

      {/* Display */}
      <div 
        className="bg-card p-4 text-right cursor-grab active:cursor-grabbing"
        draggable
        onDragStart={handleDragResultStart}
        title="Drag result to canvas"
      >
        <div className="text-xs text-muted-foreground truncate h-4">
          {expression || " "}
        </div>
        <div className="text-3xl font-light tracking-tight truncate">
          {display}
        </div>
      </div>

      {/* Scientific buttons */}
      {mode === "scientific" && (
        <div className="grid grid-cols-4 gap-px bg-border/40 p-1">
          {scientificButtons.flat().map((btn) => (
            <Button
              key={btn}
              variant="ghost"
              className="h-9 rounded-lg text-xs font-medium bg-muted/30 hover:bg-muted"
              onClick={() => {
                if (["sin", "cos", "tan", "log", "ln"].includes(btn)) {
                  handleScientific(btn);
                } else if (btn === "√") {
                  handleScientific("sqrt");
                } else if (btn === "π" || btn === "e") {
                  handleNumber(btn);
                } else {
                  handleNumber(btn);
                }
              }}
            >
              {btn}
            </Button>
          ))}
        </div>
      )}

      {/* Basic buttons */}
      <div className="grid grid-cols-4 gap-px bg-border/40 p-1">
        {basicButtons.map((row, rowIndex) => (
          row.map((btn, colIndex) => {
            const isOperator = ["÷", "×", "-", "+", "="].includes(btn);
            const isWide = btn === "0";
            
            return (
              <Button
                key={`${rowIndex}-${colIndex}`}
                variant={isOperator ? "secondary" : "ghost"}
                className={cn(
                  "h-12 rounded-lg text-lg font-medium",
                  isWide && "col-span-2",
                  isOperator && "bg-primary/10 text-primary hover:bg-primary/20",
                  btn === "C" && "text-destructive"
                )}
                onClick={() => {
                  if (btn === "C") handleClear();
                  else if (btn === "=") handleEquals();
                  else if (btn === "±") setDisplay(prev => (parseFloat(prev) * -1).toString());
                  else if (btn === "%") setDisplay(prev => (parseFloat(prev) / 100).toString());
                  else if (isOperator) handleOperator(btn);
                  else handleNumber(btn);
                }}
              >
                {btn}
              </Button>
            );
          })
        ))}
      </div>
    </Card>
  );
}
