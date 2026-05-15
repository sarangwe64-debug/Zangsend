import { useState, useEffect } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import { Bold, Italic, List, ListOrdered, Link as LinkIcon, Plus, Save, Search, CheckCircle, Loader2 } from 'lucide-react';
import { useTemplates, type Template } from '../hooks/useTemplates';
// import { supabase } from '../lib/supabase';

export function TemplatesPage() {
  const { templates, loading, saveTemplate } = useTemplates();
  const [activeTab, setActiveTab] = useState<'editor' | 'followups' | 'settings'>('editor');
  const [activeTemplate, setActiveTemplate] = useState<Template | null>(null);
  
  const [subject, setSubject] = useState('');
  const [name, setName] = useState('New Template');
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [selectedAttachments, setSelectedAttachments] = useState<string[]>([]);
  // const [availableAttachments, setAvailableAttachments] = useState<{id: string, filename: string}[]>([]);
  
  /*
  useEffect(() => {
    supabase.from('attachments').select('id, filename').then(({ data }) => {
      if (data) setAvailableAttachments(data);
    });
  }, []);
  */
  
  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({ placeholder: 'Write your email body here...' })
    ],
    content: '',
    editorProps: {
      attributes: {
        class: 'prose prose-invert prose-sm max-w-none focus:outline-none min-h-[300px] text-text-primary',
      },
    },
  });

  useEffect(() => {
    if (activeTemplate && editor) {
      editor.commands.setContent(activeTemplate.body || '');
      setSubject(activeTemplate.subject || '');
      setName(activeTemplate.name || '');
      setSelectedAttachments(activeTemplate.attachment_ids || []);
    } else if (!activeTemplate && editor) {
      editor.commands.setContent('');
      setSubject('');
      setName('New Template');
      setSelectedAttachments([]);
    }
  }, [activeTemplate, editor]);

  const insertVariable = (variable: string) => {
    editor?.commands.insertContent(`{{${variable}}}`);
  };

  const handleSave = async () => {
    if (!editor) return;
    setIsSaving(true);
    setSaveSuccess(false);
    try {
      const saved = await saveTemplate({
        id: activeTemplate?.id,
        name,
        subject,
        body: editor.getHTML(),
        attachment_ids: selectedAttachments,
      });
      setActiveTemplate(saved);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error(err);
      alert('Failed to save template');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="h-full flex">
      {/* Left List Pane */}
      <div className="w-64 border-r border-border flex flex-col bg-surface flex-shrink-0">
        <div className="p-4 border-b border-border flex items-center justify-between">
          <h2 className="font-display font-medium text-sm">Templates</h2>
          <button onClick={() => setActiveTemplate(null)} className="text-text-secondary hover:text-primary transition-colors">
            <Plus className="w-4 h-4" />
          </button>
        </div>
        <div className="p-2 border-b border-border">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2 top-1/2 -translate-y-1/2 text-text-secondary" />
            <input type="text" placeholder="Search..." className="input-field pl-7 h-7 text-xs" />
          </div>
        </div>
        <div className="flex-1 overflow-auto p-2 space-y-1">
          {loading ? (
            <div className="text-center text-text-secondary text-xs p-4">Loading...</div>
          ) : templates.length === 0 ? (
            <div className="text-center text-text-tertiary text-xs p-8">No templates yet. Click + to create one.</div>
          ) : templates.map(t => (
            <div 
              key={t.id} 
              onClick={() => setActiveTemplate(t)}
              className={`p-2 rounded-md border cursor-pointer transition-colors ${activeTemplate?.id === t.id ? 'bg-elevated border-primary/50' : 'bg-transparent border-transparent hover:bg-elevated/50'}`}
            >
              <span className="text-sm font-medium tracking-tight text-text-primary block">{t.name || 'Untitled'}</span>
              <p className="text-xs text-text-secondary truncate mt-0.5">{t.subject || 'No subject'}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Editor Pane */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <div className="h-12 border-b border-border flex items-center justify-between px-6 bg-background flex-shrink-0">
          <div className="flex space-x-4 text-sm font-medium">
            <button className={`pb-3 pt-3 border-b-2 transition-colors ${activeTab === 'editor' ? 'border-primary text-text-primary' : 'border-transparent text-text-secondary hover:text-text-primary'}`} onClick={() => setActiveTab('editor')}>Editor</button>
            <button className={`pb-3 pt-3 border-b-2 transition-colors ${activeTab === 'followups' ? 'border-primary text-text-primary' : 'border-transparent text-text-secondary hover:text-text-primary'}`} onClick={() => setActiveTab('followups')}>Follow-ups</button>
            <button className={`pb-3 pt-3 border-b-2 transition-colors ${activeTab === 'settings' ? 'border-primary text-text-primary' : 'border-transparent text-text-secondary hover:text-text-primary'}`} onClick={() => setActiveTab('settings')}>Settings</button>
          </div>
          <div className="flex items-center gap-3">
            {saveSuccess && (
              <span className="text-xs text-green-400 flex items-center gap-1.5 animate-in fade-in duration-200">
                <CheckCircle className="w-3.5 h-3.5" /> Saved!
              </span>
            )}
            <button onClick={handleSave} disabled={isSaving} className="btn btn-primary text-xs h-8">
              {isSaving ? <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" /> : <Save className="w-3.5 h-3.5 mr-2" />}
              {isSaving ? 'Saving...' : 'Save Template'}
            </button>
          </div>
        </div>

        {/* Editor Area */}
        <div className="flex-1 overflow-auto p-8 max-w-3xl mx-auto w-full">
          {activeTab === 'editor' && (
            <div className="space-y-6">
              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="label">Template Name</label>
                  <input 
                    type="text" 
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="input-field text-sm py-2 h-10 font-medium" 
                    placeholder="e.g. Q3 Intro"
                  />
                </div>


                <div className="flex-[2]">
                  <label className="label">Subject Line</label>
                  <input 
                    type="text" 
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    className="input-field text-base py-2 h-10 font-medium"
                    placeholder="e.g. Quick intro from {{first_name}}"
                  />
                </div>
              </div>

              <div className="border border-border rounded-md bg-surface overflow-hidden flex flex-col shadow-sm">
                {/* Toolbar */}
                <div className="h-10 border-b border-border bg-background flex items-center px-2 space-x-1">
                  <button onClick={() => editor?.chain().focus().toggleBold().run()} className={`p-1.5 rounded hover:bg-elevated ${editor?.isActive('bold') ? 'text-primary' : 'text-text-secondary'}`}><Bold className="w-4 h-4" /></button>
                  <button onClick={() => editor?.chain().focus().toggleItalic().run()} className={`p-1.5 rounded hover:bg-elevated ${editor?.isActive('italic') ? 'text-primary' : 'text-text-secondary'}`}><Italic className="w-4 h-4" /></button>
                  <div className="w-px h-4 bg-border mx-2" />
                  <button onClick={() => editor?.chain().focus().toggleBulletList().run()} className="p-1.5 rounded hover:bg-elevated text-text-secondary"><List className="w-4 h-4" /></button>
                  <button onClick={() => editor?.chain().focus().toggleOrderedList().run()} className="p-1.5 rounded hover:bg-elevated text-text-secondary"><ListOrdered className="w-4 h-4" /></button>
                  <button className="p-1.5 rounded hover:bg-elevated text-text-secondary"><LinkIcon className="w-4 h-4" /></button>
                  <div className="flex-1" />
                  <div className="flex items-center space-x-2 text-xs">
                    <span className="text-text-tertiary">Insert:</span>
                    <button onClick={() => insertVariable('first_name')} className="px-2 py-1 rounded bg-elevated border border-border text-text-secondary hover:text-primary transition-colors">`{'{{first_name}}'}`</button>
                    <button onClick={() => insertVariable('company')} className="px-2 py-1 rounded bg-elevated border border-border text-text-secondary hover:text-primary transition-colors">`{'{{company}}'}`</button>
                  </div>
                </div>
                <div className="p-4 min-h-[300px] text-sm">
                  <EditorContent editor={editor} />
                </div>
              </div>
            </div>
          )}

          {activeTab === 'followups' && (
            <div className="space-y-4">
              <div className="border border-border rounded-md p-4 bg-surface">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-medium text-sm">Follow-up 1</h3>
                  <span className="text-xs text-text-secondary">If no reply after 3 days</span>
                </div>
                <input type="text" defaultValue="Re: Quick question for {{company}}" readOnly className="input-field mb-2 text-text-secondary opacity-70" />
                <textarea className="input-field h-24 py-2" readOnly defaultValue="Just bubbling this up. Any thoughts?" />
              </div>
              <button className="btn border border-border border-dashed w-full text-text-secondary hover:text-primary hover:border-primary transition-colors">
                <Plus className="w-4 h-4 mr-2" /> Add Follow-up Step
              </button>
            </div>
          )}

          {activeTab === 'settings' && (
            <div className="space-y-6">
              <div className="space-y-2">
                <label className="flex items-center space-x-3 cursor-pointer">
                  <input type="checkbox" defaultChecked className="rounded border-border bg-background focus:ring-primary accent-primary w-4 h-4" />
                  <span className="text-sm">Track Opens (adds tracking pixel)</span>
                </label>
                <label className="flex items-center space-x-3 cursor-pointer">
                  <input type="checkbox" className="rounded border-border bg-background focus:ring-primary accent-primary w-4 h-4" />
                  <span className="text-sm">Track Link Clicks</span>
                </label>
              </div>
              <div className="pt-4 border-t border-border">
                <label className="label">Sending Window</label>
                <p className="text-xs text-text-secondary mb-3">Emails using this template will only be sent during these hours.</p>
                <div className="flex gap-2 mb-3">
                  {['M','T','W','T','F','S','S'].map((d, i) => (
                    <button key={i} className={`w-8 h-8 rounded text-xs font-medium ${i < 5 ? 'bg-primary-ghost text-primary-text border border-primary/30' : 'bg-surface border border-border text-text-secondary'}`}>{d}</button>
                  ))}
                </div>
                <div className="flex items-center space-x-2">
                  <input type="time" defaultValue="09:00" className="input-field w-32" />
                  <span className="text-text-secondary text-sm">to</span>
                  <input type="time" defaultValue="17:00" className="input-field w-32" />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
