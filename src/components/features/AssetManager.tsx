/*
 * 👥 COMPONENT: ASSET MANAGER
 * ONYX Edition: Industrial Grid
 */

import React, { useState, useEffect, useRef } from 'react';
import { Character, Outfit, ShowToastFn, ImageLibraryItem, Shot, Location } from '../../types';
import { getCharacters, saveCharacters, getOutfits, saveOutfits, getImageLibrary, getLocations, saveLocations } from '../../services/storage';
import { compressImage } from '../../services/image';
import { Plus, Trash2, User, Shirt, Loader2, Image as ImageIcon, Upload, X, AlertTriangle, Edit2, CheckCircle, MapPin, Package } from 'lucide-react';
import Button from '../ui/Button';
import Modal from '../ui/Modal';
import Input from '../ui/Input';
import { PageWithToolRail, Tool } from '../layout/PageWithToolRail';

interface AssetManagerProps {
   projectId: string;
   projectShots: Shot[];
   showToast: ShowToastFn;
}

export const AssetManager: React.FC<AssetManagerProps> = ({ projectId, projectShots, showToast }) => {
   const [characters, setCharacters] = useState<Character[]>([]);
   const [outfits, setOutfits] = useState<Outfit[]>([]);
   const [locations, setLocations] = useState<Location[]>([]);
   const [library, setLibrary] = useState<ImageLibraryItem[]>([]);
   const [isLoading, setIsLoading] = useState(true);
   const [activeTab, setActiveTab] = useState<'assets' | 'locations' | 'gallery'>('assets');
   const [gallerySection, setGallerySection] = useState<'selected' | 'all'>('all');
   const [selectedCharId, setSelectedCharId] = useState<string | null>(null);

   // States for creation/edit
   const [newCharName, setNewCharName] = useState('');
   const [newCharDesc, setNewCharDesc] = useState('');
   const [newOutfitName, setNewOutfitName] = useState('');
   const [newOutfitDesc, setNewOutfitDesc] = useState('');
   const [newLocName, setNewLocName] = useState('');
   const [newLocDesc, setNewLocDesc] = useState('');

   const [isUploading, setIsUploading] = useState(false);
   const [uploadTarget, setUploadTarget] = useState<{ type: 'character' | 'outfit' | 'location', id: string } | null>(null);
   const [previewImage, setPreviewImage] = useState<string | null>(null);
   const [editingItem, setEditingItem] = useState<{ type: 'character' | 'outfit' | 'location', id: string, name: string, description: string } | null>(null);
   const [editName, setEditName] = useState('');
   const [editDesc, setEditDesc] = useState('');
   const [deleteConfirm, setDeleteConfirm] = useState<{ type: 'character' | 'outfit' | 'location', id: string, name: string } | null>(null);
   const fileInputRef = useRef<HTMLInputElement>(null);

   useEffect(() => {
      if (editingItem) {
         setEditName(editingItem.name);
         setEditDesc(editingItem.description);
      }
   }, [editingItem]);

   useEffect(() => {
      const loadAssets = async () => {
         setIsLoading(true);
         const [chars, outfs, locs, lib] = await Promise.all([
            getCharacters(projectId),
            getOutfits(projectId),
            getLocations(projectId),
            getImageLibrary(projectId)
         ]);
         setCharacters(chars);
         setOutfits(outfs);
         setLocations(locs);
         setLibrary(lib);
         setIsLoading(false);
      };
      loadAssets();
   }, [projectId, activeTab]);

   const isImageUsed = (imageUrl: string) => projectShots.some(shot => shot.generatedImage === imageUrl);
   const getUsageCount = (type: 'character' | 'outfit' | 'location', id: string) => {
       if (type === 'character') return projectShots.filter(s => s.characterIds?.includes(id)).length;
       if (type === 'location') return projectShots.filter(s => s.locationId === id).length;
       return 0; 
   };

   const handleUpdateAsset = async () => {
      if (!editingItem || !editName.trim()) return;
      if (editingItem.type === 'character') {
         const updated = characters.map(c => c.id === editingItem.id ? { ...c, name: editName, description: editDesc } : c);
         setCharacters(updated); await saveCharacters(projectId, updated);
      } else if (editingItem.type === 'outfit') {
         const updated = outfits.map(o => o.id === editingItem.id ? { ...o, name: editName, description: editDesc } : o);
         setOutfits(updated); await saveOutfits(projectId, updated);
      } else {
         const updated = locations.map(l => l.id === editingItem.id ? { ...l, name: editName, description: editDesc } : l);
         setLocations(updated); await saveLocations(projectId, updated);
      }
      showToast("Updated", 'success');
      setEditingItem(null);
   };

   // CRUD Handlers
   const handleAddCharacter = async () => {
      if (!newCharName.trim()) return;
      const newChar: Character = { id: crypto.randomUUID(), name: newCharName, description: newCharDesc, referencePhotos: [] };
      const updated = [...characters, newChar];
      setCharacters(updated); await saveCharacters(projectId, updated);
      setNewCharName(''); setNewCharDesc('');
      showToast("Character created", 'success');
   };

   const handleDeleteCharacter = async (id: string) => {
      const updated = characters.filter(c => c.id !== id);
      setCharacters(updated); await saveCharacters(projectId, updated);
      const updatedOutfits = outfits.filter(o => o.characterId !== id);
      setOutfits(updatedOutfits); await saveOutfits(projectId, updatedOutfits);
      if (selectedCharId === id) setSelectedCharId(null);
      setDeleteConfirm(null); showToast("Character deleted", 'success');
   };

   const handleAddOutfit = async () => {
      if (!selectedCharId || !newOutfitName.trim()) return;
      const newOutfit: Outfit = { id: crypto.randomUUID(), characterId: selectedCharId, name: newOutfitName, description: newOutfitDesc, referencePhotos: [] };
      const updated = [...outfits, newOutfit];
      setOutfits(updated); await saveOutfits(projectId, updated);
      setNewOutfitName(''); setNewOutfitDesc(''); showToast("Outfit added", 'success');
   };

   const handleDeleteOutfit = async (id: string) => {
      const updated = outfits.filter(o => o.id !== id);
      setOutfits(updated); await saveOutfits(projectId, updated);
      setDeleteConfirm(null); showToast("Outfit deleted", 'success');
   };

   const handleAddLocation = async () => {
      if (!newLocName.trim()) return;
      const newLoc: Location = { id: crypto.randomUUID(), name: newLocName, description: newLocDesc, referencePhotos: [] };
      const updated = [...locations, newLoc];
      setLocations(updated); await saveLocations(projectId, updated);
      setNewLocName(''); setNewLocDesc(''); showToast("Location added", 'success');
   };

   const handleDeleteLocation = async (id: string) => {
      const updated = locations.filter(l => l.id !== id);
      setLocations(updated); await saveLocations(projectId, updated);
      setDeleteConfirm(null); showToast("Location deleted", 'success');
   };

   // Image Handlers
   const triggerImageUpload = (type: 'character' | 'outfit' | 'location', id: string) => {
      setUploadTarget({ type, id });
      fileInputRef.current?.click();
   };

   const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (!files || files.length === 0 || !uploadTarget) return;
      setIsUploading(true);
      try {
         const newPhotos: string[] = [];
         for (let i = 0; i < files.length; i++) newPhotos.push(await compressImage(files[i]));
         if (newPhotos.length === 0) throw new Error("No valid images");

         if (uploadTarget.type === 'character') {
            const updated = characters.map(c => c.id === uploadTarget.id ? { ...c, referencePhotos: [...(c.referencePhotos || []), ...newPhotos] } : c);
            setCharacters(updated); await saveCharacters(projectId, updated);
         } else if (uploadTarget.type === 'outfit') {
            const updated = outfits.map(o => o.id === uploadTarget.id ? { ...o, referencePhotos: [...(o.referencePhotos || []), ...newPhotos] } : o);
            setOutfits(updated); await saveOutfits(projectId, updated);
         } else if (uploadTarget.type === 'location') {
            const updated = locations.map(l => l.id === uploadTarget.id ? { ...l, referencePhotos: [...(l.referencePhotos || []), ...newPhotos] } : l);
            setLocations(updated); await saveLocations(projectId, updated);
         }
         showToast("Photos uploaded", 'success');
      } catch (e) { showToast("Upload failed", 'error'); } 
      finally { setIsUploading(false); setUploadTarget(null); if (fileInputRef.current) fileInputRef.current.value = ''; }
   };

   const handleDeletePhoto = async (type: 'character' | 'outfit' | 'location', id: string, idx: number) => {
      if (type === 'character') {
         const updated = characters.map(c => c.id === id ? { ...c, referencePhotos: c.referencePhotos?.filter((_, i) => i !== idx) } : c);
         setCharacters(updated); await saveCharacters(projectId, updated);
      } else if (type === 'outfit') {
         const updated = outfits.map(o => o.id === id ? { ...o, referencePhotos: o.referencePhotos?.filter((_, i) => i !== idx) } : o);
         setOutfits(updated); await saveOutfits(projectId, updated);
      } else {
         const updated = locations.map(l => l.id === id ? { ...l, referencePhotos: l.referencePhotos?.filter((_, i) => i !== idx) } : l);
         setLocations(updated); await saveLocations(projectId, updated);
      }
   };

   // --- TOOL RAIL ---
   const tools: Tool[] = [
       {
           id: 'cast',
           label: 'Cast & Characters',
           icon: <User className="w-5 h-5" />,
           content: (
               <div className="p-4 space-y-4">
                    <div className="space-y-2">
                        <Input placeholder="NEW CHARACTER" value={newCharName} onChange={e => setNewCharName(e.target.value)} />
                        <Button variant="secondary" className="w-full" size="sm" onClick={handleAddCharacter} disabled={!newCharName} icon={<Plus className="w-4 h-4" />}>Add</Button>
                    </div>
                    <div className="space-y-1">
                        {characters.map(char => (
                           <div key={char.id} onClick={() => { setSelectedCharId(char.id); setActiveTab('assets'); }} className={`p-2 rounded-sm cursor-pointer transition-colors group relative flex items-center justify-between ${activeTab === 'assets' && selectedCharId === char.id ? 'bg-[#18181b] border-l-2 border-primary text-white' : 'hover:bg-[#18181b] text-zinc-500'}`}>
                              <span className="text-xs font-bold uppercase truncate">{char.name}</span>
                           </div>
                        ))}
                    </div>
               </div>
           )
       },
       {
           id: 'locations',
           label: 'Locations',
           icon: <MapPin className="w-5 h-5" />,
           content: (
               <div className="p-4 space-y-4">
                   <button onClick={() => setActiveTab('locations')} className={`w-full text-left px-3 py-2 rounded-sm text-xs font-bold uppercase transition-colors ${activeTab === 'locations' ? 'bg-[#18181b] text-white' : 'text-zinc-500 hover:text-white'}`}>Manage Locations</button>
                   <div className="space-y-1">
                       {locations.map(loc => (
                           <div key={loc.id} className="px-3 py-1.5 text-xs text-zinc-500 truncate">{loc.name}</div>
                       ))}
                   </div>
               </div>
           )
       },
       {
           id: 'gallery',
           label: 'Image Gallery',
           icon: <ImageIcon className="w-5 h-5" />,
           content: (
               <div className="p-4">
                   <button onClick={() => setActiveTab('gallery')} className={`w-full text-left px-3 py-2 rounded-sm text-xs font-bold uppercase transition-colors ${activeTab === 'gallery' ? 'bg-[#18181b] text-white' : 'text-zinc-500 hover:text-white'}`}>Open Gallery</button>
                   <p className="mt-2 text-[10px] text-zinc-600">Browse all generated images.</p>
               </div>
           )
       }
   ];

   if (isLoading) return <div className="h-full flex items-center justify-center bg-black text-zinc-500 font-mono text-xs uppercase tracking-widest">Loading Database...</div>;

   return (
    <PageWithToolRail tools={tools} defaultTool="cast">
      <div className="flex flex-col h-full bg-black overflow-hidden font-sans pl-10 pt-4">
         <input type="file" ref={fileInputRef} className="hidden" accept="image/*" multiple onChange={handleFileChange} />

         {/* Modals */}
         {editingItem && (
            <Modal isOpen={true} onClose={() => setEditingItem(null)} title={`EDIT ${editingItem.type.toUpperCase()}`} size="sm">
               <div className="space-y-4">
                  <Input label="Name" value={editName} onChange={(e) => setEditName(e.target.value)} />
                  <div>
                     <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1.5">Description</label>
                     <textarea value={editDesc} onChange={(e) => setEditDesc(e.target.value)} className="w-full bg-[#050505] border border-zinc-800 text-zinc-200 text-xs px-3 py-2 rounded-sm outline-none focus:border-primary min-h-[100px] resize-none" />
                  </div>
                  <div className="flex gap-2 justify-end pt-2">
                     <Button variant="secondary" onClick={() => setEditingItem(null)}>Cancel</Button>
                     <Button variant="primary" onClick={handleUpdateAsset}>Save</Button>
                  </div>
               </div>
            </Modal>
         )}

         {/* ... (Delete Confirm Modal & Preview Image Modal remain same) ... */}
         {deleteConfirm && (
            <Modal isOpen={true} onClose={() => setDeleteConfirm(null)} title="CONFIRM DELETION" size="sm">
               <div className="space-y-6">
                  <div className="text-zinc-400 text-xs">
                     <p>Permanently delete <strong className="text-white">{deleteConfirm.name}</strong>?</p>
                     {getUsageCount(deleteConfirm.type, deleteConfirm.id) > 0 && <p className="text-red-500 font-bold mt-2">Active in {getUsageCount(deleteConfirm.type, deleteConfirm.id)} shots.</p>}
                  </div>
                  <div className="flex gap-2 justify-end">
                     <Button variant="secondary" onClick={() => setDeleteConfirm(null)}>Cancel</Button>
                     <Button variant="danger" onClick={() => {
                        if (deleteConfirm.type === 'character') handleDeleteCharacter(deleteConfirm.id);
                        else if (deleteConfirm.type === 'outfit') handleDeleteOutfit(deleteConfirm.id);
                        else handleDeleteLocation(deleteConfirm.id);
                     }}>Delete</Button>
                  </div>
               </div>
            </Modal>
         )}

         {previewImage && (
            <div className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center p-8 animate-in fade-in" onClick={() => setPreviewImage(null)}>
               <img src={previewImage} className="max-w-full max-h-full object-contain" />
               <button onClick={() => setPreviewImage(null)} className="absolute top-4 right-4 text-zinc-500 hover:text-white p-2"><X className="w-6 h-6" /></button>
            </div>
         )}

         {/* CONTENT AREA (REFACTORED TO REMOVE SIDEBAR DUPLICATION) */}
         <div className="flex-1 overflow-hidden pr-4 pb-4">
            
            {/* 1. GALLERY */}
            {activeTab === 'gallery' && (
               <div className="h-full flex flex-col">
                  <div className="p-3 border-b border-zinc-800 flex items-center justify-between bg-[#050505]">
                     <div className="flex gap-2">
                        <Button variant={gallerySection === 'all' ? 'primary' : 'ghost'} size="sm" onClick={() => setGallerySection('all')}>All ({library.length})</Button>
                        <Button variant={gallerySection === 'selected' ? 'primary' : 'ghost'} size="sm" onClick={() => setGallerySection('selected')}>Used in Edit ({library.filter(i => isImageUsed(i.url)).length})</Button>
                     </div>
                  </div>
                  <div className="flex-1 overflow-y-auto p-4 bg-black">
                     <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-px bg-zinc-900 border border-zinc-900">
                        {(gallerySection === 'selected' ? library.filter(img => isImageUsed(img.url)) : library).map((item) => (
                           <div key={item.id} className="aspect-video bg-black group relative cursor-pointer" onClick={() => setPreviewImage(item.url)}>
                              <img src={item.url} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
                              <div className="absolute inset-0 border-2 border-transparent group-hover:border-primary/50 pointer-events-none"></div>
                           </div>
                        ))}
                     </div>
                  </div>
               </div>
            )}

            {/* 2. LOCATIONS */}
            {activeTab === 'locations' && (
               <div className="h-full flex p-0 gap-6">
                  {/* Create Form (Moved from sidebar to main area top) */}
                  <div className="w-[300px] bg-[#050505] p-4 flex flex-col gap-4 border border-zinc-800 rounded-sm h-fit">
                     <h3 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">New Location</h3>
                     <div className="space-y-2">
                        <Input placeholder="LOCATION NAME" value={newLocName} onChange={e => setNewLocName(e.target.value)} />
                        <textarea placeholder="VISUAL DESCRIPTION" value={newLocDesc} onChange={e => setNewLocDesc(e.target.value)} className="w-full bg-black border border-zinc-800 text-zinc-300 text-xs px-3 py-2 rounded-sm outline-none focus:border-primary h-24 resize-none placeholder:text-zinc-700" />
                        <Button variant="secondary" className="w-full" onClick={handleAddLocation} disabled={!newLocName}>Create Asset</Button>
                     </div>
                  </div>

                  {/* List */}
                  <div className="flex-1 overflow-y-auto bg-black">
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-5xl">
                        {locations.map(loc => (
                           <div key={loc.id} className="bg-[#09090b] border border-zinc-800 p-4 group relative hover:border-zinc-700 transition-colors">
                               <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <button onClick={() => setEditingItem({ type: 'location', id: loc.id, name: loc.name, description: loc.description })} className="text-zinc-600 hover:text-white p-1.5"><Edit2 className="w-3.5 h-3.5" /></button>
                                  <button onClick={() => setDeleteConfirm({ type: 'location', id: loc.id, name: loc.name })} className="text-zinc-600 hover:text-red-500 p-1.5"><Trash2 className="w-3.5 h-3.5" /></button>
                               </div>
                               <h4 className="font-bold text-zinc-200 text-sm font-mono uppercase tracking-wide">{loc.name}</h4>
                               <p className="text-xs text-zinc-500 mb-4 mt-1 font-mono">{loc.description}</p>
                               <div className="flex gap-2 pt-3 border-t border-zinc-900 overflow-x-auto">
                                   <button onClick={() => triggerImageUpload('location', loc.id)} className="w-12 h-12 border border-dashed border-zinc-800 flex items-center justify-center hover:border-primary hover:text-primary text-zinc-700 transition-colors shrink-0">
                                      {isUploading && uploadTarget?.id === loc.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                                   </button>
                                   {loc.referencePhotos?.map((p, i) => (
                                      <div key={i} className="relative w-12 h-12 group/img shrink-0">
                                         <img src={p} className="w-full h-full object-cover border border-zinc-800 cursor-pointer" onClick={() => setPreviewImage(p)} />
                                         <button onClick={() => handleDeletePhoto('location', loc.id, i)} className="absolute inset-0 bg-black/80 flex items-center justify-center opacity-0 group-hover/img:opacity-100 text-white"><X className="w-4 h-4" /></button>
                                      </div>
                                   ))}
                               </div>
                           </div>
                        ))}
                     </div>
                  </div>
               </div>
            )}

            {/* 3. ASSETS (CAST) */}
            {activeTab === 'assets' && (
               <div className="flex h-full bg-black">
                  {/* Character Detail / Wardrobe */}
                  <div className="flex-1 bg-black flex flex-col border border-zinc-800 rounded-sm overflow-hidden">
                     {!selectedCharId ? (
                        <div className="flex-1 flex flex-col items-center justify-center text-zinc-800">
                           <User className="w-16 h-16 mb-4 opacity-10" />
                           <span className="text-xs font-mono uppercase tracking-widest">Select Character from Sidebar</span>
                        </div>
                     ) : (
                        <div className="flex-1 flex flex-col">
                            {/* Character Header */}
                            <div className="h-16 border-b border-zinc-800 p-4 flex items-center justify-between bg-[#050505]">
                               <div className="flex items-center gap-4">
                                   <div className="w-10 h-10 border border-zinc-800 bg-black flex items-center justify-center text-zinc-700">
                                      <User className="w-5 h-5" />
                                   </div>
                                   <div>
                                      <h2 className="text-sm font-bold text-white uppercase tracking-wider">{characters.find(c => c.id === selectedCharId)?.name}</h2>
                                      <div className="flex gap-2 mt-1">
                                          <button onClick={() => setEditingItem({ type: 'character', id: selectedCharId, name: characters.find(c => c.id === selectedCharId)!.name, description: characters.find(c => c.id === selectedCharId)!.description })} className="text-[10px] text-zinc-500 hover:text-white uppercase tracking-wider flex items-center gap-1"><Edit2 className="w-3 h-3" /> Edit Profile</button>
                                          <button onClick={() => setDeleteConfirm({ type: 'character', id: selectedCharId, name: characters.find(c => c.id === selectedCharId)!.name })} className="text-[10px] text-zinc-500 hover:text-red-500 uppercase tracking-wider flex items-center gap-1"><Trash2 className="w-3 h-3" /> Delete</button>
                                      </div>
                                   </div>
                               </div>
                               <div className="flex gap-2">
                                   <button onClick={() => triggerImageUpload('character', selectedCharId)} className="h-8 px-3 border border-zinc-800 hover:border-primary text-zinc-500 hover:text-white text-[10px] font-bold uppercase tracking-wide flex items-center gap-2 transition-colors">
                                      {isUploading && uploadTarget?.id === selectedCharId ? <Loader2 className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />} Face Ref
                                   </button>
                               </div>
                            </div>
                            
                            {/* Face Refs Row */}
                            <div className="p-4 border-b border-zinc-900 bg-[#09090b]">
                                <div className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest mb-3">Face References</div>
                                <div className="flex gap-2 overflow-x-auto pb-1">
                                    {characters.find(c => c.id === selectedCharId)?.referencePhotos?.length === 0 && <span className="text-[10px] text-zinc-700 italic">No reference photos loaded.</span>}
                                    {characters.find(c => c.id === selectedCharId)?.referencePhotos?.map((p, i) => (
                                       <div key={i} className="relative w-16 h-16 group/img shrink-0 border border-zinc-800 hover:border-zinc-500 transition-colors">
                                          <img src={p} className="w-full h-full object-cover cursor-pointer" onClick={() => setPreviewImage(p)} />
                                          <button onClick={() => handleDeletePhoto('character', selectedCharId, i)} className="absolute top-0 right-0 bg-black text-white p-0.5 opacity-0 group-hover/img:opacity-100"><X className="w-3 h-3" /></button>
                                       </div>
                                    ))}
                                </div>
                            </div>

                            {/* Wardrobe Section */}
                            <div className="flex-1 p-4 bg-black overflow-y-auto">
                                <div className="flex items-center justify-between mb-4">
                                   <div className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest">Outfits</div>
                                </div>
                                
                                {/* Add Outfit */}
                                <div className="flex gap-2 mb-6 p-3 border border-zinc-900 bg-[#050505]">
                                    <input value={newOutfitName} onChange={e => setNewOutfitName(e.target.value)} placeholder="OUTFIT NAME" className="bg-transparent border-b border-zinc-800 text-xs text-white w-40 px-2 outline-none focus:border-primary" />
                                    <input value={newOutfitDesc} onChange={e => setNewOutfitDesc(e.target.value)} placeholder="DESCRIPTION" className="bg-transparent border-b border-zinc-800 text-xs text-zinc-400 flex-1 px-2 outline-none focus:border-primary" onKeyDown={(e) => e.key === 'Enter' && handleAddOutfit()} />
                                    <Button variant="ghost" size="sm" icon={<Plus className="w-3 h-3" />} onClick={handleAddOutfit} disabled={!newOutfitName} />
                                </div>

                                <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                                   {outfits.filter(o => o.characterId === selectedCharId).map(outfit => (
                                      <div key={outfit.id} className="border border-zinc-800 bg-[#09090b] p-4 group relative hover:border-zinc-700 transition-colors">
                                         <div className="flex justify-between items-start mb-2">
                                            <div className="flex items-center gap-3">
                                               <div className="w-8 h-8 bg-black border border-zinc-800 flex items-center justify-center text-zinc-700"><Shirt className="w-4 h-4" /></div>
                                               <div>
                                                  <div className="text-zinc-200 text-xs font-bold uppercase tracking-wide">{outfit.name}</div>
                                                  <div className="text-[10px] text-zinc-500 font-mono">{outfit.description}</div>
                                               </div>
                                            </div>
                                            <div className="flex gap-1 opacity-0 group-hover:opacity-100">
                                               <button onClick={() => setEditingItem({ type: 'outfit', id: outfit.id, name: outfit.name, description: outfit.description })} className="text-zinc-600 hover:text-white p-1"><Edit2 className="w-3 h-3" /></button>
                                               <button onClick={() => setDeleteConfirm({ type: 'outfit', id: outfit.id, name: outfit.name })} className="text-zinc-600 hover:text-red-500 p-1"><Trash2 className="w-3 h-3" /></button>
                                            </div>
                                         </div>
                                         <div className="flex gap-2 pt-3 border-t border-zinc-900 overflow-x-auto">
                                             <button onClick={() => triggerImageUpload('outfit', outfit.id)} className="w-10 h-10 border border-dashed border-zinc-800 flex items-center justify-center text-zinc-700 hover:text-white hover:border-zinc-500 transition-colors shrink-0">
                                                {isUploading && uploadTarget?.id === outfit.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
                                             </button>
                                             {outfit.referencePhotos?.map((p, i) => (
                                                <div key={i} className="relative w-10 h-10 group/img shrink-0 border border-zinc-800">
                                                   <img src={p} className="w-full h-full object-cover cursor-pointer" onClick={() => setPreviewImage(p)} />
                                                   <button onClick={() => handleDeletePhoto('outfit', outfit.id, i)} className="absolute inset-0 bg-black/80 flex items-center justify-center opacity-0 group-hover/img:opacity-100 text-white"><X className="w-3 h-3" /></button>
                                                </div>
                                             ))}
                                         </div>
                                      </div>
                                   ))}
                                </div>
                            </div>
                        </div>
                     )}
                  </div>
               </div>
            )}
         </div>
      </div>
    </PageWithToolRail>
   );
};