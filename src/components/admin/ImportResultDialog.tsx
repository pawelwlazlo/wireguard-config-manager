/**
 * Dialog displaying import operation results
 */

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import type { ImportResultDto } from "@/types";

interface ImportResultDialogProps {
  result: ImportResultDto | null;
  open: boolean;
  onClose: () => void;
}

export function ImportResultDialog({
  result,
  open,
  onClose,
}: ImportResultDialogProps) {
  if (!result) return null;

  return (
    <AlertDialog open={open} onOpenChange={onClose}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Import Completed</AlertDialogTitle>
          <AlertDialogDescription>
            Peer configurations have been successfully imported.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="space-y-3 py-4">
          <div className="rounded-lg border border-border bg-muted/50 p-4">
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="font-semibold">Files Imported:</span>
                <span className="text-lg font-bold text-green-600">
                  {result.files_imported}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="font-semibold">Batch ID:</span>
                <span className="font-mono text-sm text-muted-foreground">
                  {result.batch_id}
                </span>
              </div>
            </div>
          </div>
          {result.files_imported > 0 && (
            <p className="text-sm text-muted-foreground">
              The new peer configurations are now available and can be assigned
              to users.
            </p>
          )}
          {result.files_imported === 0 && (
            <p className="text-sm text-yellow-600">
              No new configurations were found to import. The import directory
              may be empty or all files have already been imported.
            </p>
          )}
        </div>
        <AlertDialogFooter>
          <AlertDialogAction onClick={onClose}>OK</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

