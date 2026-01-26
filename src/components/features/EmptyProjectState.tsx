import React, { useRef } from 'react';
import { FileText, Plus } from 'lucide-react';
import Button from '../ui/Button';
import { useWorkspace } from '../../context/WorkspaceContext';

interface EmptyProjectStateProps {
  onImport?: (e: React.ChangeEvent<HTMLInputElement>) => void; // Made optional
  onCreate: () => void;
  title?: string;
  description?: string;
  isImporting?: boolean;
}

export const EmptyProjectState: React.FC<EmptyProjectStateProps> = ({
  onImport,
  onCreate,
  title = "No Script Found",
  description = "Import a screenplay or start writing. We support Fountain, PDF, and Final Draft (.fdx).",
  isImporting = false
}) => {
  const { handleCreateDraft } = useWorkspace();
  const fileInputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="flex flex-col items-center justify-center h-full max-w-2xl mx-auto w-full animate-in fade-in slide-in-from-bottom-4 duration-500 p-8">
      {onImport && (
        <input
          type="file"
          ref={fileInputRef}
          className="hidden"
          accept=".fountain,.txt,.pdf,.fdx"
          onChange={onImport}
        />
      )}

      <div className="text-center mb-10">
        <div className="w-16 h-16 bg-surface-secondary rounded-2xl flex items-center justify-center mx-auto mb-4 border border-border shadow-inner">
          <FileText className="w-8 h-8 text-text-tertiary" />
        </div>
        <h2 className="text-2xl font-bold text-text-primary mb-2">{title}</h2>
        <p className="text-text-secondary text-sm max-w-md mx-auto">
          {description}
        </p>
      </div>

      <div className="flex gap-4 justify-center">
        {onImport && (
          <Button
            variant="secondary"
            onClick={() => fileInputRef.current?.click()}
            loading={isImporting}
          >
            Import Script
          </Button>
        )}
        <Button
          variant="primary"
          icon={<Plus className="w-4 h-4" />}
          onClick={onCreate}
        >
          Start Writing
        </Button>
      </div>
    </div>
  );
};