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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!password) {
      setError('Password is required');
      return;
    }

    if (!isConfirmed) {
      setError(`Please type "${expectedConfirmText}" to confirm`);
      return;
    }

    try {
      setLoading(true);
      await deleteGroup(groupId, password);
      
      // Show success message briefly
      if (onGroupDeleted) {
        onGroupDeleted();
      }
      
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to delete group');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl max-w-md w-full mx-4">
        {/* Header */}
        <div className="bg-red-50 border-b border-red-200 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-6 h-6 text-red-600" />
            <h2 className="text-xl font-bold text-red-900">Delete Group</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Warning Message */}
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-sm text-red-800 font-medium mb-2">⚠️ This action cannot be undone</p>
            <p className="text-sm text-red-700">
              Once you delete <strong>{groupName}</strong>, it will be permanently removed along with:
            </p>
            <ul className="text-sm text-red-700 mt-2 ml-4 list-disc space-y-1">
              <li>All group members and their access</li>
              <li>All messages and chat history</li>
              <li>All shared resources</li>
              <li>All scheduled sessions</li>
            </ul>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          {/* Password Input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Enter your password to confirm
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Your account password"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
              disabled={loading}
            />
          </div>

          {/* Confirmation Text Input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Type <code className="bg-gray-100 px-2 py-1 rounded text-sm">{expectedConfirmText}</code> to confirm
            </label>
            <input
              type="text"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder="delete groupname"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
              disabled={loading}
            />
            {confirmText && (
              <p className={`text-sm mt-2 ${isConfirmed ? 'text-green-600' : 'text-gray-500'}`}>
                {isConfirmed ? '✓ Ready to delete' : '○ Text does not match'}
              </p>
            )}
          </div>

          {/* Buttons */}
          <div className="flex gap-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !password || !isConfirmed}
              className="flex-1 bg-red-600 text-white px-4 py-2.5 rounded-lg font-medium hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Deleting...' : 'Delete Group'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
