'use client';

import { useState } from 'react';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, CalendarIcon } from 'lucide-react';
import { format, parseISO, addDays } from 'date-fns';

interface DateNavigatorProps {
  currentDate: string; // YYYY-MM-DD format
  onDateChange: (newDate: string) => void;
}

export default function DateNavigator({
  currentDate,
  onDateChange,
}: DateNavigatorProps) {
  const [isOpen, setIsOpen] = useState(false);

  // Parse the current date string to Date object
  const date = parseISO(currentDate);

  // Format for display (e.g., "Saturday, November 9, 2025")
  const displayDate = format(date, 'EEEE, MMMM d, yyyy');

  // Format for compact display if needed (e.g., "Nov 9, 2025")
  const compactDate = format(date, 'MMM d, yyyy');

  // Handle calendar date selection
  const handleSelect = (selectedDate: Date | undefined) => {
    if (selectedDate) {
      // Convert to YYYY-MM-DD format
      const formattedDate = format(selectedDate, 'yyyy-MM-dd');
      onDateChange(formattedDate);
      setIsOpen(false); // Close the popover
    }
  };

  // Navigate to previous day
  const handlePrevious = () => {
    const prevDate = addDays(date, -1);
    onDateChange(format(prevDate, 'yyyy-MM-dd'));
  };

  // Navigate to next day
  const handleNext = () => {
    const nextDate = addDays(date, 1);
    onDateChange(format(nextDate, 'yyyy-MM-dd'));
  };

  // Navigate to today
  const handleToday = () => {
    const today = new Date();
    onDateChange(format(today, 'yyyy-MM-dd'));
  };

  // Check if current date is today
  const isToday = format(new Date(), 'yyyy-MM-dd') === currentDate;

  return (
    <div className="flex items-center justify-between rounded-lg bg-white p-4 shadow">
      {/* Previous Day Button */}
      <Button
        variant="ghost"
        size="icon"
        onClick={handlePrevious}
        className="h-9 w-9"
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>

      {/* Date Display with Calendar Popover */}
      <div className="flex items-center gap-2">
        <Popover open={isOpen} onOpenChange={setIsOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className="w-auto justify-start text-left font-semibold"
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              <span className="hidden sm:inline">{displayDate}</span>
              <span className="sm:hidden">{compactDate}</span>
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="center">
            <Calendar
              mode="single"
              selected={date}
              onSelect={handleSelect}
              initialFocus
            />
          </PopoverContent>
        </Popover>

        {/* Today Button - Only show if not already today */}
        {!isToday && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleToday}
            className="h-9"
          >
            Today
          </Button>
        )}
      </div>

      {/* Next Day Button */}
      <Button
        variant="ghost"
        size="icon"
        onClick={handleNext}
        className="h-9 w-9"
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  );
}
