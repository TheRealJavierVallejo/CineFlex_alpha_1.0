import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useWorkspace } from '../../context/WorkspaceContext';
import { TitlePageData } from '../../types';
import Input, { Textarea } from '../ui/Input';
import Button from '../ui/Button';
import { Plus, X } from 'lucide-react';
import { debounce } from '../../utils/debounce';
import { SaveIndicator } from '../ui/SaveIndicator';
import { TitlePagePreview } from './TitlePagePreview';

const TEMPLATES = {
  feature: {
    label: 'Feature Film',
    credit: 'Written by',
    format: 'feature'
  },
  tv_pilot: {
    label: 'TV Pilot',
    credit: 'Teleplay by',
    format: 'tv'
  },
  tv_spec: {
    label: 'TV Spec',
    credit: 'Spec Script by',
    format: 'tv'
  },
  short: {
    label: 'Short Film',
    credit: 'A Short Film by',
    format: 'short'
  }
};

type TemplateKey = keyof typeof TEMPLATES;

export const TitlePageEditor: React.FC = () => {
  const { project, handleUpdateProject, saveNow, saveStatus } = useWorkspace();
  const [data, setData] = useState<TitlePageData>({
    title: project.name,
    credit: 'Written by',
    authors: [''],
    draftDate: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
    source: '',
    contact: '',
    copyright: '',
    wgaRegistration: '',
    additionalInfo: ''
  });

  const [selectedTemplate, setSelectedTemplate] = useState<TemplateKey>('feature');

  // Load existing data on mount
  useEffect(() => {
    if (project.titlePage) {
      setData(prev => ({ ...prev, ...project.titlePage }));
    } else {
      setData(prev => ({ ...prev, title: project.name }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run once on mount

  const triggerUpdate = useCallback((newData: TitlePageData) => {
    handleUpdateProject({ ...project, titlePage: newData });
  }, [project, handleUpdateProject]);

  const handleChange = useCallback((field: keyof TitlePageData, value: string) => {
    setData(prev => {
      const newData = { ...prev, [field]: value };
      triggerUpdate(newData);
      return newData;
    });
  }, [triggerUpdate]);

  const handleAuthorChange = useCallback((index: number, value: string) => {
    setData(prev => {
      const newAuthors = [...(prev.authors || [])];
      newAuthors[index] = value;
      const newData = { ...prev, authors: newAuthors };
      triggerUpdate(newData);
      return newData;
    });
  }, [triggerUpdate]);

  const addAuthor = useCallback(() => {
    setData(prev => {
      const newAuthors = [...(prev.authors || []), ''];
      const newData = { ...prev, authors: newAuthors };
      triggerUpdate(newData);
      return newData;
    });
  }, [triggerUpdate]);

  const removeAuthor = useCallback((index: number) => {
    setData(prev => {
      const newAuthors = (prev.authors || []).filter((_, i) => i !== index);
      if (newAuthors.length === 0) newAuthors.push('');
      const newData = { ...prev, authors: newAuthors };
      triggerUpdate(newData);
      return newData;
    });
  }, [triggerUpdate]);

  const handleTemplateChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    const newTemplate = e.target.value as TemplateKey;
    setSelectedTemplate(newTemplate);

    setData(prev => {
      const currentCredit = prev.credit?.trim();
      const isDefaultCredit = Object.values(TEMPLATES).some(t => t.credit === currentCredit) || !currentCredit;

      if (isDefaultCredit) {
        const newData = { ...prev, credit: TEMPLATES[newTemplate].credit };
        triggerUpdate(newData);
        return newData;
      }
      return prev;
    });
  }, [triggerUpdate]);

  return (
    <div className="flex-1 h-full overflow-hidden bg-app flex flex-col">
      {/* Header */}
      <div className="px-8 py-4 border-b border-border bg-app flex items-center justify-between shrink-0 z-10">
        <div className="flex items-center gap-6">
          <div>
            <h1 className="text-xl font-bold text-text-primary">Title Page</h1>
            <p className="text-xs text-text-secondary">
              Standard screenplay title page formatting.
            </p>
          </div>

          {/* Template Selector */}
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold text-text-muted uppercase tracking-wider">Template</label>
            <select
              value={selectedTemplate}
              onChange={handleTemplateChange}
              className="bg-transparent text-sm font-medium text-text-primary border-none outline-none cursor-pointer hover:text-primary transition-colors pr-2"
            >
              {Object.entries(TEMPLATES).map(([key, tmpl]) => (
                <option key={key} value={key} className="bg-surface text-text-primary">
                  {tmpl.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <SaveIndicator status={saveStatus} />
      </div>

      {/* Content Area - Scrollable */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-8 h-full">
          <div className="flex flex-col lg:flex-row gap-8 h-full max-w-[1400px] mx-auto">

            {/* LEFT: FORM EDITOR */}
            <div className="w-full lg:w-1/2 space-y-6">

              {/* Main Info */}
              <div className="space-y-4 bg-surface p-5 rounded-lg border border-border">
                <h3 className="text-xs font-bold uppercase tracking-wider text-text-muted mb-2">Script Details</h3>

                <div className="space-y-2">
                  <label className="text-xs font-medium text-text-secondary">Title</label>
                  <Input
                    value={data.title || ''}
                    onChange={(e) => handleChange('title', e.target.value)}
                    onBlur={() => saveNow()}
                    placeholder="The Great American Screenplay"
                    className="font-bold"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-text-secondary">Credit</label>
                    <Input
                      value={data.credit || ''}
                      onChange={(e) => handleChange('credit', e.target.value)}
                      onBlur={() => saveNow()}
                      placeholder="Written by"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-medium text-text-secondary">Source</label>
                    <Input
                      value={data.source || ''}
                      onChange={(e) => handleChange('source', e.target.value)}
                      onBlur={() => saveNow()}
                      placeholder="Based on..."
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-medium text-text-secondary">Authors</label>
                  {(data.authors || ['']).map((author, idx) => (
                    <div key={idx} className="flex gap-2">
                      <Input
                        value={author}
                        onChange={(e) => handleAuthorChange(idx, e.target.value)}
                        onBlur={() => saveNow()}
                        placeholder="Jane Doe"
                      />
                      {(data.authors?.length || 0) > 1 && (
                        <Button variant="ghost" size="icon" onClick={() => removeAuthor(idx)}>
                          <X className="w-4 h-4 text-text-muted hover:text-red-400" />
                        </Button>
                      )}
                    </div>
                  ))}
                  <Button variant="secondary" size="sm" onClick={addAuthor} className="mt-2 text-xs w-full justify-center">
                    <Plus className="w-3 h-3 mr-1" /> Add Author
                  </Button>
                </div>
              </div>

              {/* Draft Info */}
              <div className="space-y-4 bg-surface p-5 rounded-lg border border-border">
                <h3 className="text-xs font-bold uppercase tracking-wider text-text-muted mb-2">Draft Information</h3>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-text-secondary">Draft Date</label>
                    <Input
                      value={data.draftDate || ''}
                      onChange={(e) => handleChange('draftDate', e.target.value)}
                      onBlur={() => saveNow()}
                      placeholder="e.g. January 1, 2024"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-medium text-text-secondary">Version</label>
                    <Input
                      value={data.draftVersion || ''}
                      onChange={(e) => handleChange('draftVersion', e.target.value)}
                      onBlur={() => saveNow()}
                      placeholder="e.g. First Draft"
                    />
                  </div>
                </div>
              </div>

              {/* Contact Info */}
              <div className="space-y-4 bg-surface p-5 rounded-lg border border-border">
                <h3 className="text-xs font-bold uppercase tracking-wider text-text-muted mb-2">Contact & Legal</h3>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-text-secondary">Contact Info</label>
                    <Textarea
                      value={data.contact || ''}
                      onChange={(e) => handleChange('contact', e.target.value)}
                      onBlur={() => saveNow()}
                      placeholder="Address, Phone, Email..."
                      className="h-32 resize-none"
                    />
                  </div>

                  <div className="space-y-3">
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-text-secondary">Copyright</label>
                      <Input
                        value={data.copyright || ''}
                        onChange={(e) => handleChange('copyright', e.target.value)}
                        onBlur={() => saveNow()}
                        placeholder="© 2024 Name"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-medium text-text-secondary">WGA Registration</label>
                      <Input
                        value={data.wgaRegistration || ''}
                        onChange={(e) => handleChange('wgaRegistration', e.target.value)}
                        onBlur={() => saveNow()}
                        placeholder="WGA Number"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-text-secondary">Additional Info</label>
                  <Input
                    value={data.additionalInfo || ''}
                    onChange={(e) => handleChange('additionalInfo', e.target.value)}
                    onBlur={() => saveNow()}
                    placeholder="Any other details..."
                  />
                </div>
              </div>
            </div>

            {/* RIGHT: LIVE PREVIEW */}
            <div className="w-full lg:w-1/2 flex items-start justify-center pt-4 lg:pt-0 sticky top-0">
              <div className="w-full max-w-[500px]">
                <div className="text-xs font-bold text-text-muted uppercase tracking-wider mb-2 text-center">Live Preview</div>
                <TitlePagePreview data={data} />
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
};