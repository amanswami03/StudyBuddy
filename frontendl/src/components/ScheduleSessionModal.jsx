import React, { useState } from 'react';
import { X, Calendar, Clock, Users, Sliders, Plus, Trash2 } from 'lucide-react';
import { createGroupSession } from '../utils/api';
import { useTheme } from '../contexts/ThemeContext';

export default function ScheduleSessionModal({ groupId, onClose, onSessionCreated }) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const [formData, setFormData] = useState({
    title: '', description: '', scheduledDate: '', scheduledTime: '',
    durationMinutes: 60, votingEnabled: false, maxAttendees: '',
  });
  const [votingOptions, setVotingOptions] = useState([]);
  const [newOptionDate, setNewOptionDate] = useState('');
  const [newOptionTime, setNewOptionTime] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleInputChange = e => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleAddVotingOption = () => {
    if (!newOptionDate || !newOptionTime) { setError('Please select both date and time for the voting option'); return; }
    setVotingOptions(prev => [...prev, new Date(`${newOptionDate}T${newOptionTime}`)]);
    setNewOptionDate(''); setNewOptionTime('');
  };

  const handleSubmit = async e => {
    e.preventDefault(); setError('');
    if (!formData.title || !formData.scheduledDate || !formData.scheduledTime) { setError('Please fill in all required fields'); return; }
    if (formData.votingEnabled && votingOptions.length === 0) { setError('Please add at least one voting option'); return; }
    try {
      setLoading(true);
      const scheduledDateTime = new Date(`${formData.scheduledDate}T${formData.scheduledTime}:00Z`);
      if (isNaN(scheduledDateTime.getTime())) { setError('Invalid date or time'); return; }
      const response = await createGroupSession(groupId, {
        title: formData.title, description: formData.description,
        scheduled_time: scheduledDateTime.toISOString(),
        duration_minutes: parseInt(formData.durationMinutes),
        voting_enabled: formData.votingEnabled,
        max_attendees: formData.maxAttendees ? parseInt(formData.maxAttendees) : null,
        voting_options: votingOptions.map(d => d.toISOString()),
      });
      if (onSessionCreated) onSessionCreated(response);
      onClose();
    } catch (err) { setError(err.message || 'Failed to create session'); }
    finally { setLoading(false); }
  };

  const fieldCls = `w-full px-4 py-2.5 rounded-xl border text-sm outline-none transition-all ${isDark ? 'bg-slate-700 border-slate-600 text-slate-100 placeholder-slate-500 focus:border-blue-500' : 'bg-white border-amber-200 text-slate-800 placeholder-slate-400 focus:border-blue-500'} focus:ring-2 focus:ring-blue-100`;
  const labelCls = `block text-xs font-semibold mb-1.5 ${isDark ? 'text-slate-300' : 'text-slate-600'}`;
  const sectionTitle = `font-extrabold text-sm mb-4 flex items-center gap-2 ${isDark ? 'text-slate-100' : 'text-slate-800'}`;

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className={`rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-paper-lg ${isDark ? 'bg-slate-800' : 'bg-white'}`}>

        {/* Header */}
        <div className={`sticky top-0 z-10 px-6 py-4 border-b flex items-center justify-between ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-amber-100'}`}>
          <div>
            <h2 className={`text-xl font-extrabold ${isDark ? 'text-slate-100' : 'text-slate-800'}`}>Schedule New Session</h2>
            <p className={`text-xs mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Set a time for your group to study together</p>
          </div>
          <button onClick={onClose} className={`p-1.5 rounded-xl transition-colors ${isDark ? 'hover:bg-slate-700 text-slate-400' : 'hover:bg-amber-50 text-slate-500'}`}>
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && <div className="px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">{error}</div>}

          {/* Session details */}
          <div>
            <h3 className={sectionTitle}><Calendar className="w-4 h-4 text-blue-600" />Session Details</h3>
            <div className="space-y-4">
              <div>
                <label className={labelCls}>Session Title <span className="text-red-500">*</span></label>
                <input type="text" name="title" value={formData.title} onChange={handleInputChange}
                  placeholder="e.g., Data Structures Discussion" className={fieldCls} />
              </div>
              <div>
                <label className={labelCls}>Description</label>
                <textarea name="description" value={formData.description} onChange={handleInputChange}
                  placeholder="Add details about what you'll cover..." rows={3}
                  className={`${fieldCls} resize-none`} />
              </div>
            </div>
          </div>

          {/* Date & Time */}
          <div>
            <h3 className={sectionTitle}><Clock className="w-4 h-4 text-blue-600" />Date & Time</h3>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className={labelCls}>Date <span className="text-red-500">*</span></label>
                <input type="date" name="scheduledDate" value={formData.scheduledDate} onChange={handleInputChange} className={fieldCls} />
              </div>
              <div>
                <label className={labelCls}>Time <span className="text-red-500">*</span></label>
                <input type="time" name="scheduledTime" value={formData.scheduledTime} onChange={handleInputChange} className={fieldCls} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Duration (minutes)</label>
                <input type="number" name="durationMinutes" value={formData.durationMinutes} onChange={handleInputChange}
                  min="15" step="15" className={fieldCls} />
              </div>
              <div>
                <label className={labelCls}>Max Attendees</label>
                <input type="number" name="maxAttendees" value={formData.maxAttendees} onChange={handleInputChange}
                  placeholder="Optional" min="1" className={fieldCls} />
              </div>
            </div>
          </div>

          {/* Voting */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className={`font-extrabold text-sm flex items-center gap-2 ${isDark ? 'text-slate-100' : 'text-slate-800'}`}>
                <Sliders className="w-4 h-4 text-blue-600" />Enable Time Voting
              </h3>
              <button type="button" onClick={() => setFormData(p => ({ ...p, votingEnabled: !p.votingEnabled }))}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${formData.votingEnabled ? 'bg-blue-600' : (isDark ? 'bg-slate-600' : 'bg-slate-200')}`}>
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${formData.votingEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
              </button>
            </div>

            {formData.votingEnabled && (
              <div className={`p-4 rounded-2xl border space-y-4 ${isDark ? 'bg-blue-900/20 border-blue-800' : 'bg-blue-50 border-blue-100'}`}>
                <p className={`text-xs ${isDark ? 'text-blue-300' : 'text-blue-700'}`}>Add multiple time options for your group members to vote on</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelCls}>Option Date</label>
                    <input type="date" value={newOptionDate} onChange={e => setNewOptionDate(e.target.value)} className={fieldCls} />
                  </div>
                  <div>
                    <label className={labelCls}>Option Time</label>
                    <input type="time" value={newOptionTime} onChange={e => setNewOptionTime(e.target.value)} className={fieldCls} />
                  </div>
                </div>
                <button type="button" onClick={handleAddVotingOption}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-2">
                  <Plus className="w-4 h-4" /> Add Voting Option
                </button>

                {votingOptions.length > 0 && (
                  <div className="space-y-2">
                    <p className={`text-xs font-semibold ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>Voting Options ({votingOptions.length})</p>
                    {votingOptions.map((opt, i) => (
                      <div key={i} className={`flex items-center justify-between px-3 py-2 rounded-xl border ${isDark ? 'bg-slate-700 border-slate-600' : 'bg-white border-amber-200'}`}>
                        <span className={`text-sm ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>
                          {opt.toLocaleDateString()} at {opt.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        <button type="button" onClick={() => setVotingOptions(p => p.filter((_, j) => j !== i))}
                          className="text-red-500 hover:text-red-600 p-1 rounded">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className={`flex gap-3 pt-4 border-t ${isDark ? 'border-slate-700' : 'border-amber-100'}`}>
            <button type="button" onClick={onClose}
              className={`flex-1 px-4 py-2.5 rounded-xl border font-semibold text-sm transition-colors ${isDark ? 'border-slate-600 text-slate-300 hover:bg-slate-700' : 'border-slate-200 text-slate-700 hover:bg-slate-50'}`}>
              Cancel
            </button>
            <button type="submit" disabled={loading}
              className="flex-1 bg-blue-700 hover:bg-blue-800 text-white px-4 py-2.5 rounded-xl font-semibold text-sm shadow-sm transition-all disabled:opacity-50">
              {loading ? 'Creating…' : 'Create Session'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
