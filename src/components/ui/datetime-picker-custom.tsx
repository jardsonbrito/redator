import React from 'react';
import DatePicker from 'react-datepicker';
import { Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';
import "react-datepicker/dist/react-datepicker.css";

interface DateTimePickerProps {
  selected?: Date;
  onChange: (date: Date | null) => void;
  placeholder?: string;
  className?: string;
  minDate?: Date;
  disabled?: boolean;
}

export const DateTimePicker: React.FC<DateTimePickerProps> = ({
  selected,
  onChange,
  placeholder = "Selecione data e hora",
  className,
  minDate,
  disabled = false,
}) => {
  return (
    <div className="relative">
      <DatePicker
        selected={selected}
        onChange={onChange}
        showTimeSelect
        timeFormat="HH:mm"
        timeIntervals={1}
        timeCaption="Hora"
        dateFormat="dd/MM/yyyy HH:mm"
        placeholderText={placeholder}
        minDate={minDate}
        disabled={disabled}
        autoComplete="off"
        className={cn(
          "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background",
          "placeholder:text-muted-foreground",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
          "disabled:cursor-not-allowed disabled:opacity-50",
          "pr-10", // Space for icon
          className
        )}
      />
      <Calendar className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
    </div>
  );
};