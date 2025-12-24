import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Input } from '@/components/ui/input';
import { Download } from 'lucide-react';
import type { SceneObject, ExportFormat, ExportScope } from '@/types/creation';
import { exportObjects } from '@/utils/stl-exporter';
import { toast } from 'sonner';

interface ExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  objects: SceneObject[];
  selectedObjects: SceneObject[];
  projectName: string;
}

export function ExportDialog({
  open,
  onOpenChange,
  objects,
  selectedObjects,
  projectName
}: ExportDialogProps) {
  const [format, setFormat] = useState<ExportFormat>('stl');
  const [scope, setScope] = useState<ExportScope>('all');
  const [filename, setFilename] = useState(projectName);

  const handleExport = () => {
    const objectsToExport = scope === 'selected' ? selectedObjects : objects;
    
    if (objectsToExport.length === 0) {
      toast.error('No objects to export');
      return;
    }

    exportObjects(objectsToExport, filename, format);
    toast.success(`Exported as ${format.toUpperCase()}`);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Export Scene</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Filename */}
          <div className="space-y-2">
            <Label>Filename</Label>
            <Input
              value={filename}
              onChange={(e) => setFilename(e.target.value)}
              placeholder="export"
            />
          </div>

          {/* Format */}
          <div className="space-y-2">
            <Label>Format</Label>
            <RadioGroup value={format} onValueChange={(v) => setFormat(v as ExportFormat)}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="stl" id="stl" />
                <Label htmlFor="stl" className="font-normal">STL (ASCII)</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="stl-binary" id="stl-binary" />
                <Label htmlFor="stl-binary" className="font-normal">STL (Binary)</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="glb" id="glb" />
                <Label htmlFor="glb" className="font-normal">GLTF Binary (.glb)</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="gltf" id="gltf" />
                <Label htmlFor="gltf" className="font-normal">GLTF (.gltf)</Label>
              </div>
            </RadioGroup>
          </div>

          {/* Scope */}
          <div className="space-y-2">
            <Label>Export</Label>
            <RadioGroup value={scope} onValueChange={(v) => setScope(v as ExportScope)}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="all" id="all" />
                <Label htmlFor="all" className="font-normal">
                  Entire Scene ({objects.length} object{objects.length !== 1 ? 's' : ''})
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem 
                  value="selected" 
                  id="selected" 
                  disabled={selectedObjects.length === 0}
                />
                <Label 
                  htmlFor="selected" 
                  className={`font-normal ${selectedObjects.length === 0 ? 'text-muted-foreground' : ''}`}
                >
                  Selected Only ({selectedObjects.length} object{selectedObjects.length !== 1 ? 's' : ''})
                </Label>
              </div>
            </RadioGroup>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleExport}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
