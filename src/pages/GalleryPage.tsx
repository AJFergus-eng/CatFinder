import React, { useState, useEffect, useRef } from 'react'; // added useRef
import { motion, AnimatePresence } from 'motion/react';
import { Cat, Search, Loader2, Upload, LockKeyhole } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';
import exifr from 'exifr';
import { fuzzyCoords } from '../utils/speciesColors';

interface CatData {
  id: string;
  catName: string;
  species: string;
  color: string;
  fur: string;
  other: string;
  image: string;
  lat?: number;
  lng?: number;
  createdAt: string;
}

export default function GalleryPage() {
  const [cats, setCats] = useState<CatData[]>([]);
  const [loading, setLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [locationMode, setLocationMode] = useState<'exact' | 'fuzzy'>('fuzzy');
  const gpsRef = useRef<{ lat: number | null; lng: number | null }>({ lat: null, lng: null });

  const [formData, setFormData] = useState({
    species: '',
    catName: '',
    color: '',
    fur: '',
    other: '',
    image: '',
  });

  const { isAuthenticated, token } = useAuth();

  useEffect(() => {
    fetchCats();
  }, []);

  const fetchCats = async () => {
    try {
      const response = await fetch('/api/cats');
      const data = await response.json();
      setCats(data);
    } catch (error) {
      console.error('Error fetching cats:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Extract GPS and store in ref
    try {
      const gps = await exifr.gps(file);
      if (gps) {
        gpsRef.current = { lat: gps.latitude, lng: gps.longitude };
        console.log(`📍 GPS found: ${gps.latitude}, ${gps.longitude}`);
      } else {
        gpsRef.current = { lat: null, lng: null };
      }
    } catch (err) {
      console.log('📍 EXIF error:', err);
      gpsRef.current = { lat: null, lng: null };
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const MAX_WIDTH = 800;
        const MAX_HEIGHT = 800;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height = Math.round((height * MAX_WIDTH) / width);
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width = Math.round((width * MAX_HEIGHT) / height);
            height = MAX_HEIGHT;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);

        const compressedBase64 = canvas.toDataURL('image/jpeg', 0.7);
        setFormData(prev => ({ ...prev, image: compressedBase64 }));
      };
      if (event.target?.result) {
        img.src = event.target.result as string;
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.image) return;

    //apply fuzzy or exact coords from ref
    let lat = gpsRef.current.lat;
    let lng = gpsRef.current.lng;
    if (locationMode === 'fuzzy' && lat !== null && lng !== null) {
      const fuzzed = fuzzyCoords(lat, lng);
      lat = fuzzed.lat;
      lng = fuzzed.lng;
    }

    setIsUploading(true);
    try {
      const response = await fetch('/api/cats', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ ...formData, lat, lng }),
      });

      if (response.ok) {
        setFormData({ catName: '', species: '', color: '', fur: '', other: '', image: '' });
        gpsRef.current = { lat: null, lng: null }; 
        fetchCats();
      }
    } catch (error) {
      console.error('Error uploading cat:', error);
    } finally {
      setIsUploading(false);
    }
  };

  const filteredCats = cats.filter(cat => {
    const nameMatch = (cat.catName || '').toLowerCase().includes(searchQuery.toLowerCase());
    const speciesMatch = (cat.species || '').toLowerCase().includes(searchQuery.toLowerCase());
    const colorMatch = (cat.color || '').toLowerCase().includes(searchQuery.toLowerCase());
    const otherMatch = (cat.other || '').toLowerCase().includes(searchQuery.toLowerCase());
    return nameMatch || speciesMatch || colorMatch || otherMatch;
  });

  return (
    <div className="flex-1 lg:grid lg:grid-cols-[380px_1fr] gap-10 items-start">
      <aside className="bg-natural-card rounded-[24px] p-8 shadow-[0_10px_30px_rgba(62,59,57,0.05)] border border-linen flex flex-col sticky top-10 h-fit max-lg:mb-10 animate-in fade-in slide-in-from-left-4 duration-700">
        <label className="text-[11px] font-bold uppercase tracking-widest text-stone mb-6 px-1 block">Visual Record</label>

        {isAuthenticated ? (
          <>
            <div className="relative aspect-video lg:aspect-square bg-bone border-2 border-dashed border-linen rounded-2xl flex flex-col items-center justify-center cursor-pointer hover:border-sage transition-colors overflow-hidden mb-6 group">
              <input
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="absolute inset-0 opacity-0 cursor-pointer z-10"
              />
              {formData.image ? (
                <img src={formData.image} alt="Preview" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              ) : (
                <>
                  <Upload size={24} className="text-stone mb-2 group-hover:scale-110 transition-transform" />
                  <span className="text-xs text-stone">Click or drag photo here</span>
                </>
              )}
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div>
                <label className="text-[11px] font-bold uppercase tracking-widest text-stone mb-1 px-1 block">Cat's Name</label>
                <input
                  required
                  type="text"
                  placeholder="e.g. Mr. Whiskers"
                  value={formData.catName}
                  onChange={e => setFormData({ ...formData, catName: e.target.value })}
                  className="w-full px-4 py-3 bg-bone border border-linen rounded-lg text-clay text-sm focus:outline-none focus:border-sage transition-all"
                />
              </div>
              <div>
                <label className="text-[11px] font-bold uppercase tracking-widest text-stone mb-1 px-1 block">Coat Coloration</label>
                <input
                  type="text"
                  placeholder="e.g. Blue-Gray"
                  value={formData.color}
                  onChange={e => setFormData({ ...formData, color: e.target.value })}
                  className="w-full px-4 py-3 bg-bone border border-linen rounded-lg text-clay text-sm focus:outline-none focus:border-sage transition-all"
                />
              </div>
              <div>
                <label className="text-[11px] font-bold uppercase tracking-widest text-stone mb-1 px-1 block">Fur Texture</label>
                <input
                  type="text"
                  placeholder="e.g. Dense, Plush"
                  value={formData.fur}
                  onChange={e => setFormData({ ...formData, fur: e.target.value })}
                  className="w-full px-4 py-3 bg-bone border border-linen rounded-lg text-clay text-sm focus:outline-none focus:border-sage transition-all"
                />
              </div>
              <div>
                <label className="text-[11px] font-bold uppercase tracking-widest text-stone mb-1 px-1 block">Distinctive Traits</label>
                <input
                  type="text"
                  placeholder="e.g. Copper eyes"
                  value={formData.other}
                  onChange={e => setFormData({ ...formData, other: e.target.value })}
                  className="w-full px-4 py-3 bg-bone border border-linen rounded-lg text-clay text-sm focus:outline-none focus:border-sage transition-all"
                />
              </div>

              {/* NEW - Location mode toggle */}
              <div>
                <label className="text-[11px] font-bold uppercase tracking-widest text-stone mb-1 px-1 block">Location Mode</label>
                <div className="flex rounded-lg overflow-hidden border border-linen">
                  <button
                    type="button"
                    onClick={() => setLocationMode('fuzzy')}
                    className={`flex-1 py-2 text-xs font-semibold transition-all ${locationMode === 'fuzzy' ? 'bg-sage text-white' : 'bg-bone text-stone'}`}
                  >
                    📍 Generalized
                  </button>
                  <button
                    type="button"
                    onClick={() => setLocationMode('exact')}
                    className={`flex-1 py-2 text-xs font-semibold transition-all ${locationMode === 'exact' ? 'bg-sage text-white' : 'bg-bone text-stone'}`}
                  >
                    🎯 Exact
                  </button>
                </div>
                <p className="text-[10px] text-stone mt-1 px-1">
                  {locationMode === 'fuzzy' ? 'Location approximated for privacy' : 'Exact location — use for lost cats'}
                </p>
              </div>

              <button
                type="submit"
                disabled={isUploading || !formData.image}
                className="mt-4 bg-sage hover:bg-[#6c7d6d] disabled:bg-stone/30 disabled:cursor-not-allowed text-white text-sm font-semibold py-4 rounded-xl shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2"
              >
                {isUploading ? <Loader2 className="animate-spin" size={18} /> : "Archive Record"}
              </button>
            </form>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 text-center bg-bone rounded-2xl border-2 border-linen border-dashed">
            <LockKeyhole size={36} className="text-stone mb-4 opacity-50" />
            <h3 className="text-clay font-serif text-lg mb-2">Restricted Access</h3>
            <p className="text-stone text-xs leading-relaxed max-w-[200px] mb-6">Adding to the archive requires user credentials</p>
            <Link to="/login" className="bg-white border border-linen hover:border-sage text-sage text-xs font-bold uppercase tracking-widest py-3 px-6 rounded-lg transition-colors">
              Authenticate
            </Link>
          </div>
        )}
      </aside>

      {/* Right column - unchanged */}
      <section className="flex flex-col animate-in fade-in slide-in-from-right-4 duration-700 delay-150">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
          <h2 className="font-serif text-xl text-clay font-normal">Recent Entries</h2>
          <div className="flex items-center gap-4 w-full md:w-auto">
            <div className="relative flex-1 md:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-stone" size={14} />
              <input
                type="text"
                placeholder="Filter records..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-bone border border-linen rounded-full text-xs text-clay focus:outline-none focus:border-sage transition-all"
              />
            </div>
            <span className="text-[12px] text-stone bg-linen h-fit px-3 py-1.5 rounded-full whitespace-nowrap">
              {cats.length} Total Cats
            </span>
          </div>
        </div>

        {loading ? (
          <div className="flex-1 flex flex-col items-center justify-center py-20 text-stone">
            <Loader2 className="animate-spin mb-2" size={32} />
            <p className="text-sm">Accessing archives...</p>
          </div>
        ) : filteredCats.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center py-20 text-center bg-natural-card rounded-2xl border border-linen border-dashed">
            <Cat size={48} className="text-linen mb-4" />
            <p className="text-stone text-sm italic">No records matching your search criteria were found.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
            <AnimatePresence mode="popLayout">
              {filteredCats.map((cat) => (
                <motion.div
                  key={cat.id || (cat as any)._id}
                  layout
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                  className="bg-natural-card rounded-2xl overflow-hidden border border-linen hover:shadow-lg transition-all group"
                >
                  <div className="h-44 bg-linen/30 border-b border-linen overflow-hidden relative">
                    <img
                      src={cat.image}
                      alt={cat.species}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                  <div className="p-5">
                    <div className="cat-name font-serif text-xl mb-1 text-clay">{cat.catName}</div>
                    <div className="text-xs text-stone leading-relaxed mb-3">
                      {cat.species} • {cat.color} • {cat.fur}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <span className="inline-block px-2.5 py-1 bg-[#F0EEEB] text-clay text-[10px] uppercase font-semibold tracking-wide rounded">
                        {cat.fur || 'Fur Texture'}
                      </span>
                      {cat.other && (
                        <span className="inline-block px-2.5 py-1 bg-[#F0EEEB] text-clay text-[10px] uppercase font-semibold tracking-wide rounded">
                          {cat.other.split(' ')[0]}
                        </span>
                      )}
                    </div>
                    <div className="mt-4 pt-4 border-t border-linen flex justify-between items-center">
                      <span className="text-[10px] text-stone uppercase tracking-tighter">
                        Archive Ref: {(cat.id || (cat as any)._id)?.toString().slice(-6)}
                      </span>
                      <span className="text-[10px] text-stone uppercase italic">
                        {new Date(cat.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </section>
    </div>
  );
}