import { useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Upload, MoreVertical, Search, X, ChevronRight } from 'lucide-react';
import Papa from 'papaparse';
import { useLists } from '../hooks/useLists';

export function ListsPage() {
  const { lists, loading, createList, deleteList } = useLists();
  const [searchQuery, setSearchQuery] = useState('');
  const [uploading, setUploading] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // CSV Mapping State
  const [isMappingModalOpen, setIsMappingModalOpen] = useState(false);
  const [rawCsvData, setRawCsvData] = useState<any[]>([]);
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [pendingListName, setPendingListName] = useState('');
  
  const [mapping, setMapping] = useState({
    first_name: '',
    last_name: '',
    company_name: '',
    title: '',
    email: '',
    linkedin_url: ''
  });

  const autoMatchHeader = (headers: string[], field: string) => {
    const f = field.toLowerCase();
    return headers.find(h => {
      const hn = h.toLowerCase().replace(/[^a-z0-9]/g, '');
      if (f === 'first_name' && (hn === 'firstname' || hn === 'first')) return true;
      if (f === 'last_name' && (hn === 'lastname' || hn === 'last')) return true;
      if (f === 'company_name' && hn.includes('company')) return true;
      if (f === 'title' && (hn === 'title' || hn.includes('job') || hn.includes('position'))) return true;
      if (f === 'email' && hn.includes('email')) return true;
      if (f === 'linkedin_url' && (hn.includes('linkedin') || hn.includes('profile'))) return true;
      return false;
    }) || '';
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const listName = file.name.replace('.csv', '');
    setPendingListName(listName);

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (h) => h.trim().replace(/^\uFEFF/, ''),
      complete: (results) => {
        if (results.data && results.data.length > 0) {
          const headers = Object.keys(results.data[0] as any);
          setCsvHeaders(headers);
          setRawCsvData(results.data);
          
          setMapping({
            first_name: autoMatchHeader(headers, 'first_name'),
            last_name: autoMatchHeader(headers, 'last_name'),
            company_name: autoMatchHeader(headers, 'company_name'),
            title: autoMatchHeader(headers, 'title'),
            email: autoMatchHeader(headers, 'email'),
            linkedin_url: autoMatchHeader(headers, 'linkedin_url')
          });
          
          setIsMappingModalOpen(true);
        } else {
          alert('CSV appears to be empty.');
        }
      },
      error: (error) => {
        console.error('CSV Parse Error:', error);
        alert('Failed to parse CSV file.');
      }
    });
    
    // Reset input
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleConfirmMapping = async () => {
    setIsMappingModalOpen(false);
    setUploading(true);
    
    try {
      const newList = await createList(pendingListName);
      
      const contacts = rawCsvData.map(row => ({
        list_id: newList.id,
        first_name: mapping.first_name ? row[mapping.first_name] : null,
        last_name: mapping.last_name ? row[mapping.last_name] : null,
        company_name: mapping.company_name ? row[mapping.company_name] : null,
        title: mapping.title ? row[mapping.title] : null,
        email: mapping.email ? row[mapping.email] : null,
        linkedin_url: mapping.linkedin_url ? row[mapping.linkedin_url] : null,
        status: 'pending'
      })).filter(c => c.linkedin_url || c.email || c.first_name || c.last_name || c.company_name); 
      
      if (contacts.length === 0) {
        alert('No valid contacts found. Please map at least one field containing data.');
        setUploading(false);
        return;
      }

      const { supabase } = await import('../lib/supabase');
      const { data: { user } } = await supabase.auth.getUser();
      
      const contactsWithUser = contacts.map(c => {
        const { first_name, last_name, company_name, title, linkedin_url, ...rest } = c;
        return {
          ...rest,
          user_id: user?.id,
          data: { first_name, last_name, company_name, title, linkedin_url }
        };
      });
      
      // Insert in chunks to avoid payload too large
      const chunkSize = 100;
      for (let i = 0; i < contactsWithUser.length; i += chunkSize) {
        const { error } = await supabase.from('contacts').insert(contactsWithUser.slice(i, i + chunkSize));
        if (error) throw error;
      }
      
      window.location.reload();
    } catch (err) {
      console.error('Error uploading contacts:', err);
      alert('Failed to process CSV import.');
      setUploading(false);
    }
  };

  const handleDeleteList = async (id: string, name: string) => {
    setActiveDropdown(null); // Close dropdown first
    // Use setTimeout so the confirm dialog doesn't get swallowed by event propagation
    setTimeout(async () => {
      if (window.confirm(`Delete "${name}" and all its contacts? This cannot be undone.`)) {
        try {
          await deleteList(id);
        } catch (err: any) {
          alert('Failed to delete list: ' + (err.message || err));
        }
      }
    }, 50);
  };

  const filteredLists = lists.filter(l => l.name.toLowerCase().includes(searchQuery.toLowerCase()));

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex-shrink-0 flex items-center justify-between px-6 py-4 border-b border-border">
        <div>
          <h1 className="text-xl font-display font-medium tracking-tight">Lists</h1>
          <p className="text-xs text-text-secondary mt-1">Manage and segment your contact lists.</p>
        </div>
        <div className="flex space-x-3">
          <input 
            type="file" 
            accept=".csv" 
            ref={fileInputRef} 
            onChange={handleFileUpload} 
            className="hidden" 
          />
          <button 
            className="btn btn-primary flex items-center space-x-2"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
          >
            <Upload className="w-4 h-4" />
            <span>{uploading ? 'Uploading...' : 'Upload CSV'}</span>
          </button>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex-shrink-0 flex items-center px-6 py-3 border-b border-border space-x-4 bg-surface">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" />
          <input 
            type="text" 
            placeholder="Search lists..." 
            className="input-field pl-9"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* List Grid / Table */}
      <div className="flex-1 overflow-auto p-6">
        {loading ? (
          <div className="flex items-center justify-center h-full text-text-secondary">Loading lists...</div>
        ) : filteredLists.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-text-secondary space-y-4">
            <p>No lists found. Upload a CSV to get started.</p>
            <button className="btn btn-primary text-xs h-8" onClick={() => fileInputRef.current?.click()}>
              <Upload className="w-3.5 h-3.5 mr-2" /> Upload CSV
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredLists.map((list) => (
              <Link to={`/lists/${list.id}`} key={list.id} className="block group relative bg-surface border border-border rounded-lg p-5 hover:border-primary/50 transition-colors cursor-pointer">
                
                <div className="flex justify-between items-start mb-4">
                  <h3 className="font-medium text-text-primary tracking-tight truncate pr-4">{list.name}</h3>
                  <div className="relative">
                    <button 
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setActiveDropdown(activeDropdown === list.id ? null : list.id);
                      }} 
                      className={`text-text-tertiary hover:text-text-primary transition-opacity ${activeDropdown === list.id ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
                    >
                      <MoreVertical className="w-4 h-4" />
                    </button>
                    {activeDropdown === list.id && (
                      <div className="absolute right-0 top-6 bg-surface border border-border shadow-lg rounded py-1 z-20 w-32">
                        <button 
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleDeleteList(list.id, list.name);
                          }}
                          className="w-full text-left px-4 py-2 text-sm text-status-bounced hover:bg-status-bounced/10 transition-colors"
                        >
                          Delete List
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-text-secondary">Contacts</span>
                    <span className="font-mono">{list.rows}</span>
                  </div>
                  
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-text-secondary">Pending</span>
                    <span className="font-mono text-status-pending">{list.pending}</span>
                  </div>
                </div>

                <div className="mt-6 flex items-center justify-between">
                  <span className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full font-medium ${
                    list.status === 'Active' ? 'bg-primary-ghost text-primary-text' :
                    list.status === 'Completed' ? 'bg-border text-text-secondary' :
                    'bg-border text-text-tertiary'
                  }`}>
                    {list.status}
                  </span>
                  
                  <span className="text-xs text-text-tertiary font-mono">
                    {list.lastSent !== 'Never' ? `Sent ${list.lastSent}` : 'Never Sent'}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Mapping Modal */}
      {isMappingModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
          <div className="bg-surface border border-border rounded-lg shadow-xl w-full max-w-2xl p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-lg font-medium text-text-primary">Map CSV Columns</h2>
                <p className="text-sm text-text-secondary mt-1">Match your CSV headers to ZangSends fields.</p>
              </div>
              <button onClick={() => setIsMappingModalOpen(false)} className="text-text-tertiary hover:text-text-primary">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="bg-elevated border border-border rounded-lg overflow-hidden">
              <table className="w-full text-left text-sm">
                <thead className="bg-surface border-b border-border text-text-secondary">
                  <tr>
                    <th className="px-4 py-3 font-medium w-1/3">ZangSends Field</th>
                    <th className="px-4 py-3 font-medium">CSV Column Header</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {[
                    { key: 'first_name', label: 'First Name', required: false },
                    { key: 'last_name', label: 'Last Name', required: false },
                    { key: 'company_name', label: 'Company', required: false },
                    { key: 'title', label: 'Job Title', required: false },
                    { key: 'email', label: 'Email Address', required: true },
                    { key: 'linkedin_url', label: 'LinkedIn URL', required: true }
                  ].map(field => (
                    <tr key={field.key} className="hover:bg-surface transition-colors">
                      <td className="px-4 py-3 font-medium text-text-primary flex items-center">
                        {field.label}
                        {field.required && <span className="ml-1 text-[10px] text-text-tertiary font-normal">(Req*)</span>}
                      </td>
                      <td className="px-4 py-3">
                        <select 
                          className="w-full bg-background border border-border text-text-primary rounded px-3 py-1.5 focus:border-primary focus:ring-1 focus:ring-primary outline-none"
                          value={mapping[field.key as keyof typeof mapping]}
                          onChange={(e) => setMapping({...mapping, [field.key]: e.target.value})}
                        >
                          <option value="">-- Ignore this field --</option>
                          {csvHeaders.map(header => (
                            <option key={header} value={header}>{header}</option>
                          ))}
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <p className="text-xs text-text-tertiary mt-4">* Note: We use LinkedIn URLs to automatically find emails via our Apify Waterfall.</p>

            <div className="mt-6 flex justify-end gap-3">
              <button onClick={() => setIsMappingModalOpen(false)} className="btn border border-border text-text-secondary hover:text-text-primary px-4">Cancel</button>
              <button onClick={handleConfirmMapping} className="btn btn-primary px-6 flex items-center">
                Import {rawCsvData.length} Contacts <ChevronRight className="w-4 h-4 ml-1" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
