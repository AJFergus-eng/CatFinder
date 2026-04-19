import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Cat, Search, Loader2, Upload, LockKeyhole, X } from 'lucide-react';
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
  submittedBy?: string;
  isLost?: boolean;
  createdAt: string;
}

export default function GalleryPage() {
  const [cats, setCats] = useState<CatData[]>([]);
  const [loading, setLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [locationMode, setLocationMode] = useState<'exact' | 'fuzzy'>('fuzzy');
  const gpsRef = useRef<{ lat: number | null; lng: number | null }>({ lat: null, lng: null });
  const [isPredicting, setIsPredicting] = useState(false);
  const [selectedCat, setSelectedCat] = useState<CatData | null>(null);
  const [showLocationWarning, setShowLocationWarning] = useState(false);
  const [showMapPicker, setShowMapPicker] = useState(false);
  const [pickedLocation, setPickedLocation] = useState<{ lat: number; lng: number } | null>(null);
  const mapPickerRef = useRef<HTMLDivElement>(null);
  const mapPickerInstanceRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const CATS_PER_PAGE = 12;

  const [formData, setFormData] = useState({
    species: '',
    catName: '',
    color: '',
    fur: '',
    other: '',
    image: '',
    isLost: false
  });

  const { isAuthenticated, token, username } = useAuth();

  useEffect(() => {
    fetchCats();
  }, []);

  const fetchCats = async () => {
    try {
      const response = await fetch('/api/cats');
      const data = await response.json();
      setCats(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching cats:', error);
      setCats([]);
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

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
      img.onload = async () => {
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

        setIsPredicting(true);
        try {
          const response = await fetch('/api/predict-breed', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ imageBase64: compressedBase64 })
          });
          const data = await response.json();
          if (data.breed) {
            setFormData(prev => ({ ...prev, species: data.breed.replaceAll('_', ' ') }));
            console.log(`Predicted breed: ${data.breed}`);
          }
        } catch (err) {
          console.log('Could not predict breed:', err);
        } finally {
          setIsPredicting(false);
        }
      };
      if (event.target?.result) {
        img.src = event.target.result as string;
      }
    };
    reader.readAsDataURL(file);
  };

  const openMapPicker = () => {
    setShowMapPicker(true);
    setTimeout(() => {
      if (!mapPickerRef.current || !window.google) return;
      const map = new window.google.maps.Map(mapPickerRef.current, {
        center: { lat: 39.5, lng: -98.35 },
        zoom: 4,
        disableDefaultUI: false,
      });
      mapPickerInstanceRef.current = map;

      map.addListener('click', (e: any) => {
        const lat = e.latLng.lat();
        const lng = e.latLng.lng();

        if (markerRef.current) markerRef.current.setMap(null);

        markerRef.current = new window.google.maps.Marker({
          position: { lat, lng },
          map,
        });

        setPickedLocation({ lat, lng });
      });
    }, 100);
  };

  const handleSubmitClick = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.image) return;
    setShowLocationWarning(true);
  };

  const handleConfirmSubmit = async () => {
    setShowLocationWarning(false);

    let lat = gpsRef.current.lat;
    let lng = gpsRef.current.lng;

    if (pickedLocation) {
      lat = pickedLocation.lat;
      lng = pickedLocation.lng;
    } else if (locationMode === 'fuzzy' && lat !== null && lng !== null) {
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
        body: JSON.stringify({ ...formData, lat, lng, submittedBy: username, isLost: formData.isLost }),
      });

      if (response.ok) {
        setFormData({ catName: '', species: '', color: '', fur: '', other: '', image: '', isLost: false });
        gpsRef.current = { lat: null, lng: null };
        setPickedLocation(null);
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

  const totalPages = Math.ceil(filteredCats.length / CATS_PER_PAGE);
  const paginatedCats = filteredCats.slice(
    (currentPage - 1) * CATS_PER_PAGE,
    currentPage * CATS_PER_PAGE
  );

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

            <form onSubmit={handleSubmitClick} className="flex flex-col gap-4">
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
                <label className="text-[11px] font-bold uppercase tracking-widest text-stone mb-1 px-1 block">
                  Species {isPredicting && <span className="text-sage normal-case tracking-normal font-normal">— Identifying breed...</span>}
                </label>
                <input
                  type="text"
                  placeholder={isPredicting ? "Analyzing image..." : "e.g. Siamese"}
                  value={formData.species}
                  onChange={e => setFormData({ ...formData, species: e.target.value })}
                  className="w-full px-4 py-3 bg-bone border border-linen rounded-lg text-clay text-sm focus:outline-none focus:border-sage transition-all"
                />
                {formData.species && !isPredicting && (
                  <p className="text-[10px] text-sage mt-1 px-1">✓ Breed auto-detected — you can edit if needed</p>
                )}
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

              <div>
                <label className="text-[11px] font-bold uppercase tracking-widest text-stone mb-1 px-1 block">Location Mode</label>
                <div className="flex rounded-lg overflow-hidden border border-linen">
                  <button
                    type="button"
                    onClick={() => {
                      setLocationMode('fuzzy');
                      setFormData(prev => ({ ...prev, isLost: false }));
                    }}
                    className={`flex-1 py-2 text-xs font-semibold transition-all ${locationMode === 'fuzzy' ? 'bg-sage text-white' : 'bg-bone text-stone'}`}
                  >
                    Generalized
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setLocationMode('exact');
                      setFormData(prev => ({ ...prev, isLost: true }));
                      setPickedLocation(null);
                      openMapPicker();
                    }}
                    className={`flex-1 py-2 text-xs font-semibold transition-all ${locationMode === 'exact' ? 'bg-sage text-white' : 'bg-bone text-stone'}`}
                  >
                    Exact (For Lost Cats)
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
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
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
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
              <AnimatePresence mode="popLayout">
                {paginatedCats.map((cat) => (
                  <motion.div
                    key={cat.id || (cat as any)._id}
                    layout
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.98 }}
                    className={`rounded-2xl overflow-hidden border transition-all group ${
                      cat.isLost
                        ? 'bg-red-50 border-red-300 shadow-red-100'
                        : 'bg-natural-card border-linen hover:shadow-lg'
                    }`}
                  >
                    <div
                      className="h-44 bg-linen/30 border-b border-linen overflow-hidden relative cursor-pointer"
                      onClick={() => setSelectedCat(cat)}
                    >
                      <img
                        src={cat.image}
                        alt={cat.species}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                    <div className="p-5">
                      {cat.isLost && (
                        <div className="mb-2 text-[10px] font-bold uppercase tracking-widest text-red-500">
                          Lost Cat
                        </div>
                      )}
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
                            {cat.other}
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
                      {cat.submittedBy && (
                        <div className="mt-2 text-[10px] text-stone">
                          Submitted by <span className="text-sage font-semibold">{cat.submittedBy}</span>
                        </div>
                      )}
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-8">
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="px-4 py-2 text-xs font-semibold uppercase tracking-widest text-stone border border-linen rounded-lg hover:border-sage disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  ← Prev
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={`w-8 h-8 text-xs font-semibold rounded-lg transition-colors ${
                      currentPage === page
                        ? 'bg-sage text-white'
                        : 'text-stone border border-linen hover:border-sage'
                    }`}
                  >
                    {page}
                  </button>
                ))}
                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="px-4 py-2 text-xs font-semibold uppercase tracking-widest text-stone border border-linen rounded-lg hover:border-sage disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  Next →
                </button>
              </div>
            )}
          </>
        )}
      </section>

      {/* Map Picker Modal */}
      {showMapPicker && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-6">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-natural-card rounded-2xl overflow-hidden max-w-2xl w-full shadow-2xl"
          >
            <div className="p-6 pb-3 flex justify-between items-center">
              <div>
                <h2 className="font-serif text-xl text-clay">Pin Your Location</h2>
                <p className="text-[11px] text-stone mt-1">Click anywhere on the map to place a pin for the cat's last known location.</p>
              </div>
              <button onClick={() => {
                setShowMapPicker(false);
                if (!pickedLocation) {
                  setLocationMode('fuzzy');
                  setFormData(prev => ({ ...prev, isLost: false }));
                }
              }}>
                <X size={18} className="text-stone hover:text-clay transition-colors" />
              </button>
            </div>
            <div ref={mapPickerRef} style={{ height: '400px', width: '100%' }} />
            <div className="p-4 flex gap-3 items-center">
              {pickedLocation ? (
                <p className="flex-1 text-[11px] text-sage font-semibold">
                  📍 Pin placed at {pickedLocation.lat.toFixed(5)}, {pickedLocation.lng.toFixed(5)}
                </p>
              ) : (
                <p className="flex-1 text-[11px] text-stone italic">No pin placed yet — click the map to set a location.</p>
              )}
              <button
                disabled={!pickedLocation}
                onClick={() => setShowMapPicker(false)}
                className="py-2 px-6 bg-sage hover:bg-[#6c7d6d] disabled:bg-stone/30 disabled:cursor-not-allowed text-white rounded-xl text-xs font-semibold uppercase tracking-widest transition-colors"
              >
                Confirm Location
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Location Warning Modal */}
      {showLocationWarning && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-6">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-natural-card rounded-2xl p-8 max-w-md w-full shadow-2xl"
          >
            <div className="flex justify-between items-start mb-4">
              <h2 className="font-serif text-xl text-clay">Location Notice</h2>
              <button onClick={() => setShowLocationWarning(false)}>
                <X size={18} className="text-stone hover:text-clay transition-colors" />
              </button>
            </div>
            <p className="text-sm text-stone leading-relaxed mb-6">
              By submitting a picture you understand we use the geo-location data embedded in your photo to approximate the picture's location on the map.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowLocationWarning(false)}
                className="flex-1 py-3 border border-linen rounded-xl text-stone text-xs font-semibold uppercase tracking-widest hover:border-sage transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmSubmit}
                className="flex-1 py-3 bg-sage hover:bg-[#6c7d6d] text-white rounded-xl text-xs font-semibold uppercase tracking-widest transition-colors"
              >
                I Understand
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Image Modal */}
      {selectedCat && (
        <div
          className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-6"
          onClick={() => setSelectedCat(null)}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-natural-card rounded-2xl overflow-hidden max-w-2xl w-full shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            <img
              src={selectedCat.image}
              alt={selectedCat.catName}
              className="w-full max-h-[60vh] object-contain bg-bone"
              referrerPolicy="no-referrer"
            />
            <div className="p-6">
              <div className="flex justify-between items-start mb-2">
                <h2 className="font-serif text-2xl text-clay">{selectedCat.catName}</h2>
                <button
                  onClick={() => setSelectedCat(null)}
                  className="text-stone hover:text-clay text-xs uppercase tracking-widest font-semibold transition-colors"
                >
                  Close
                </button>
              </div>
              <p className="text-sm text-stone mb-3">{selectedCat.species} • {selectedCat.color} • {selectedCat.fur}</p>
              {selectedCat.other && <p className="text-xs text-stone mb-3">{selectedCat.other}</p>}
              <div className="flex justify-between items-center pt-3 border-t border-linen">
                <span className="text-[10px] text-stone uppercase tracking-tighter">
                  Archive Ref: {(selectedCat.id || (selectedCat as any)._id)?.toString().slice(-6)}
                </span>
                {selectedCat.submittedBy && (
                  <span className="text-[10px] text-stone">
                    Submitted by <span className="text-sage font-semibold">{selectedCat.submittedBy}</span>
                  </span>
                )}
              </div>
            </div>
          </motion.div>
        </div>
      )}

    </div>
  );
}