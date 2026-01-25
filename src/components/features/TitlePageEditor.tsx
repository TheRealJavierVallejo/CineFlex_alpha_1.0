import React, { useEffect, useState } from 'react';
import { useWorkspace } from '../../layouts/WorkspaceLayout';
import { TitlePageData } from '../../types';
import Input from '../ui/Input';
import Button from '../ui/Button';
import { Plus, X, Save } from 'lucide-react';
import { debounce } from '../../utils/debounce';
import { SaveIndicator } from '../ui/SaveIndicator';

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
    <div className="flex-1 h-full overflow-y-auto bg-app p-8 flex justify-center">
      <div className="w-full max-w-2xl space-y-8">

        <div className="flex items-center justify-between border-b border-border pb-4">
          <div>
            <h1 className="text-2xl font-bold text-text-primary">Title Page</h1>
            <p className="text-sm text-text-secondary mt-1">
              Standard title page formatting for screenplay exports.
            </p>
          </div>
          <SaveIndicator status={saveStatus} />
        </div>

        <div className="space-y-6">
          {/* Main Info */}
          <div className="space-y-4 bg-surface p-6 rounded-lg border border-border">
            <h3 className="text-sm font-bold uppercase tracking-wider text-text-muted mb-4">Script Details</h3>
            
            <div className="space-y-2">
              <label className="text-sm font-medium text-text-secondary">Title</label>
              <Input
                value={data.title || ''}
                onChange={(e) => handleChange('title', e.target.value)}
                placeholder="The Great American Screenplay"
                className="text-lg font-bold"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-text-secondary">Credit</label>
                <Input
                  value={data.credit || ''}
                  onChange={(e) => handleChange('credit', e.target.value)}
                  placeholder="Written by"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-text-secondary">Source Material (Optional)</label>
                <Input
                  value={data.source || ''}
                  onChange={(e) => handleChange('source', e.target.value)}
                  placeholder="Based on..."
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-text-secondary">Authors</label>
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
              <Button variant="secondary" size="sm" onClick={addAuthor} className="mt-2 text-xs">
                <Plus className="w-3 h-3 mr-1" /> Add Author
              </Button>
            </div>
          </div>

          {/* Draft Info */}
          <div className="space-y-4 bg-surface p-6 rounded-lg border border-border">
            <h3 className="text-sm font-bold uppercase tracking-wider text-text-muted mb-4">Draft Information</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-text-secondary">Draft Date</label>
                <Input
                  value={data.draftDate || ''}
                  onChange={(e) => handleChange('draftDate', e.target.value)}
                  placeholder="e.g. January 1, 2024"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-text-secondary">Draft Version (Optional)</label>
                <Input
                  value={data.draftVersion || ''}
                  onChange={(e) => handleChange('draftVersion', e.target.value)}
                  placeholder="e.g. First Draft, Blue Draft"
                />
              </div>
            </div>
          </div>

          {/* Contact Info */}
          <div className="space-y-4 bg-surface p-6 rounded-lg border border-border">
            <h3 className="text-sm font-bold uppercase tracking-wider text-text-muted mb-4">Contact & Legal</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-text-secondary">Contact Info</label>
                <textarea
                  value={data.contact || ''}
                  onChange={(e) => handleChange('contact', e.target.value)}
                  placeholder="Address, Phone, Email..."
                  className="w-full h-24 bg-surface-secondary border border-border rounded-md p-3 text-sm text-text-primary resize-none outline-none focus:border-primary"
                />
              </div>

              <div className="space-y-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-text-secondary">Copyright</label>
                  <Input
                    value={data.copyright || ''}
                    onChange={(e) => handleChange('copyright', e.target.value)}
                    placeholder="© 2024 Name"
                  />
                </div>
                
                <div className="space-y-2 mt-4">
                  <label className="text-sm font-medium text-text-secondary">WGA Registration (Optional)</label>
                  <Input
                    value={data.wgaRegistration || ''}
                    onChange={(e) => handleChange('wgaRegistration', e.target.value)}
                    placeholder="WGA Number"
                  />
                </div>
              </div>
            </div>

             <div className="space-y-2">
                <label className="text-sm font-medium text-text-secondary">Additional Info</label>
                <Input
                  value={data.additionalInfo || ''}
                  onChange={(e) => handleChange('additionalInfo', e.target.value)}
                  placeholder="Any other details..."
                />
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};