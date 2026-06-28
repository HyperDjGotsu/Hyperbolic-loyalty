'use client';

import React, { useState, useEffect } from 'react';

interface StatusEditorProps {
  currentStatus: string | null;
  onStatusChange: (status: string | null) => void;
  isOpen: boolean;
  onClose: () => void;
}

const PRESET_STATUSES = [
  { emoji: '🎮', text: 'Looking for games' },
  { emoji: '👑', text: 'Grinding for Points' },
  { emoji: '🃏', text: 'Down to play anything' },
  { emoji: '⚔️', text: 'Tournament ready' },
  { emoji: '📚', text: 'Teaching newbies' },
  { emoji: '🔧', text: 'Building decks' },
  { emoji: '😴', text: 'Taking a break' },
  { emoji: '😎', text: 'Just vibing' },
];

export default function StatusEditor({ currentStatus, onStatusChange, isOpen, onClose }: StatusEditorProps) {
  const [customText, setCustomText] = useState('');
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null);
  const [isCustom, setIsCustom] = useState(false);
  const [saving, setSaving] = useState(false);

  // Initialize from current status
  useEffect(() => {
    if (currentStatus) {
      const preset = PRESET_STATUSES.find(p => `${p.emoji} ${p.text}` === currentStatus);
      if (preset) {
        setSelectedPreset(`${preset.emoji} ${preset.text}`);
        setIsCustom(false);
        setCustomText('');
      } else {
        setIsCustom(true);
        setCustomText(currentStatus);
        setSelectedPreset(null);
      }
    } else {
      setSelectedPreset(null);
      setIsCustom(false);
      setCustomText('');
    }
  }, [currentStatus, isOpen]);

  const handlePresetSelect = (preset: typeof PRESET_STATUSES[0]) => {
    const fullStatus = `${preset.emoji} ${preset.text}`;
    setSelectedPreset(fullStatus);
    setIsCustom(false);
    setCustomText('');
  };

  const handleCustomToggle = () => {
    setIsCustom(true);
    setSelectedPreset(null);
  };

  const handleSave = async () => {
    setSaving(true);
    
    let newStatus: string | null = null;
    if (isCustom && customText.trim()) {
      newStatus = customText.trim();
    } else if (selectedPreset) {
      newStatus = selectedPreset;
    }

    try {
      const res = await fetch('/api/player/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });

      if (res.ok) {
        onStatusChange(newStatus);
        onClose();
      }
    } catch (error) {
      console.error('Error saving status:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleClear = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/player/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: null }),
      });

      if (res.ok) {
        onStatusChange(null);
        onClose();
      }
    } catch (error) {
      console.error('Error clearing status:', error);
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-surface rounded-2xl w-full max-w-md max-h-[80vh] overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-border-token flex items-center justify-between">
          <h2 className="text-xl font-bold text-primary">Set Your Status</h2>
          <button onClick={onClose} className="text-secondary hover:text-primary text-2xl">
            ×
          </button>
        </div>

        {/* Content */}
        <div className="p-4 overflow-y-auto max-h-[60vh]">
          {/* Preset Options */}
          <div className="space-y-2 mb-4">
            {PRESET_STATUSES.map((preset) => {
              const fullStatus = `${preset.emoji} ${preset.text}`;
              const isSelected = selectedPreset === fullStatus && !isCustom;
              
              return (
                <button
                  key={fullStatus}
                  onClick={() => handlePresetSelect(preset)}
                  className={`w-full p-3 rounded-xl text-left transition-all flex items-center gap-3 ${
                    isSelected
                      ? 'bg-cyan-500/20 border-2 border-cyan-500'
                      : 'bg-elevated border-2 border-transparent hover:bg-input'
                  }`}
                >
                  <span className="text-2xl">{preset.emoji}</span>
                  <span className="text-primary">{preset.text}</span>
                  {isSelected && (
                    <span className="ml-auto text-cyan-400">✓</span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Custom Option */}
          <div className="border-t border-border-token pt-4">
            <button
              onClick={handleCustomToggle}
              className={`w-full p-3 rounded-xl text-left transition-all flex items-center gap-3 mb-2 ${
                isCustom
                  ? 'bg-purple-500/20 border-2 border-purple-500'
                  : 'bg-elevated border-2 border-transparent hover:bg-input'
              }`}
            >
              <span className="text-2xl">✏️</span>
              <span className="text-primary">Write your own...</span>
            </button>

            {isCustom && (
              <div className="mt-2">
                <input
                  type="text"
                  value={customText}
                  onChange={(e) => setCustomText(e.target.value.slice(0, 50))}
                  placeholder="What's on your mind?"
                  className="w-full p-3 rounded-xl bg-input text-primary placeholder-tertiary border-2 border-purple-500/50 focus:border-purple-500 outline-none"
                  autoFocus
                />
                <div className="text-right text-tertiary text-sm mt-1">
                  {customText.length}/50
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border-token flex gap-2">
          {currentStatus && (
            <button
              onClick={handleClear}
              disabled={saving}
              className="px-4 py-2 rounded-xl bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors disabled:opacity-50"
            >
              Clear
            </button>
          )}
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 rounded-xl bg-elevated text-primary hover:bg-input transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving || (!selectedPreset && !customText.trim())}
            className="flex-1 px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-purple-500 text-white font-bold hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}

// Simple status display component
export function StatusBadge({ status, onClick }: { status: string | null; onClick?: () => void }) {
  if (!status) {
    if (onClick) {
      return (
        <button
          onClick={onClick}
          className="text-tertiary text-sm hover:text-secondary transition-colors flex items-center gap-1"
        >
          <span>✏️</span>
          <span>Set status...</span>
        </button>
      );
    }
    return null;
  }

  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-1 px-3 py-1 rounded-full bg-elevated text-sm ${
        onClick ? 'hover:bg-input cursor-pointer' : ''
      } transition-colors`}
    >
      <span className="text-primary">{status}</span>
      {onClick && <span className="text-secondary text-xs ml-1">✏️</span>}
    </button>
  );
}
