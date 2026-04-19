import React, { useState, useEffect } from 'react';
import { X, Mail, Phone, MapPin, BookOpen, GraduationCap } from 'lucide-react';
import { getUserProfile } from '../utils/api';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8080';

export default function UserProfileModal({ userId, isOpen, onClose }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen || !userId) return;
    const loadUserData = async () => {
      setLoading(true);
      try {
        const data = await getUserProfile(userId);
        let photoUrl = data?.profile_pic || null;
        if (photoUrl && !photoUrl.startsWith('http')) photoUrl = `${API_BASE}${photoUrl}`;
        setUser({
          name: data?.username || 'User', email: data?.email || '', phone: data?.phone || '',
          location: data?.location || '', university: data?.university || '', bio: data?.bio || '',
          photoUrl, showEmail: data?.show_email || false, showPhone: data?.show_phone || false,
          showLocation: data?.show_location || false, showUniversity: data?.show_university || false, showBio: data?.show_bio || false,
        });
      } catch { } finally { setLoading(false); }
    };
    loadUserData();
  }, [isOpen, userId]);

  if (!isOpen) return null;

  const infoRows = [
    { show: (user?.showEmail || user?.email) && user?.email, icon: <Mail className="w-4 h-4 text-blue-600" />, label: 'Email', value: user?.email },
    { show: (user?.showPhone || user?.phone) && user?.phone, icon: <Phone className="w-4 h-4 text-emerald-600" />, label: 'Phone', value: user?.phone },
    { show: (user?.showLocation || user?.location) && user?.location, icon: <MapPin className="w-4 h-4 text-rose-600" />, label: 'Location', value: user?.location },
    { show: (user?.showUniversity || user?.university) && user?.university, icon: <GraduationCap className="w-4 h-4 text-purple-600" />, label: 'University', value: user?.university },
  ];

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-paper-lg max-w-sm w-full overflow-hidden" style={{ border: '1px solid #e5d9b8' }}>
        {/* Header strip */}
        <div className="h-16 relative" style={{ background: 'linear-gradient(135deg, #1e1b5e 0%, #1d4ed8 100%)' }}>
          <div className="absolute inset-0 pointer-events-none" style={{
            backgroundImage: 'repeating-linear-gradient(transparent,transparent 15px,rgba(255,255,255,0.05) 15px,rgba(255,255,255,0.05) 16px)',
            backgroundSize: '100% 16px',
          }}/>
          <button onClick={onClose} className="absolute top-3 right-3 w-7 h-7 rounded-lg bg-white/20 hover:bg-white/30 text-white flex items-center justify-center transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {loading ? (
          <div className="p-8 text-center text-sm text-slate-500">Loading profile…</div>
        ) : user ? (
          <div className="px-6 pb-6">
            {/* Avatar — overlaps the header strip */}
            <div className="flex justify-center -mt-8 mb-4">
              <div className="w-16 h-16 rounded-full border-4 border-white shadow-paper-md bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white text-xl font-extrabold overflow-hidden">
                {user.photoUrl
                  ? <img src={user.photoUrl} alt={user.name} className="w-full h-full object-cover" />
                  : user.name.charAt(0).toUpperCase()
                }
              </div>
            </div>

            <h3 className="text-center text-lg font-extrabold text-slate-800 mb-1">{user.name}</h3>

            {(user.showBio || user.bio) && user.bio && (
              <p className="text-center text-sm text-slate-500 mb-4 leading-relaxed">{user.bio}</p>
            )}

            {infoRows.some(r => r.show) && (
              <div className="space-y-2 mt-4">
                {infoRows.filter(r => r.show).map((r, i) => (
                  <div key={i} className="flex items-center gap-3 px-3 py-2 rounded-xl bg-amber-50 border border-amber-100">
                    {r.icon}
                    <div className="min-w-0">
                      <p className="text-xs text-slate-500">{r.label}</p>
                      <p className="text-sm font-medium text-slate-800 truncate">{r.value}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="p-6 text-center text-sm text-slate-500">Failed to load profile</div>
        )}
      </div>
    </div>
  );
}
