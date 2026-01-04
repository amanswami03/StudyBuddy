import React, { useState } from 'react';
import { X, Calendar, Clock, Users, Sliders } from 'lucide-react';
import { createGroupSession } from '../utils/api';

export default function ScheduleSessionModal({ groupId, onClose, onSessionCreated }) {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    scheduledDate: '',
    scheduledTime: '',
    durationMinutes: 60,
    votingEnabled: false,
    maxAttendees: '',
  });

  const [votingOptions, setVotingOptions] = useState([]);
  const [newOptionDate, setNewOptionDate] = useState('');
  const [newOptionTime, setNewOptionTime] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleAddVotingOption = () => {
    if (!newOptionDate || !newOptionTime) {
      setError('Please select both date and time for the voting option');
      return;
    }

    const optionDateTime = new Date(`${newOptionDate}T${newOptionTime}`);
    setVotingOptions(prev => [...prev, optionDateTime]);
    setNewOptionDate('');
    setNewOptionTime('');
  };

  const handleRemoveVotingOption = (index) => {
    setVotingOptions(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!formData.title || !formData.scheduledDate || !formData.scheduledTime) {
      setError('Please fill in all required fields');
      return;
    }

    if (formData.votingEnabled && votingOptions.length === 0) {
      setError('Please add at least one voting option');
      return;
    }

    try {
      setLoading(true);

      // HTML date input format is YYYY-MM-DD
      // HTML time input format is HH:MM
      // Create ISO 8601 datetime string
      const isoDateTime = `${formData.scheduledDate}T${formData.scheduledTime}:00Z`;
      const scheduledDateTime = new Date(isoDateTime);
      
      if (isNaN(scheduledDateTime.getTime())) {
        setError('Invalid date or time');
        return;
      }

      const sessionData = {
        title: formData.title,
        description: formData.description,
        scheduled_time: scheduledDateTime.toISOString(),
        duration_minutes: parseInt(formData.durationMinutes),
        voting_enabled: formData.votingEnabled,
        max_attendees: formData.maxAttendees ? parseInt(formData.maxAttendees) : null,
        voting_options: votingOptions.map(date => date.toISOString()),
      };

      const response = await createGroupSession(groupId, sessionData);
      
      if (onSessionCreated) {
        onSessionCreated(response);
      }

      onClose();
    } catch (err) {
      setError(err.message || 'Failed to create session');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900">Schedule New Session</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Form Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          {/* Basic Info Section */}
          <div className="space-y-4">
            <h3 className="font-semibold text-gray-900">Session Details</h3>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Session Title *
              </label>
              <input
                type="text"
                name="title"
                value={formData.title}
                onChange={handleInputChange}
                placeholder="e.g., Data Structures Discussion"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                placeholder="Add details about the session..."
                rows="3"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Date & Time Section */}
          <div className="space-y-4">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Date & Time
            </h3>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Date *
                </label>
                <input
                  type="date"
                  name="scheduledDate"
                  value={formData.scheduledDate}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Time *
                </label>
                <input
                  type="time"
                  name="scheduledTime"
                  value={formData.scheduledTime}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Duration (minutes)
                </label>
                <input
                  type="number"
                  name="durationMinutes"
                  value={formData.durationMinutes}
                  onChange={handleInputChange}
                  min="15"
                  step="15"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Max Attendees
                </label>
                <input
                  type="number"
                  name="maxAttendees"
                  value={formData.maxAttendees}
                  onChange={handleInputChange}
                  placeholder="Optional"
                  min="1"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>

          {/* Voting Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                <Sliders className="w-5 h-5" />
                Enable Voting for Time
              </h3>
              <label className="flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  name="votingEnabled"
                  checked={formData.votingEnabled}
                  onChange={handleInputChange}
                  className="w-5 h-5 text-blue-600 rounded"
                />
              </label>
            </div>

            {formData.votingEnabled && (
              <div className="space-y-4 bg-blue-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600">
                  Add multiple time options for members to vote on
                </p>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Option Date
                    </label>
                    <input
                      type="date"
                      value={newOptionDate}
                      onChange={(e) => setNewOptionDate(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Option Time
                    </label>
                    <input
                      type="time"
                      value={newOptionTime}
                      onChange={(e) => setNewOptionTime(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleAddVotingOption}
                  className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors text-sm"
                >
                  Add Voting Option
                </button>

                {votingOptions.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-gray-700">Voting Options:</p>
                    {votingOptions.map((option, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between bg-white px-3 py-2 rounded border border-gray-200"
                      >
                        <span className="text-sm text-gray-700">
                          {option.toLocaleDateString()} at {option.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleRemoveVotingOption(index)}
                          className="text-red-600 hover:text-red-700 text-sm"
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Buttons */}
          <div className="flex gap-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-gradient-to-r from-blue-600 to-cyan-600 text-white px-4 py-2.5 rounded-lg font-medium hover:shadow-lg transition-shadow disabled:opacity-50"
            >
              {loading ? 'Creating...' : 'Create Session'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
