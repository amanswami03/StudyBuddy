import React, { useState } from 'react';
import { X, AlertTriangle } from 'lucide-react';
import { deleteGroup } from '../utils/api';

export default function DeleteGroupModal({ groupId, groupName, onClose, onGroupDeleted }) {
  const [password, setPassword] = useState('');
  const [confirmText, setConfirmText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const expectedConfirmText = `delete ${groupName.toLowerCase()}`;
  const isConfirmed = confirmText.toLowerCase() === expectedConfirmText;

  const handleSubmit = async e => {
    e.preventDefault();
    setError('');
    if (!password) { setError('Password is required'); return; }
    if (!isConfirmed) { setError(`Please type "${expectedConfirmText}" to confirm`); return; }
    try {
      setLoading(true);
      await deleteGroup(groupId, password);
      if (onGroupDeleted) onGroupDeleted();
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to delete group');
    } finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-md w-full shadow-paper-lg overflow-hidden">
        {/* Header */}
        <div className="bg-red-50 border-b border-red-100 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-red-100 rounded-xl flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-red-900">Delete Group</h2>
              <p className="text-xs text-red-600">This action cannot be undone</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-red-100 text-red-400 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Warning */}
          <div className="bg-red-50 border border-red-100 rounded-xl p-4">
            <p className="text-sm font-semibold text-red-800 mb-2">Deleting <strong>{groupName}</strong> will permanently remove:</p>
            <ul className="text-xs text-red-700 space-y-1 ml-3">
              {['All group members and access','All messages and chat history','All shared resources','All scheduled sessions'].map(item => (
                <li key={item} className="flex items-start gap-1.5">
                  <span className="mt-0.5 flex-shrink-0">·</span>{item}
                </li>
              ))}
            </ul>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">{error}</div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Enter your password</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)}
              placeholder="Your account password"
              className="w-full px-4 py-2.5 border border-amber-200 rounded-xl focus:ring-2 focus:ring-red-200 focus:border-red-400 text-sm outline-none transition-all"
              disabled={loading} />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Type <code className="bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded text-xs text-slate-700">{expectedConfirmText}</code> to confirm
            </label>
            <input type="text" value={confirmText} onChange={e => setConfirmText(e.target.value)}
              placeholder={expectedConfirmText}
              className="w-full px-4 py-2.5 border border-amber-200 rounded-xl focus:ring-2 focus:ring-red-200 focus:border-red-400 text-sm outline-none transition-all"
              disabled={loading} />
            {confirmText && (
              <p className={`text-xs mt-1.5 font-medium ${isConfirmed?'text-emerald-600':'text-slate-400'}`}>
                {isConfirmed ? '✓ Ready to delete' : '○ Text does not match'}
              </p>
            )}
          </div>

          <div className="flex gap-3 pt-2 border-t border-amber-100">
            <button type="button" onClick={onClose} disabled={loading}
              className="flex-1 px-4 py-2.5 border border-slate-200 text-slate-700 rounded-xl font-semibold text-sm hover:bg-slate-50 transition-colors disabled:opacity-50">
              Cancel
            </button>
            <button type="submit" disabled={loading || !password || !isConfirmed}
              className="flex-1 bg-red-600 text-white px-4 py-2.5 rounded-xl font-semibold text-sm hover:bg-red-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
              {loading ? 'Deleting…' : 'Delete Group'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
