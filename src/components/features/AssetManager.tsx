/*
 * 👥 COMPONENT: ASSET MANAGER
 * Commercial Quality Update: Teal Theme & Gallery Grid & Locations
 */

import React, { useState, useEffect, useRef } from 'react';
import { Character, Outfit, ShowToastFn, ImageLibraryItem, Shot, Location } from '../../types';
import { getCharacters, saveCharacters, getOutfits, saveOutfits, getImageLibrary, getLocations, saveLocations } from '../../services/storage';
import { compressImage } from '../../services/image';
import { Plus, Trash2, User, Shirt, Loader2, Image as ImageIcon, Upload, X, AlertTriangle, Grid, Layout, Edit2, CheckCircle, FolderPlus, MapPin } from 'lucide-react';
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

   // Calculate derived stats
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

   // --- CHARACTER ACTIONS ---
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

   // --- OUTFIT ACTIONS ---
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

   // --- LOCATION ACTIONS ---
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

   // --- IMAGE UPLOAD ---
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
             } catch (err) {
                 console.error("Failed to compress image", files[i].name, err);
             }
         }

         if (newPhotos.length === 0) throw new Error("No valid images processed");

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
         showToast(`${newPhotos.length} photo(s) uploaded`, 'success');
      } catch (e) { 
          showToast("Upload failed", 'error'); 
          console.error(e);
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

   if (isLoading) return <div className="p-8 text-center text-text-tertiary">Loading Assets...</div>;

   return (
      <div className="flex flex-col h-full bg-background overflow-hidden">
         <input type="file" ref={fileInputRef} className="hidden" accept="image/*" multiple onChange={handleFileChange} />

         {/* Edit Modal */}
         {editingItem && (
            <Modal isOpen={true} onClose={() => setEditingItem(null)} title={`Edit ${editingItem.type}`}>
               <div className="space-y-4">
                  <div>
                     <label className="block text-xs font-medium text-text-secondary mb-1">Name</label>
                     <input value={editName} onChange={(e) => setEditName(e.target.value)} className="w-full bg-background border border-border rounded px-3 py-2 text-sm outline-none focus:border-primary" />
                  </div>
                  <div>
                     <label className="block text-xs font-medium text-text-secondary mb-1">Description</label>
                     <textarea value={editDesc} onChange={(e) => setEditDesc(e.target.value)} className="w-full bg-background border border-border rounded px-3 py-2 text-sm outline-none focus:border-primary min-h-[100px] resize-none" />
                  </div>
                  <div className="flex gap-2 justify-end pt-2">
                     <Button variant="secondary" onClick={() => setEditingItem(null)}>Cancel</Button>
                     <Button variant="primary" onClick={handleUpdateAsset}>Save Changes</Button>
                  </div>
               </div>
            </Modal>
         )}

         {/* Delete Confirmation Modal */}
         {deleteConfirm && (
            <Modal isOpen={true} onClose={() => setDeleteConfirm(null)} title="Delete Item?">
               <div className="space-y-4">
                  <div className="flex items-center gap-3 p-4 bg-error/10 rounded-lg border border-error/20">
                     <AlertTriangle className="w-5 h-5 text-error shrink-0" />
                     <p className="text-sm text-text-primary">
                        Are you sure you want to delete <strong>{deleteConfirm.name}</strong>?
                        {deleteConfirm.type === 'character' && ' This will also remove all associated outfits.'}
                     </p>
                  </div>
                  <div className="flex gap-2 justify-end">
                     <Button variant="secondary" onClick={() => setDeleteConfirm(null)}>Cancel</Button>
                     <Button variant="primary" onClick={() => {
                        if (deleteConfirm.type === 'character') handleDeleteCharacter(deleteConfirm.id);
                        else if (deleteConfirm.type === 'outfit') handleDeleteOutfit(deleteConfirm.id);
                        else handleDeleteLocation(deleteConfirm.id);
                     }} className="bg-error hover:bg-error/90">Delete</Button>
                  </div>
               </div>
            </Modal>
         )}

         {previewImage && (
            <div className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center p-8 animate-in fade-in" onClick={() => setPreviewImage(null)}>
               <img src={previewImage} className="max-w-full max-h-full object-contain shadow-2xl rounded" alt="Preview" />
               <button onClick={() => setPreviewImage(null)} className="absolute top-4 right-4 text-white p-2"><X className="w-8 h-8" /></button>
            </div>
         )}

         {/* TOP NAVIGATION */}
         <div className="h-12 border-b border-border flex items-center px-6 gap-6 bg-surface shrink-0">
            <button onClick={() => setActiveTab('assets')} className={`h-full flex items-center gap-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'assets' ? 'border-primary text-text-primary' : 'border-transparent text-text-tertiary hover:text-text-primary'}`}>
               <User className="w-4 h-4" /> Cast & Wardrobe
            </button>
            <button onClick={() => setActiveTab('locations')} className={`h-full flex items-center gap-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'locations' ? 'border-primary text-text-primary' : 'border-transparent text-text-tertiary hover:text-text-primary'}`}>
               <MapPin className="w-4 h-4" /> Locations
            </button>
            <button onClick={() => setActiveTab('gallery')} className={`h-full flex items-center gap-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'gallery' ? 'border-primary text-text-primary' : 'border-transparent text-text-tertiary hover:text-text-primary'}`}>
               <ImageIcon className="w-4 h-4" /> Image Gallery
            </button>
         </div>

         {/* CONTENT AREA */}
         <div className="flex-1 overflow-hidden">
            {activeTab === 'gallery' ? (
               <div className="h-full flex flex-col">
                  {/* Gallery Section Switcher */}
                  <div className="p-6 pb-0 flex items-center justify-between">
                     <div className="flex gap-2">
                        <button onClick={() => setGallerySection('all')} className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${gallerySection === 'all' ? 'bg-primary text-white' : 'bg-surface-secondary text-text-secondary hover:text-text-primary'}`}>All Images ({library.length})</button>
                        <button onClick={() => setGallerySection('selected')} className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${gallerySection === 'selected' ? 'bg-primary text-white' : 'bg-surface-secondary text-text-secondary hover:text-text-primary'}`}><CheckCircle className="w-4 h-4" /> Selected Shots ({usedImagesCount})</button>
                     </div>
                  </div>
                  <div className="flex-1 overflow-y-auto p-6">
                     <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                        {(gallerySection === 'selected' ? library.filter(img => isImageUsed(img.url)) : library).map((item) => (
                           <div key={item.id} className="aspect-video bg-black rounded-lg overflow-hidden group relative cursor-pointer" onClick={() => setPreviewImage(item.url)}>
                              <img src={item.url} className="block w-full h-full object-contain transform scale-[1.01]" loading="lazy" />
                              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-3">
                                 <div className="text-xs text-white/80 line-clamp-2">{item.prompt}</div>
                                 <div className="text-[10px] text-white/50 mt-1">{new Date(item.createdAt).toLocaleDateString()}</div>
                              </div>
                           </div>
                        ))}
                     </div>
                  </div>
               </div>
            ) : activeTab === 'locations' ? (
               <div className="h-full flex flex-col p-6 overflow-y-auto">
                  <div className="max-w-4xl mx-auto w-full space-y-8">
                     {/* Add Location */}
                     <div className="studio-card p-6">
                        <h3 className="font-bold text-text-primary mb-4 flex items-center gap-2"><MapPin className="w-4 h-4" /> Add New Location</h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                           <input className="studio-input" placeholder="Location Name (e.g. Abandoned Warehouse)" value={newLocName} onChange={e => setNewLocName(e.target.value)} />
                           <input className="studio-input md:col-span-2" placeholder="Description (e.g. Rusty pillars, puddles on floor)" value={newLocDesc} onChange={e => setNewLocDesc(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleAddLocation()} />
                        </div>
                        <div className="mt-4 flex justify-end">
                           <Button variant="primary" onClick={handleAddLocation} disabled={!newLocName}>Add Location</Button>
                        </div>
                     </div>

                     {/* Location List */}
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {locations.map(loc => (
                           <div key={loc.id} className="studio-card p-4 relative group">
                               <div className="absolute top-3 right-3 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <button onClick={() => setEditingItem({ type: 'location', id: loc.id, name: loc.name, description: loc.description })} className="text-text-tertiary hover:text-primary p-2"><Edit2 className="w-4 h-4" /></button>
                                  <button onClick={() => setDeleteConfirm({ type: 'location', id: loc.id, name: loc.name })} className="text-text-tertiary hover:text-error p-2"><Trash2 className="w-4 h-4" /></button>
                               </div>
                               <h4 className="font-bold text-text-primary">{loc.name}</h4>
                               <p className="text-sm text-text-secondary mb-4">{loc.description}</p>
                               
                               <div className="flex gap-2 border-t border-border pt-3 overflow-x-auto pb-1 scrollbar-hide">
                                   <button onClick={() => triggerImageUpload('location', loc.id)} className="w-16 h-16 border border-dashed border-border rounded-lg flex items-center justify-center hover:bg-surface-secondary transition-colors shrink-0">
                                      {isUploading && uploadTarget?.id === loc.id ? <Loader2 className="w-5 h-5 animate-spin" /> : <Plus className="w-5 h-5 text-text-tertiary" />}
                                   </button>
                                   {loc.referencePhotos?.map((p, i) => (
                                      <div key={i} className="relative w-16 h-16 group/img shrink-0">
                                         <img src={p} className="w-full h-full object-cover rounded-lg border border-border cursor-pointer" onClick={() => setPreviewImage(p)} />
                                         <button onClick={() => handleDeletePhoto('location', loc.id, i)} className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover/img:opacity-100 text-white rounded-lg"><X className="w-4 h-4" /></button>
                                      </div>
                                   ))}
                               </div>
                           </div>
                        ))}
                     </div>
                  </div>
               </div>
            ) : (
               <div className="flex h-full">
                  {/* ASSETS TAB (Characters & Outfits) - Preserved */}
                  <div className="w-[40%] min-w-[320px] border-r border-border flex flex-col bg-surface">
                     <div className="h-14 px-6 border-b border-border flex items-center justify-between bg-surface-secondary">
                        <span className="text-xs font-bold text-text-secondary uppercase tracking-wider">Cast List</span>
                        <span className="text-xs text-text-tertiary">{characters.length} Actors</span>
                     </div>
                     <div className="p-6 border-b border-border space-y-3 bg-surface">
                        <input className="w-full bg-background border border-border rounded px-3 py-2 text-sm outline-none focus:border-primary" placeholder="Character Name" value={newCharName} onChange={e => setNewCharName(e.target.value)} />
                        <div className="flex gap-2">
                           <input value={newCharDesc} onChange={(e) => setNewCharDesc(e.target.value)} placeholder="Description" className="flex-1 bg-background border border-border rounded px-3 py-1.5 text-sm outline-none focus:border-primary" onKeyDown={(e) => e.key === 'Enter' && handleAddCharacter()} />
                           <Button variant="primary" size="sm" icon={<Plus className="w-4 h-4" />} onClick={handleAddCharacter} disabled={newCharName.length === 0}>Add</Button>
                        </div>
                     </div>
                     <div className="flex-1 overflow-y-auto">
                        {characters.map(char => (
                           <div key={char.id} onClick={() => setSelectedCharId(char.id)} className={`p-4 border-b border-border cursor-pointer transition-colors group relative ${selectedCharId === char.id ? 'bg-primary/5 border-l-4 border-l-primary' : 'hover:bg-surface-secondary border-l-4 border-l-transparent'}`}>
                              <div className="flex justify-between items-start mb-3">
                                 <div className="flex items-center gap-3">
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${selectedCharId === char.id ? 'bg-primary text-white' : 'bg-surface-secondary text-text-tertiary'}`}><User className="w-5 h-5" /></div>
                                    <div><div className={`font-semibold text-sm ${selectedCharId === char.id ? 'text-primary' : 'text-text-primary'}`}>{char.name}</div><div className="text-xs text-text-secondary">{char.description}</div></div>
                                 </div>
                                 <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button onClick={(e) => { e.stopPropagation(); setEditingItem({ type: 'character', id: char.id, name: char.name, description: char.description }); }} className="text-text-tertiary hover:text-primary p-2"><Edit2 className="w-4 h-4" /></button>
                                    <button onClick={(e) => { e.stopPropagation(); setDeleteConfirm({ type: 'character', id: char.id, name: char.name }); }} className="text-text-tertiary hover:text-error p-2"><Trash2 className="w-4 h-4" /></button>
                                 </div>
                              </div>
                              <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide">
                                 <button onClick={(e) => { e.stopPropagation(); triggerImageUpload('character', char.id); }} className="w-10 h-10 border border-dashed border-border rounded-md flex items-center justify-center text-text-tertiary hover:text-primary hover:border-primary shrink-0 transition-colors">{isUploading && uploadTarget?.id === char.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />}</button>
                                 {char.referencePhotos?.map((p, i) => (
                                    <div key={i} className="relative w-10 h-10 shrink-0 group/img">
                                       <img src={p} className="w-full h-full object-cover rounded-md border border-border cursor-pointer" onClick={(e) => { e.stopPropagation(); setPreviewImage(p); }} />
                                       <button onClick={(e) => { e.stopPropagation(); handleDeletePhoto('character', char.id, i); }} className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover/img:opacity-100 text-white rounded-md"><X className="w-3 h-3" /></button>
                                    </div>
                                 ))}
                              </div>
                           </div>
                        ))}
                     </div>
                  </div>
                  <div className="flex-1 bg-background flex flex-col">
                     <div className="h-14 px-6 border-b border-border flex items-center justify-between bg-surface-secondary">
                        <div className="flex items-center gap-2"><span className="text-xs font-bold text-text-secondary uppercase tracking-wider">Wardrobe</span>{selectedCharId && <span className="px-2 py-0.5 bg-primary/10 text-primary text-xs rounded font-medium">{characters.find(c => c.id === selectedCharId)?.name}</span>}</div>
                     </div>
                     {!selectedCharId ? (
                        <div className="flex-1 flex flex-col items-center justify-center text-text-tertiary"><Shirt className="w-12 h-12 mb-4 opacity-20" /><p>Select a character to manage wardrobe</p></div>
                     ) : (
                        <div className="flex-1 overflow-y-auto p-8">
                           <div className="studio-card p-4 mb-6">
                              <div className="space-y-2">
                                 <input value={newOutfitName} onChange={(e) => setNewOutfitName(e.target.value)} placeholder="Outfit name" className="studio-input" />
                                 <input value={newOutfitDesc} onChange={(e) => setNewOutfitDesc(e.target.value)} placeholder="Description" className="studio-input" onKeyDown={(e) => e.key === 'Enter' && handleAddOutfit()} />
                                 <Button variant="primary" onClick={() => handleAddOutfit()} disabled={!newOutfitName} className="w-full">Add Outfit</Button>
                              </div>
                           </div>
                           <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                              {outfits.filter(o => o.characterId === selectedCharId).map(outfit => (
                                 <div key={outfit.id} className="studio-card p-4 relative group">
                                    <div className="absolute top-3 right-3 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                       <button onClick={() => setEditingItem({ type: 'outfit', id: outfit.id, name: outfit.name, description: outfit.description })} className="text-text-tertiary hover:text-primary p-2"><Edit2 className="w-4 h-4" /></button>
                                       <button onClick={() => setDeleteConfirm({ type: 'outfit', id: outfit.id, name: outfit.name })} className="text-text-tertiary hover:text-error p-2"><Trash2 className="w-4 h-4" /></button>
                                    </div>
                                    <div className="flex items-center gap-3 mb-3">
                                       <div className="w-10 h-10 bg-surface-secondary rounded-lg flex items-center justify-center text-text-tertiary"><Shirt className="w-5 h-5" /></div>
                                       <div><div className="text-text-primary font-medium text-sm">{outfit.name}</div><div className="text-xs text-text-secondary">{outfit.description}</div></div>
                                    </div>
                                    <div className="flex gap-2 mt-2 pt-2 border-t border-border">
                                       <button onClick={() => triggerImageUpload('outfit', outfit.id)} className="w-12 h-12 border border-dashed border-border rounded-lg flex items-center justify-center hover:bg-surface-secondary transition-colors">{isUploading && uploadTarget?.id === outfit.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4 text-text-tertiary" />}</button>
                                       {outfit.referencePhotos?.map((p, i) => (
                                          <div key={i} className="relative w-12 h-12 group/img"><img src={p} className="w-full h-full object-cover rounded-lg border border-border cursor-pointer" onClick={() => setPreviewImage(p)} /><button onClick={() => handleDeletePhoto('outfit', outfit.id, i)} className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover/img:opacity-100 text-white rounded-lg"><X className="w-3 h-3" /></button></div>
                                       ))}
                                    </div>
                                 </div>
                              ))}
                           </div>
                        </div>
                     )}
                  </div>
               </div>
            )}
         </div>
      </div>
   );
};