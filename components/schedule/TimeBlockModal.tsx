'use client';

import { useState, useEffect } from 'react';
import type { BrainDumpItem, ColorTag, TimeBlock } from '@/types/database';
import { colorOptions } from '@/lib/utils';

interface TimeBlockModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: TimeBlockFormData) => void;
  brainDumpItems: BrainDumpItem[];
  existingBlock?: TimeBlock | null;
  initialStartTime?: string; // When dropped on a specific hour
}

export interface TimeBlockFormData {
  brain_dump_item_id: string | null;
  custom_text: string;
  start_time: string;
  end_time: string;
  color_tag: ColorTag;
  notes: string;
}

export default function TimeBlockModal({
  isOpen,
  onClose,
  onSave,
  brainDumpItems,
  existingBlock,
  initialStartTime,
}: TimeBlockModalProps) {
  // Helper function to get initial form values
  const getInitialValues = () => {
    if (existingBlock) {
      // Editing existing block
      return {
        selectedItemId: existingBlock.brain_dump_item_id || '',
        customText: existingBlock.custom_text || '',
        startTime: existingBlock.start_time.substring(0, 5), // HH:MM
        endTime: existingBlock.end_time.substring(0, 5),
        colorTag: existingBlock.color_tag,
        notes: existingBlock.notes || '',
        useCustomText: !existingBlock.brain_dump_item_id,
      };
    } else {
      // Creating new block
      const startTimeValue = initialStartTime || '09:00';
      const [hours, minutes] = startTimeValue.split(':');
      const endHour = (parseInt(hours) + 1) % 24;

      return {
        selectedItemId: '',
        customText: '',
        startTime: startTimeValue,
        endTime: `${String(endHour).padStart(2, '0')}:${minutes}`,
        colorTag: 'blue' as ColorTag,
        notes: '',
        useCustomText: false,
      };
    }
  };

  // Initialize state with proper values
  const initialValues = getInitialValues();

  // Form state
  const [selectedItemId, setSelectedItemId] = useState(
    initialValues.selectedItemId
  );
  const [customText, setCustomText] = useState(initialValues.customText);
  const [startTime, setStartTime] = useState(initialValues.startTime);
  const [endTime, setEndTime] = useState(initialValues.endTime);
  const [colorTag, setColorTag] = useState<ColorTag>(initialValues.colorTag);
  const [notes, setNotes] = useState(initialValues.notes);
  const [useCustomText, setUseCustomText] = useState(
    initialValues.useCustomText
  );

  // Reset form when modal opens/closes or props change
  useEffect(() => {
    if (isOpen) {
      const values = getInitialValues();
      setSelectedItemId(values.selectedItemId);
      setCustomText(values.customText);
      setStartTime(values.startTime);
      setEndTime(values.endTime);
      setColorTag(values.colorTag);
      setNotes(values.notes);
      setUseCustomText(values.useCustomText);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, existingBlock?.id, initialStartTime]);

  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!useCustomText && !selectedItemId) {
      alert('Please select a brain dump item or enter custom text');
      return;
    }

    if (useCustomText && !customText.trim()) {
      alert('Please enter text for the time block');
      return;
    }

    if (startTime >= endTime) {
      alert('End time must be after start time');
      return;
    }

    // Prepare data
    const formData: TimeBlockFormData = {
      brain_dump_item_id: useCustomText ? null : selectedItemId,
      custom_text: useCustomText ? customText.trim() : '',
      start_time: `${startTime}:00`,
      end_time: `${endTime}:00`,
      color_tag: colorTag,
      notes: notes.trim(),
    };

    onSave(formData);
    handleClose();
  };

  const handleClose = () => {
    // Reset form
    setSelectedItemId('');
    setCustomText('');
    setStartTime('09:00');
    setEndTime('10:00');
    setColorTag('blue');
    setNotes('');
    setUseCustomText(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="w-full max-w-lg rounded-lg bg-white p-6 shadow-xl">
        <h2 className="mb-4 text-xl font-bold">
          {existingBlock ? 'Edit Time Block' : 'Create Time Block'}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Content Source Toggle */}
          <div className="flex gap-4">
            <label className="flex items-center gap-2">
              <input
                type="radio"
                checked={!useCustomText}
                onChange={() => setUseCustomText(false)}
                className="h-4 w-4"
              />
              <span>From Brain Dump</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="radio"
                checked={useCustomText}
                onChange={() => setUseCustomText(true)}
                className="h-4 w-4"
              />
              <span>Custom Text</span>
            </label>
          </div>

          {/* Brain Dump Item Selection */}
          {!useCustomText && (
            <div>
              <label className="mb-1 block text-sm font-medium">
                Select Brain Dump Item
              </label>
              <select
                value={selectedItemId}
                onChange={(e) => setSelectedItemId(e.target.value)}
                className="w-full rounded border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
                required={!useCustomText}
              >
                <option value="">-- Select an item --</option>
                {brainDumpItems.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.text}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Custom Text Input */}
          {useCustomText && (
            <div>
              <label className="mb-1 block text-sm font-medium">
                Task Title
              </label>
              <input
                type="text"
                value={customText}
                onChange={(e) => setCustomText(e.target.value)}
                placeholder="Enter task title..."
                className="w-full rounded border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
                required={useCustomText}
              />
            </div>
          )}

          {/* Time Selection */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium">
                Start Time
              </label>
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full rounded border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">End Time</label>
              <input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="w-full rounded border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
                required
              />
            </div>
          </div>

          {/* Color Selection */}
          <div>
            <label className="mb-1 block text-sm font-medium">Color Tag</label>
            <div className="flex gap-2">
              {(
                Object.keys(colorOptions) as Array<keyof typeof colorOptions>
              ).map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setColorTag(color)}
                  className={`h-10 w-10 rounded border-2 ${
                    colorOptions[color].bg
                  } ${
                    colorTag === color
                      ? 'border-gray-800 ring-2 ring-gray-400'
                      : 'border-gray-300'
                  }`}
                  title={color}
                />
              ))}
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="mb-1 block text-sm font-medium">
              Notes (optional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add any additional notes..."
              rows={3}
              className="w-full rounded border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-2 pt-4">
            <button
              type="button"
              onClick={handleClose}
              className="rounded px-4 py-2 text-gray-700 hover:bg-gray-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
            >
              {existingBlock ? 'Update' : 'Create'} Time Block
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
