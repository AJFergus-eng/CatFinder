import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Cat, Search, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';

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

export default function MyCatsPage() {
  const [cats, setCats] = useState<CatData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const CATS_PER_PAGE = 12;

  const { username, isAuthenticated } = useAuth();

  useEffect(() => {
    fetchCats();
  }, []);

  const fetchCats = async () => {
    try {
      const response = await fetch('/api/cats');
      const data = await response.json();
      const myCats = Array.isArray(data)
        ? data.filter((cat: CatData) => cat.submittedBy === username)
        : [];
      setCats(myCats);
    } catch (error) {
      console.error('Error fetching cats:', error);
      setCats([]);
    } finally {
      setLoading(false);
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

  if (!isAuthenticated) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center py-20 text-center">
        <Cat size={48} className="text-linen mb-4" />
        <h2 className="font-serif text-2xl text-clay mb-2">Sign In Required</h2>
        <p className="text-stone text-sm mb-6">You need to be logged in to view your cats.</p>
        <Link to="/login" className="bg-sage text-white px-6 py-3 rounded-xl text-sm font-semibold">
          Login
        </Link>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
          <h2 className="font-serif text-xl text-clay font-normal">My Cats</h2>
          <p className="text-xs text-stone mt-1">Entries submitted by <span className="text-sage font-semibold">{username}</span></p>
        </div>
        <div className="flex items-center gap-4 w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-stone" size={14} />
            <input
              type="text"
              placeholder="Filter records..."
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
              className="w-full pl-9 pr-4 py-2 bg-bone border border-linen rounded-full text-xs text-clay focus:outline-none focus:border-sage transition-all"
            />
          </div>
          <span className="text-[12px] text-stone bg-linen h-fit px-3 py-1.5 rounded-full whitespace-nowrap">
            {cats.length} Total
          </span>
        </div>
      </div>

      {loading ? (
        <div className="flex-1 flex flex-col items-center justify-center py-20 text-stone">
          <Loader2 className="animate-spin mb-2" size={32} />
          <p className="text-sm">Loading your cats...</p>
        </div>
      ) : filteredCats.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center py-20 text-center bg-natural-card rounded-2xl border border-linen border-dashed">
          <Cat size={48} className="text-linen mb-4" />
          <p className="text-stone text-sm italic">
            {cats.length === 0
              ? "You haven't submitted any cats yet."
              : "No records matching your search."}
          </p>
          {cats.length === 0 && (
            <Link to="/gallery" className="mt-4 text-xs text-sage font-semibold uppercase tracking-widest hover:underline">
              Go to Archive to submit one →
            </Link>
          )}
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
                      ? 'bg-red-50 border-red-300'
                      : 'bg-natural-card border-linen hover:shadow-lg'
                  }`}
                >
                  <div className="h-44 bg-linen/30 border-b border-linen overflow-hidden">
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
                    <div className="font-serif text-xl mb-1 text-clay">{cat.catName}</div>
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
    </div>
  );
}