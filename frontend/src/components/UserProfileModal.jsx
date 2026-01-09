import React, { useState, useEffect } from 'react';
import { X, Mail, Phone, MapPin, BookOpen } from 'lucide-react';
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
        
        console.log('UserProfileModal - API Response:', data);
        
        // Convert profile_pic to absolute URL if needed
        let photoUrl = data?.profile_pic || null;
        if (photoUrl && !photoUrl.startsWith('http')) {
          photoUrl = `${API_BASE}${photoUrl}`;
        }

        setUser({
          name: data?.username || 'User',
          email: data?.email || '',
          phone: data?.phone || '',
          location: data?.location || '',
          university: data?.university || '',
          bio: data?.bio || '',
          photoUrl: photoUrl,
          showEmail: data?.show_email || false,
          showPhone: data?.show_phone || false,
          showLocation: data?.show_location || false,
          showUniversity: data?.show_university || false,
          showBio: data?.show_bio || false,
        });
      } catch (error) {
        console.error('Failed to load user profile:', error);
      } finally {
        setLoading(false);
      }
    };

    loadUserData();
  }, [isOpen, userId]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 max-h-96 overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-lg font-bold text-gray-900">User Profile</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        {loading ? (
          <div className="p-6 text-center text-gray-600">Loading...</div>
        ) : user ? (
          <div className="p-6 space-y-4">
            {/* Avatar and Name */}
            <div className="flex items-center space-x-4">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-full flex items-center justify-center text-white text-2xl font-bold overflow-hidden flex-shrink-0">
                {user.photoUrl ? (
                  <img src={user.photoUrl} alt={user.name} className="w-full h-full object-cover" />
                ) : (
                  user.name.charAt(0).toUpperCase()
                )}
              </div>
              <h3 className="text-xl font-semibold text-gray-900">{user.name}</h3>
            </div>

            {/* Bio - Show if either flag is true OR if bio exists */}
            {(user.showBio || user.bio) && user.bio && (
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">About</p>
                <p className="text-gray-700 text-sm">{user.bio}</p>
              </div>
            )}

            {/* Contact Information */}
            <div className="space-y-2">
              {(user.showEmail || user.email) && user.email && (
                <div className="flex items-center space-x-3">
                  <Mail className="w-4 h-4 text-blue-600 flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xs text-gray-600">Email</p>
                    <p className="text-sm text-gray-900 truncate">{user.email}</p>
                  </div>
                </div>
              )}

              {(user.showPhone || user.phone) && user.phone && (
                <div className="flex items-center space-x-3">
                  <Phone className="w-4 h-4 text-green-600 flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xs text-gray-600">Phone</p>
                    <p className="text-sm text-gray-900">{user.phone}</p>
                  </div>
                </div>
              )}

              {(user.showLocation || user.location) && user.location && (
                <div className="flex items-center space-x-3">
                  <MapPin className="w-4 h-4 text-red-600 flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xs text-gray-600">Location</p>
                    <p className="text-sm text-gray-900">{user.location}</p>
                  </div>
                </div>
              )}

              {(user.showUniversity || user.university) && user.university && (
                <div className="flex items-center space-x-3">
                  <BookOpen className="w-4 h-4 text-purple-600 flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xs text-gray-600">University</p>
                    <p className="text-sm text-gray-900">{user.university}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="p-6 text-center text-gray-600">Failed to load profile</div>
        )}
      </div>
    </div>
  );
}
