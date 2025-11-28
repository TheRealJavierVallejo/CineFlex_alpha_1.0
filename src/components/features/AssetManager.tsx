/*
 * 👥 COMPONENT: ASSET MANAGER
 * ONYX Edition: Industrial Grid
 */

import React, { useState, useEffect, useRef } from 'react';
import { Character, Outfit, ShowToastFn, ImageLibraryItem, Shot, Location } from '../../types';
import { getCharacters, saveCharacters, getOutfits, saveOutfits, getImageLibrary, getLocations, saveLocations } from '../../services/storage';
import { compressImage } from '../../services/image';
import { Plus, Trash2, User, Shirt, Loader2, Image as ImageIcon, Upload, X, Edit2, MapPin, Package } from 'lucide-react';
import Button from '../ui/Button';
import Modal from '../ui/Modal';
import Input from '../ui/Input';
import { PageWithToolRail, Tool } from '../layout/PageWithToolRail';

interface AssetManagerProps {
   projectId: string;
   projectShots: Shot[];
   showToast: ShowToastFn;
}

// --- REUSABLE PANEL CONTENT ---
export const AssetManagerPanel: React.FC<AssetManagerProps> = ({ projectId, projectShots, showToast }) => {
   const [characters, setCharacters] = useState<Character[]>([]);
   const [outfits, setOutfits] = useState<Outfit[]>([]);
   const [locations, setLocations] = useState<Location[]>([]);
   const [isLoading, setIsLoading] = useState(true);
   const [activeTab, setActiveTab] = useState<'assets' | 'locations'>('assets');
   
   // States for creation
   const [newCharName, setNewCharName] = useState('');
   const [newLocName, setNewLocName] = useState('');

   useEffect(() => {
      const loadAssets = async () => {
         setIsLoading(true);
         const [chars, outfs, locs] = await Promise.all([
            getCharacters(projectId),
            getOutfits(projectId),
            getLocations(projectId)
         ]);
         setCharacters(chars);
         setOutfits(outfs);
         setLocations(locs);
         setIsLoading(false);
      };
      loadAssets();
   }, [projectId]);

   const handleAddCharacter = async () => {
      if (!newCharName.trim()) return;
      const newChar: Character = { id: crypto.randomUUID(), name: newCharName, description: '', referencePhotos: [] };
      const updated = [...characters, newChar];
      setCharacters(updated); await saveCharacters(projectId, updated);
      setNewCharName('');
      showToast("Character created", 'success');
   };

   const handleAddLocation = async () => {
      if (!newLocName.trim()) return;
      const newLoc: Location = { id: crypto.randomUUID(), name: newLocName, description: '', referencePhotos: [] };
      const updated = [...locations, newLoc];
      setLocations(updated); await saveLocations(projectId, updated);
      setNewLocName('');
      showToast("Location added", 'success');
   };

   if (isLoading) return <div className="p-4 text-xs text-zinc-500">Loading...</div>;

   return (
      <div className="p-4 space-y-6">
         {/* Tab Switcher */}
         <div className="flex bg-[#18181b] rounded-sm p-0.5 border border-border">
            <button 
                onClick={() => setActiveTab('assets')} 
                className={`flex-1 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-sm transition-colors ${activeTab === 'assets' ? 'bg-primary text-white' : 'text-zinc-500 hover:text-white'}`}
            >
                Cast
            </button>
            <button 
                onClick={() => setActiveTab('locations')} 
                className={`flex-1 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-sm transition-colors ${activeTab === 'locations' ? 'bg-primary text-white' : 'text-zinc-500 hover:text-white'}`}
            >
                Locations
            </button>
         </div>

         {activeTab === 'assets' && (
            <div className="space-y-4">
                <div className="space-y-2">
                    <Input placeholder="NEW CHARACTER NAME" value={newCharName} onChange={e => setNewCharName(e.target.value)} />
                    <Button variant="secondary" className="w-full" size="sm" onClick={handleAddCharacter} disabled={!newCharName} icon={<Plus className="w-3 h-3" />}>Add Character</Button>
                </div>
                
                <div className="space-y-1 max-h-[400px] overflow-y-auto pr-1">
                    {characters.map(char => (
                       <div key={char.id} className="p-2 rounded-sm bg-[#18181b] border border-border flex items-center justify-between group">
                          <div className="flex items-center gap-2 overflow-hidden">
                             <div className="w-6 h-6 bg-black rounded-full flex items-center justify-center shrink-0 border border-zinc-800">
                                {char.referencePhotos?.[0] ? <img src={char.referencePhotos[0]} className="w-full h-full object-cover rounded-full" /> : <User className="w-3 h-3 text-zinc-600" />}
                             </div>
                             <span className="text-xs font-medium text-zinc-300 truncate">{char.name}</span>
                          </div>
                          <span className="text-[9px] text-zinc-600 font-mono">{projectShots.filter(s => s.characterIds.includes(char.id)).length} shots</span>
                       </div>
                    ))}
                    {characters.length === 0 && <div className="text-[10px] text-zinc-600 italic text-center py-2">No characters yet</div>}
                </div>
            </div>
         )}

         {activeTab === 'locations' && (
            <div className="space-y-4">
                <div className="space-y-2">
                    <Input placeholder="NEW LOCATION NAME" value={newLocName} onChange={e => setNewLocName(e.target.value)} />
                    <Button variant="secondary" className="w-full" size="sm" onClick={handleAddLocation} disabled={!newLocName} icon={<Plus className="w-3 h-3" />}>Add Location</Button>
                </div>
                
                <div className="space-y-1 max-h-[400px] overflow-y-auto pr-1">
                    {locations.map(loc => (
                       <div key={loc.id} className="p-2 rounded-sm bg-[#18181b] border border-border flex items-center justify-between">
                          <div className="flex items-center gap-2 overflow-hidden">
                             <MapPin className="w-3 h-3 text-zinc-600 shrink-0" />
                             <span className="text-xs font-medium text-zinc-300 truncate">{loc.name}</span>
                          </div>
                       </div>
                    ))}
                    {locations.length === 0 && <div className="text-[10px] text-zinc-600 italic text-center py-2">No locations yet</div>}
                </div>
            </div>
         )}
      </div>
   );
};

// --- FULL PAGE COMPONENT (Wraps panel in layout) ---
export const AssetManager: React.FC<AssetManagerProps> = (props) => {
   const tools: Tool[] = [
       {
           id: 'manager',
           label: 'Quick Assets',
           icon: <Package className="w-5 h-5" />,
           content: <AssetManagerPanel {...props} />
       }
   ];

   return (
    <PageWithToolRail tools={tools} defaultTool="manager">
      <div className="flex flex-col h-full bg-black items-center justify-center text-zinc-600">
          <Package className="w-16 h-16 mb-4 opacity-20" />
          <p className="text-sm font-mono uppercase tracking-widest">Select an Asset Tool</p>
      </div>
    </PageWithToolRail>
   );
};