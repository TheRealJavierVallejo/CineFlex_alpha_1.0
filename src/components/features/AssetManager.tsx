/*
 * 👥 COMPONENT: ASSET MANAGER (The Media Bin)
 * Pro NLE Layout: Master-Detail Lists & Dense Grids
 */

import React, { useState, useEffect, useRef } from 'react';
import { Character, Outfit, ShowToastFn, ImageLibraryItem, Shot, Location } from '../../types';
import { getCharacters, saveCharacters, getOutfits, saveOutfits, getImageLibrary, getLocations, saveLocations } from '../../services/storage';
import { compressImage } from '../../services/image';
import { Plus, Trash2, User, Shirt, Loader2, Image as ImageIcon, Upload, X, AlertTriangle, CheckCircle, Edit2, MapPin, Search } from 'lucide-react';
import Button from '../ui/Button';
import Modal from '../ui/Modal';

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

   // Creation States
   const [newCharName, setNewCharName] = useState('');
   const [newCharDesc, setNewCharDesc] = useState('');
   const [newOutfitName, setNewOutfitName] = useState('');
   const [newOutfitDesc, setNewOutfitDesc] = useState('');
   const [newLocName, setNewLocName] = useState('');
   const [newLocDesc, setNewLocDesc] = useState('');

   // Operation States
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

   // Helper to check if an image from the library is currently used in the timeline
   const isImageUsed = (imageUrl: string) => {
      return projectShots.some(shot => shot.generatedImage === imageUrl);
   };
   
   const getUsageCount = (type: 'character' | 'outfit' | 'location', id: string) => {
       if (type === 'character') return projectShots.filter(s => s.characterIds?.includes(id)).length;
       if (type === 'location') return projectShots.filter(s => s.locationId === id).length;
       return 0;
   };

   const usedImagesCount = library.filter(img => isImageUsed(img.url)).length;

   const handleUpdateAsset = async () => {
      if (!editingItem || !editName.trim()) return;

      if (editingItem.type === 'character') {
         const updated = characters.map(c => c.id === editingItem.id ? { ...c, name: editName, description: editDesc } : c);
         setCharacters(updated);
         await saveCharacters(projectId, updated);
      } else if (editingItem.type === 'outfit') {
         const updated = outfits.map(o => o.id === editingItem.id ? { ...o, name: editName, description: editDesc } : o);
         setOutfits(updated);
         await saveOutfits(projectId, updated);
      } else {
         const updated = locations.map(l => l.id === editingItem.id ? { ...l, name: editName, description: editDesc } : l);
         setLocations(updated);
         await saveLocations(projectId, updated);
      }
      showToast("Updated successfully", 'success');
      setEditingItem(null);
   };

   // --- ACTIONS ---
   const handleAddCharacter = async () => {
      if (!newCharName.trim()) return;
      const newChar: Character = { id: crypto.randomUUID(), name: newCharName, description: newCharDesc, referencePhotos: [] };
      const updated = [...characters, newChar];
      setCharacters(updated);
      await saveCharacters(projectId, updated);
      setNewCharName(''); setNewCharDesc('');
      showToast("Character added", 'success');
   };

   const handleDeleteCharacter = async (id: string) => {
      const updated = characters.filter(c => c.id !== id);
      setCharacters(updated);
      await saveCharacters(projectId, updated);
      const updatedOutfits = outfits.filter(o => o.characterId !== id);
      setOutfits(updatedOutfits);
      await saveOutfits(projectId, updatedOutfits);
      if (selectedCharId === id) setSelectedCharId(null);
      setDeleteConfirm(null);
      showToast("Character removed", 'success');
   };

   const handleAddOutfit = async () => {
      if (!selectedCharId || !newOutfitName.trim()) return;
      const newOutfit: Outfit = { id: crypto.randomUUID(), characterId: selectedCharId, name: newOutfitName, description: newOutfitDesc, referencePhotos: [] };
      const updated = [...outfits, newOutfit];
      setOutfits(updated);
      await saveOutfits(projectId, updated);
      setNewOutfitName(''); setNewOutfitDesc('');
      showToast("Outfit added", 'success');
   };

   const handleDeleteOutfit = async (id: string) => {
      const updated = outfits.filter(o => o.id !== id);
      setOutfits(updated);
      await saveOutfits(projectId, updated);
      setDeleteConfirm(null);
      showToast("Outfit removed", 'success');
   };

   const handleAddLocation = async () => {
      if (!newLocName.trim()) return;
      const newLoc: Location = { id: crypto.randomUUID(), name: newLocName, description: newLocDesc, referencePhotos: [] };
      const updated = [...locations, newLoc];
      setLocations(updated);
      await saveLocations(projectId, updated);
      setNewLocName(''); setNewLocDesc('');
      showToast("Location added", 'success');
   };

   const handleDeleteLocation = async (id: string) => {
      const updated = locations.filter(l => l.id !== id);
      setLocations(updated);
      await saveLocations(projectId, updated);
      setDeleteConfirm(null);
      showToast("Location removed", 'success');
   };

   // --- IMAGES ---
   const triggerImageUpload = (type: 'character' | 'outfit' | 'location', id: string) => {
      setUploadTarget({ type, id });
      fileInputRef.current?.click();
   };

   const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (!files || files.length === 0 || !uploadTarget) return;
      
      setIsUploading(true);
      showToast(`Processing ${files.length} photos...`, 'info');

      try {
         const newPhotos: string[] = [];
         for (let i = 0; i < files.length; i++) {
             try {
                const compressed = await compressImage(files[i]);
                newPhotos.push(compressed);
             } catch (err) { console.error(err); }
         }

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
         showToast("Upload complete", 'success');
      } catch (e) { 
          showToast("Upload failed", 'error'); 
      } finally { 
          setIsUploading(false); 
          setUploadTarget(null); 
          if (fileInputRef.current) fileInputRef.current.value = ''; 
      }
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
      showToast("Photo deleted", 'info');
   };

   if (isLoading) return <div className="h-full flex items-center justify-center text-text-muted"><Loader2 className="animate-spin mr-2" /> Loading Bin...</div>;

   return (
      <div className="flex flex-col h-full bg-background overflow-hidden">
         <input type="file" ref={fileInputRef} className="hidden" accept="image/*" multiple onChange={handleFileChange} />

         {/* Modals */}
         {editingItem && (
            <Modal isOpen={true} onClose={() => setEditingItem(null)} title={`Edit ${editingItem.type}`}>
               <div className="space-y-4">
                  <div>
                     <label className="block text-xs font-medium text-text-secondary mb-1">Name</label>
                     <input value={editName} onChange={(e) => setEditName(e.target.value)} className="nle-input" />
                  </div>
                  <div>
                     <label className="block text-xs font-medium text-text-secondary mb-1">Description</label>
                     <textarea value={editDesc} onChange={(e) => setEditDesc(e.target.value)} className="nle-input min-h-[100px] resize-none" />
                  </div>
                  <div className="flex gap-2 justify-end pt-2">
                     <Button variant="secondary" onClick={() => setEditingItem(null)}>Cancel</Button>
                     <Button variant="primary" onClick={handleUpdateAsset}>Save</Button>
                  </div>
               </div>
            </Modal>
         )}

         {deleteConfirm && (
            <Modal isOpen={true} onClose={() => setDeleteConfirm(null)} title="Delete Asset?">
               <div className="space-y-4">
                  <div className="flex items-center gap-3 p-3 bg-red-900/20 rounded border border-red-900/50">
                     <AlertTriangle className="w-5 h-5 text-red-500 shrink-0" />
                     <div className="text-sm">
                        <p>Permanently delete <strong>{deleteConfirm.name}</strong>?</p>
                        {getUsageCount(deleteConfirm.type, deleteConfirm.id) > 0 && (
                            <p className="text-red-400 font-bold mt-1">Warning: Used in {getUsageCount(deleteConfirm.type, deleteConfirm.id)} shot(s).</p>
                        )}
                     </div>
                  </div>
                  <div className="flex gap-2 justify-end">
                     <Button variant="secondary" onClick={() => setDeleteConfirm(null)}>Cancel</Button>
                     <Button variant="primary" onClick={() => {
                        if (deleteConfirm.type === 'character') handleDeleteCharacter(deleteConfirm.id);
                        else if (deleteConfirm.type === 'outfit') handleDeleteOutfit(deleteConfirm.id);
                        else handleDeleteLocation(deleteConfirm.id);
                     }} className="bg-red-600 hover:bg-red-700">Delete</Button>
                  </div>
               </div>
            </Modal>
         )}

         {previewImage && (
            <div className="fixed inset-0 z-[200] bg-black/90 flex items-center justify-center p-8" onClick={() => setPreviewImage(null)}>
               <img src={previewImage} className="max-w-full max-h-full object-contain rounded" alt="Preview" />
               <button onClick={() => setPreviewImage(null)} className="absolute top-4 right-4 text-white"><X className="w-8 h-8" /></button>
            </div>
         )}

         {/* SUB-HEADER TABS */}
         <div className="nle-header gap-4">
            <button onClick={() => setActiveTab('assets')} className={`text-xs font-bold uppercase tracking-wide flex items-center gap-2 transition-colors ${activeTab === 'assets' ? 'text-primary' : 'text-text-secondary hover:text-white'}`}>
               <User className="w-3.5 h-3.5" /> Cast & Wardrobe
            </button>
            <div className="w-[1px] h-4 bg-border" />
            <button onClick={() => setActiveTab('locations')} className={`text-xs font-bold uppercase tracking-wide flex items-center gap-2 transition-colors ${activeTab === 'locations' ? 'text-primary' : 'text-text-secondary hover:text-white'}`}>
               <MapPin className="w-3.5 h-3.5" /> Locations
            </button>
            <div className="w-[1px] h-4 bg-border" />
            <button onClick={() => setActiveTab('gallery')} className={`text-xs font-bold uppercase tracking-wide flex items-center gap-2 transition-colors ${activeTab === 'gallery' ? 'text-primary' : 'text-text-secondary hover:text-white'}`}>
               <ImageIcon className="w-3.5 h-3.5" /> Gallery
            </button>
         </div>

         {/* MAIN CONTENT */}
         <div className="flex-1 overflow-hidden">
            
            {/* 1. CAST & WARDROBE (MASTER-DETAIL) */}
            {activeTab === 'assets' && (
               <div className="flex h-full">
                  {/* MASTER LIST (Characters) */}
                  <div className="w-80 border-r border-border bg-surface flex flex-col">
                     <div className="p-2 border-b border-border bg-surface-secondary space-y-2">
                        <div className="flex gap-2">
                           <input className="nle-input" placeholder="New Character Name" value={newCharName} onChange={e => setNewCharName(e.target.value)} />
                           <Button variant="primary" size="sm" icon={<Plus className="w-3.5 h-3.5" />} onClick={handleAddCharacter} disabled={!newCharName.trim()} />
                        </div>
                     </div>
                     <div className="flex-1 overflow-y-auto">
                        {characters.map(char => (
                           <div key={char.id} onClick={() => setSelectedCharId(char.id)} 
                                className={`p-3 border-b border-border cursor-pointer flex items-center gap-3 transition-colors ${selectedCharId === char.id ? 'bg-primary/10 border-l-2 border-l-primary' : 'hover:bg-white/5 border-l-2 border-l-transparent'}`}>
                                <div className="w-8 h-8 rounded bg-surface-secondary flex items-center justify-center border border-border">
                                   {char.referencePhotos?.[0] ? <img src={char.referencePhotos[0]} className="w-full h-full object-cover rounded" /> : <User className="w-4 h-4 text-text-tertiary" />}
                                </div>
                                <div className="flex-1 min-w-0">
                                   <div className={`text-xs font-bold truncate ${selectedCharId === char.id ? 'text-primary' : 'text-text-primary'}`}>{char.name}</div>
                                   <div className="text-[10px] text-text-tertiary truncate">{char.description || "No description"}</div>
                                </div>
                                {selectedCharId === char.id && (
                                   <div className="flex gap-1">
                                      <button onClick={(e) => { e.stopPropagation(); setEditingItem({ type: 'character', id: char.id, name: char.name, description: char.description }); }} className="p-1 hover:text-white text-text-tertiary"><Edit2 className="w-3 h-3" /></button>
                                      <button onClick={(e) => { e.stopPropagation(); setDeleteConfirm({ type: 'character', id: char.id, name: char.name }); }} className="p-1 hover:text-red-500 text-text-tertiary"><Trash2 className="w-3 h-3" /></button>
                                   </div>
                                )}
                           </div>
                        ))}
                     </div>
                  </div>

                  {/* DETAIL VIEW (Photos & Wardrobe) */}
                  <div className="flex-1 bg-background flex flex-col overflow-hidden">
                     {!selectedCharId ? (
                        <div className="flex-1 flex flex-col items-center justify-center text-text-tertiary opacity-50">
                           <User className="w-12 h-12 mb-2" />
                           <p>Select a character</p>
                        </div>
                     ) : (
                        <div className="flex-1 overflow-y-auto p-6">
                           {(() => {
                              const char = characters.find(c => c.id === selectedCharId);
                              if (!char) return null;
                              return (
                                 <div className="space-y-8 max-w-4xl mx-auto">
                                    {/* HEADSHOTS */}
                                    <div>
                                       <div className="flex items-center justify-between mb-2">
                                          <h3 className="text-sm font-bold text-text-secondary uppercase">Headshots / References</h3>
                                          <button onClick={() => triggerImageUpload('character', char.id)} className="nle-btn nle-btn-secondary"><Upload className="w-3 h-3" /> Upload</button>
                                       </div>
                                       <div className="flex gap-2 overflow-x-auto pb-2 custom-scrollbar">
                                          {char.referencePhotos?.map((p, i) => (
                                             <div key={i} className="relative w-24 h-24 shrink-0 group rounded overflow-hidden border border-border">
                                                <img src={p} className="w-full h-full object-cover cursor-pointer" onClick={() => setPreviewImage(p)} />
                                                <button onClick={() => handleDeletePhoto('character', char.id, i)} className="absolute top-1 right-1 bg-black/60 p-1 rounded text-white opacity-0 group-hover:opacity-100 transition-opacity"><X className="w-3 h-3" /></button>
                                             </div>
                                          ))}
                                          {(!char.referencePhotos || char.referencePhotos.length === 0) && (
                                             <div className="w-24 h-24 border border-dashed border-border rounded flex items-center justify-center text-text-tertiary text-[10px] text-center p-2">
                                                No photos
                                             </div>
                                          )}
                                       </div>
                                    </div>

                                    {/* WARDROBE LIST */}
                                    <div>
                                       <div className="flex items-center justify-between mb-2 border-t border-border pt-6">
                                          <h3 className="text-sm font-bold text-text-secondary uppercase">Wardrobe</h3>
                                       </div>
                                       
                                       {/* Add Outfit Inline */}
                                       <div className="flex gap-2 mb-4 bg-surface p-3 rounded border border-border">
                                          <input placeholder="Outfit Name (e.g. Space Suit)" value={newOutfitName} onChange={e => setNewOutfitName(e.target.value)} className="nle-input flex-1" />
                                          <input placeholder="Description" value={newOutfitDesc} onChange={e => setNewOutfitDesc(e.target.value)} className="nle-input flex-[2]" onKeyDown={e => e.key === 'Enter' && handleAddOutfit()} />
                                          <Button variant="primary" size="sm" onClick={handleAddOutfit} disabled={!newOutfitName.trim()}>Add</Button>
                                       </div>

                                       <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                                          {outfits.filter(o => o.characterId === char.id).map(outfit => (
                                             <div key={outfit.id} className="bg-surface border border-border rounded p-3 flex flex-col gap-3 group relative hover:border-border-light transition-colors">
                                                 <div className="absolute top-3 right-3 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button onClick={() => setEditingItem({ type: 'outfit', id: outfit.id, name: outfit.name, description: outfit.description })} className="p-1 hover:text-primary text-text-tertiary"><Edit2 className="w-3 h-3" /></button>
                                                    <button onClick={() => setDeleteConfirm({ type: 'outfit', id: outfit.id, name: outfit.name })} className="p-1 hover:text-red-500 text-text-tertiary"><Trash2 className="w-3 h-3" /></button>
                                                 </div>
                                                 <div className="flex gap-3">
                                                    <div className="w-10 h-10 bg-surface-secondary rounded flex items-center justify-center border border-border">
                                                       <Shirt className="w-5 h-5 text-text-tertiary" />
                                                    </div>
                                                    <div>
                                                       <div className="font-bold text-sm text-text-primary">{outfit.name}</div>
                                                       <div className="text-xs text-text-secondary line-clamp-2">{outfit.description}</div>
                                                    </div>
                                                 </div>
                                                 <div className="flex gap-2 overflow-x-auto pb-1 custom-scrollbar pt-2 border-t border-border/50">
                                                     <button onClick={() => triggerImageUpload('outfit', outfit.id)} className="w-10 h-10 border border-dashed border-border rounded flex items-center justify-center shrink-0 hover:border-primary hover:text-primary text-text-tertiary transition-colors"><Plus className="w-3 h-3" /></button>
                                                     {outfit.referencePhotos?.map((p, i) => (
                                                        <div key={i} className="relative w-10 h-10 shrink-0 group/img rounded overflow-hidden border border-border">
                                                           <img src={p} className="w-full h-full object-cover cursor-pointer" onClick={() => setPreviewImage(p)} />
                                                           <button onClick={() => handleDeletePhoto('outfit', outfit.id, i)} className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover/img:opacity-100 transition-opacity"><X className="w-3 h-3 text-white" /></button>
                                                        </div>
                                                     ))}
                                                 </div>
                                             </div>
                                          ))}
                                       </div>
                                    </div>
                                 </div>
                              );
                           })()}
                        </div>
                     )}
                  </div>
               </div>
            )}

            {/* 2. LOCATIONS GRID */}
            {activeTab === 'locations' && (
               <div className="p-6 h-full overflow-y-auto">
                  <div className="max-w-5xl mx-auto">
                     <div className="bg-surface border border-border rounded p-4 mb-6 flex gap-3">
                        <input className="nle-input w-48" placeholder="Location Name" value={newLocName} onChange={e => setNewLocName(e.target.value)} />
                        <input className="nle-input flex-1" placeholder="Description" value={newLocDesc} onChange={e => setNewLocDesc(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAddLocation()} />
                        <Button variant="primary" onClick={handleAddLocation} disabled={!newLocName.trim()}>Add Location</Button>
                     </div>
                     
                     <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {locations.map(loc => (
                           <div key={loc.id} className="bg-surface border border-border rounded overflow-hidden flex flex-col group hover:border-border-light transition-colors">
                              <div className="p-3 border-b border-border bg-surface-secondary flex justify-between items-start">
                                 <div>
                                    <div className="font-bold text-sm text-text-primary">{loc.name}</div>
                                    <div className="text-xs text-text-tertiary line-clamp-1">{loc.description}</div>
                                 </div>
                                 <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button onClick={() => setEditingItem({ type: 'location', id: loc.id, name: loc.name, description: loc.description })} className="p-1 hover:text-white text-text-tertiary"><Edit2 className="w-3 h-3" /></button>
                                    <button onClick={() => setDeleteConfirm({ type: 'location', id: loc.id, name: loc.name })} className="p-1 hover:text-red-500 text-text-tertiary"><Trash2 className="w-3 h-3" /></button>
                                 </div>
                              </div>
                              <div className="p-3 flex gap-2 overflow-x-auto custom-scrollbar">
                                 <button onClick={() => triggerImageUpload('location', loc.id)} className="w-20 h-20 border border-dashed border-border rounded flex items-center justify-center shrink-0 hover:border-primary hover:text-primary text-text-tertiary transition-colors"><Plus className="w-5 h-5" /></button>
                                 {loc.referencePhotos?.map((p, i) => (
                                    <div key={i} className="relative w-20 h-20 shrink-0 group/img rounded overflow-hidden border border-border">
                                       <img src={p} className="w-full h-full object-cover cursor-pointer" onClick={() => setPreviewImage(p)} />
                                       <button onClick={() => handleDeletePhoto('location', loc.id, i)} className="absolute top-1 right-1 bg-black/60 p-1 rounded text-white opacity-0 group-hover/img:opacity-100 transition-opacity"><X className="w-3 h-3" /></button>
                                    </div>
                                 ))}
                              </div>
                           </div>
                        ))}
                     </div>
                  </div>
               </div>
            )}

            {/* 3. GALLERY GRID (MASONRY-ISH) */}
            {activeTab === 'gallery' && (
               <div className="flex flex-col h-full">
                  <div className="nle-header gap-3 border-b-0 border-t-0 bg-background">
                     <button onClick={() => setGallerySection('all')} className={`text-xs px-3 py-1 rounded transition-colors ${gallerySection === 'all' ? 'bg-primary text-white' : 'bg-surface border border-border text-text-secondary'}`}>All Images ({library.length})</button>
                     <button onClick={() => setGallerySection('selected')} className={`text-xs px-3 py-1 rounded transition-colors ${gallerySection === 'selected' ? 'bg-primary text-white' : 'bg-surface border border-border text-text-secondary'}`}>Used ({usedImagesCount})</button>
                  </div>
                  <div className="flex-1 overflow-y-auto p-4">
                     <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2">
                        {(gallerySection === 'selected' ? library.filter(img => isImageUsed(img.url)) : library).map((item) => (
                           <div key={item.id} className="aspect-video bg-black relative group border border-transparent hover:border-primary cursor-pointer rounded-sm overflow-hidden" onClick={() => setPreviewImage(item.url)}>
                              <img src={item.url} className="w-full h-full object-cover" loading="lazy" />
                              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-2">
                                 <p className="text-[10px] text-white line-clamp-2">{item.prompt}</p>
                              </div>
                           </div>
                        ))}
                     </div>
                  </div>
               </div>
            )}
         </div>
      </div>
   );
};