import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Trophy, ArrowRight, Shield, Globe, Users } from 'lucide-react';
import { Link } from 'react-router-dom';
import WorldMap from '../components/WorldMap';

export default function LandingPage() {
  const [cats, setCats] = useState<{ species: string }[]>([]);

  useEffect(() => {
    fetch('/api/cats')
      .then(res => res.json())
      .then(data => setCats(data))
      .catch(console.error);
  }, []);

  const leaderboard = Object.entries(
    cats.reduce((acc, cat) => {
      const species = cat.species || 'Unknown';
      acc[species] = (acc[species] || 0) + 1;
      return acc;
    }, {} as Record<string, number>)
  )
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  return (
    <div className="flex-1 flex flex-col gap-10 animate-in fade-in duration-700">
      {/* Hero Section */}
      <section className="bg-natural-card rounded-[40px] p-8 md:p-16 border border-linen shadow-[0_20px_50px_rgba(62,59,57,0.04)] relative overflow-hidden">
        <div className="max-w-2xl relative z-10">
          <h2 className="font-serif text-4xl md:text-6xl text-clay leading-tight mb-6">
            Explore the World of <span className="italic italic font-normal text-sage">Feline Companions</span>
          </h2>
          <p className="text-stone text-lg mb-10 max-w-lg leading-relaxed">
            Welcome to the Central Archive. A specialized database documenting specimens from across the globe. Join the mission to categorize every purr.
          </p>
          <Link 
            to="/gallery" 
            className="inline-flex items-center gap-3 bg-sage hover:bg-[#6c7d6d] text-white px-8 py-4 rounded-full font-semibold transition-all group shadow-lg"
          >
            Access the Repository
            <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>
        
        {/* Abstract decorative elements */}
        <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/4 w-[500px] h-[500px] bg-sage/5 rounded-full blur-[100px]" />
        <div className="absolute bottom-0 left-0 translate-y-1/2 -translate-x-1/4 w-[300px] h-[300px] bg-linen/20 rounded-full blur-[80px]" />
      </section>

      {/* Main Skeleton Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 h-full">
        {/* Map Skeleton Section */}
        <motion.section 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-natural-card rounded-[32px] p-8 border border-linen shadow-sm flex flex-col min-h-[400px]"
        >
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <div className="bg-bone p-3 rounded-2xl border border-linen">
                <Globe className="text-sage" size={24} />
              </div>
              <div>
                <h3 className="font-serif text-2xl text-clay">Global Sightings</h3>
                <p className="text-stone text-xs uppercase tracking-widest font-bold">Real-time Map Projection</p>
              </div>
            </div>
          </div>
          
          <WorldMap />
        </motion.section>

        {/* Leaderboard Skeleton Section */}
        <motion.section 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-natural-card rounded-[32px] p-8 border border-linen shadow-sm flex flex-col min-h-[400px]"
        >
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <div className="bg-bone p-3 rounded-2xl border border-linen">
                <Trophy className="text-sage" size={24} />
              </div>
              <div>
                <h3 className="font-serif text-2xl text-clay">All Time Common Cats</h3>
                <p className="text-stone text-xs uppercase tracking-widest font-bold">Cats ordered on how common they appear</p>
              </div>
            </div>
            <Users className="text-linen" size={20} />
          </div>

          {/* Leaderboard Skeleton Placeholder */}
          <div className="flex-1 flex flex-col gap-4">
            {leaderboard.length === 0 ? (
              <div className="flex-1 flex items-center justify-center">
                <p className="text-stone text-[10px] uppercase tracking-widest font-medium animate-pulse">
                  Synchronizing data with satellite network...
                </p>
              </div>
            ) : (
              leaderboard.map(([species, count], i) => (
                <div key={species} className="flex items-center gap-4 p-4 rounded-2xl bg-bone/50 border border-linen/50">
                  <div className="w-8 h-8 rounded-full bg-linen flex items-center justify-center text-stone text-xs font-bold">
                    {i + 1}
                  </div>
                  <span className="flex-1 text-clay text-sm font-serif">{species}</span>
                  <span className="text-stone text-xs font-semibold">{count} {count === 1 ? 'entry' : 'entries'}</span>
                </div>
              ))
            )}
          </div>
        </motion.section>
      </div>

      {/* Feature Pills */}
      <div className="flex flex-wrap gap-4">
        <div className="bg-natural-card px-6 py-3 rounded-full border border-linen text-stone text-xs font-semibold uppercase tracking-widest flex items-center gap-2">
          <Shield size={14} className="text-sage" /> Secure Archiving
        </div>
        <div className="bg-natural-card px-6 py-3 rounded-full border border-linen text-stone text-xs font-semibold uppercase tracking-widest flex items-center gap-2">
          <Globe size={14} className="text-sage" /> Worldwide Access
        </div>
        <div className="bg-natural-card px-6 py-3 rounded-full border border-linen text-stone text-xs font-semibold uppercase tracking-widest flex items-center gap-2">
          <Users size={14} className="text-sage" /> Community Driven
        </div>
      </div>
    </div>
  );
}
