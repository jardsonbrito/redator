import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { ChevronDown, Filter, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MultiSelectDropdownProps {
  options: string[];
  selectedValues: string[];
  onSelectionChange: (values: string[]) => void;
  placeholder?: string;
  className?: string;
  maxDisplayed?: number;
}

export const MultiSelectDropdown = ({
  options,
  selectedValues,
  onSelectionChange,
  placeholder = "Selecionar...",
  className,
  maxDisplayed = 2
}: MultiSelectDropdownProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleOption = (option: string) => {
    const newSelection = selectedValues.includes(option)
      ? selectedValues.filter(val => val !== option)
      : [...selectedValues, option];
    
    onSelectionChange(newSelection);
  };

  const clearAll = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSelectionChange([]);
  };

  const getDisplayText = () => {
    if (selectedValues.length === 0) {
      return placeholder;
    }
    
    if (selectedValues.length <= maxDisplayed) {
      return selectedValues.join(', ');
    }
    
    return `${selectedValues.slice(0, maxDisplayed).join(', ')} +${selectedValues.length - maxDisplayed}`;
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'Enter':
      case ' ':
        e.preventDefault();
        setIsOpen(!isOpen);
        break;
      case 'Escape':
        setIsOpen(false);
        break;
    }
  };

  return (
    <div ref={dropdownRef} className={cn("relative w-full", className)}>
      <Button
        type="button"
        variant="outline"
        role="combobox"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        className={cn(
          "w-full justify-between text-left font-normal h-10",
          selectedValues.length === 0 && "text-muted-foreground"
        )}
        onClick={() => setIsOpen(!isOpen)}
        onKeyDown={handleKeyDown}
      >
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <Filter className="h-4 w-4 flex-shrink-0" />
          <span className="truncate">{getDisplayText()}</span>
        </div>
        
        <div className="flex items-center gap-2 ml-2">
          {selectedValues.length > 0 && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-5 w-5 p-0 hover:bg-transparent"
              onClick={clearAll}
              aria-label="Limpar filtros"
            >
              <X className="h-3 w-3" />
            </Button>
          )}
          <ChevronDown className={cn(
            "h-4 w-4 transition-transform",
            isOpen && "rotate-180"
          )} />
        </div>
      </Button>

      {isOpen && (
        <Card className="absolute z-50 w-full mt-1 max-h-60 overflow-y-auto border shadow-lg bg-popover">
          <div className="p-2">
            {options.length === 0 ? (
              <div className="text-sm text-muted-foreground p-2 text-center">
                Nenhum eixo disponível
              </div>
            ) : (
              <div role="listbox" aria-label="Opções de eixos temáticos">
                {options.map((option) => {
                  const isSelected = selectedValues.includes(option);
                  return (
                    <div
                      key={option}
                      className="flex items-center space-x-2 p-2 hover:bg-accent rounded-sm cursor-pointer"
                      onClick={() => toggleOption(option)}
                      role="option"
                      aria-selected={isSelected}
                    >
                      <Checkbox
                        id={`option-${option}`}
                        checked={isSelected}
                        onChange={() => toggleOption(option)}
                        aria-label={`${isSelected ? 'Desmarcar' : 'Marcar'} ${option}`}
                      />
                      <label
                        htmlFor={`option-${option}`}
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer flex-1"
                      >
                        {option}
                      </label>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </Card>
      )}
    </div>
  );
};