import React, { useEffect, useState } from 'react';
import { useWorkspace } from '../../layouts/WorkspaceLayout';
import { TitlePageData } from '../../types';
import Input, { Textarea } from '../ui/Input';
import Button from '../ui/Button';
import { Plus, X } from 'lucide-react';
import { debounce } from '../../utils/debounce';
import { SaveIndicator } from '../ui/SaveIndicator';
import { TitlePagePreview } from './TitlePagePreview';

export const TitlePageEditor: React.FC = () => {
  const { project, updateProject } = useWorkspace();
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

  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');

  // Load existing data on mount
  useEffect(() => {
    if (project.titlePage) {
      setData(prev => ({ ...prev, ...project.titlePage }));
    } else {
      // If no title page data, initialize with reasonable defaults
      setData(prev => ({
        ...prev,
        title: project.name,
      }));
    }
  }, [project.titlePage, project.name]);

  const debouncedSave = debounce((newData: TitlePageData) => {
    setSaveStatus('saving');
    updateProject({ titlePage: newData });
    setTimeout(() => setSaveStatus('saved'), 800);
    setTimeout(() => setSaveStatus('idle'), 3000);
  }, 1000);

  const handleChange = (field: keyof TitlePageData, value: string) => {
    const newData = { ...data, [field]: value };
    setData(newData);
    debouncedSave(newData);
  };

  const handleAuthorChange = (index: number, value: string) => {
    const newAuthors = [...(data.authors || [])];
    newAuthors[index] = value;
    const newData = { ...data, authors: newAuthors };
    setData(newData);
    debouncedSave(newData);
  };

  const addAuthor = () => {
    const newAuthors = [...(data.authors || []), ''];
    const newData = { ...data, authors: newAuthors };
    setData(newData);
    debouncedSave(newData);
  };

  const removeAuthor = (index: number) => {
    const newAuthors = (data.authors || []).filter((_, i) => i !== index);
    if (newAuthors.length === 0) newAuthors.push(''); // Always keep at least one
    const newData = { ...data, authors: newAuthors };
    setData(newData);
    debouncedSave(newData);
  };

  return (
    <div className="flex-1 h-full overflow-hidden bg-app flex flex-col">
      {/* Header */}
      <div className="px-8 py-4 border-b border-border bg-app flex items-center justify-between shrink-0 z-10">
        <div>
          <h1 className="text-xl font-bold text-text-primary">Title Page</h1>
          <p className="text-xs text-text-secondary">
            Standard screenplay title page formatting.
          </p>
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
                      placeholder="Written by"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-medium text-text-secondary">Source</label>
                    <Input
                      value={data.source || ''}
                      onChange={(e) => handleChange('source', e.target.value)}
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
                      placeholder="e.g. January 1, 2024"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-medium text-text-secondary">Version</label>
                    <Input
                      value={data.draftVersion || ''}
                      onChange={(e) => handleChange('draftVersion', e.target.value)}
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
                        placeholder="© 2024 Name"
                      />
                    </div>
                    
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-text-secondary">WGA Registration</label>
                      <Input
                        value={data.wgaRegistration || ''}
                        onChange={(e) => handleChange('wgaRegistration', e.target.value)}
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