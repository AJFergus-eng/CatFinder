import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ShieldAlert, LogIn, UserPlus } from 'lucide-react';

export default function LoginPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [username, setUsername] = useState('');
  
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const endpoint = isLogin ? '/api/login' : '/api/register';

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(isLogin ? { email: email.toLowerCase(), password } : { email: email.toLowerCase(), password, username }),
      });

      const data = await response.json();

      if (response.ok) {
        if (isLogin) {
          login(data.token, data.email, data.username);
          navigate('/gallery');
        } else {
          setIsLogin(true);
          setError('Registration successful. Please log in.');
        }
      } else {
        setError(data.error || 'Authentication failed');
      }
    } catch (err) {
      setError('A network error occurred.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-center -mt-20 animate-in fade-in duration-700">
      <div className="bg-natural-card w-full max-w-md p-8 rounded-[24px] border border-linen shadow-lg">
        <div className="flex flex-col items-center text-center mb-8">
          <div className="w-12 h-12 bg-bone rounded-full flex items-center justify-center mb-4">
            <ShieldAlert size={20} className="text-sage" />
          </div>
          <h2 className="font-serif text-2xl text-clay">User Login Required</h2>
          <p className="text-sm text-stone mt-2">Log in to append new records to the visual archive.</p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          {error && (
            <div className={`p-3 rounded-lg text-xs font-semibold ${error.includes('successful') ? 'bg-sage/10 text-sage' : 'bg-red-500/10 text-red-500'}`}>
              {error}
            </div>
          )}

          <div>
            <label className="text-[11px] font-bold uppercase tracking-widest text-stone mb-1 px-1 block">Email Address</label>
            <input 
              required
              type="email" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 bg-bone border border-linen rounded-lg text-clay text-sm focus:outline-none focus:border-sage transition-all"
            />
          </div>

          {/*only shown when registering */}
          {!isLogin && (
            <div>
              <label className="text-[11px] font-bold uppercase tracking-widest text-stone mb-1 px-1 block">Username</label>
              <input
                required
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="e.g. CatArchivistX"
                className="w-full px-4 py-3 bg-bone border border-linen rounded-lg text-clay text-sm focus:outline-none focus:border-sage transition-all"
              />
            </div>
          )}

          <div>
            <label className="text-[11px] font-bold uppercase tracking-widest text-stone mb-1 px-1 block">Password</label>
            <input 
              required
              type="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 bg-bone border border-linen rounded-lg text-clay text-sm focus:outline-none focus:border-sage transition-all"
            />
          </div>

          <button 
            type="submit"
            disabled={loading}
            className="mt-2 bg-sage hover:bg-[#6c7d6d] disabled:bg-stone/30 disabled:cursor-not-allowed text-white text-sm font-semibold py-4 rounded-xl shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
          >
            {loading ? "Authenticating..." : isLogin ? <><LogIn size={18} /> Login</> : <><UserPlus size={18} /> Register</>}
          </button>
        </form>

        <button 
          onClick={() => { setIsLogin(!isLogin); setError(''); }}
          className="w-full mt-6 text-xs text-stone hover:text-sage font-medium transition-colors uppercase tracking-wider cursor-pointer"
        >
          {isLogin ? "Sign Up" : "Back to Login"}
        </button>
      </div>
    </div>
  );
}