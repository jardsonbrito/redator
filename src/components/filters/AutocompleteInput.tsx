import { useState, useRef, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Search, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AutocompleteInputProps {
  value: string;
  onValueChange: (value: string) => void;
  suggestions: string[];
  placeholder?: string;
  className?: string;
}

export const AutocompleteInput = ({
  value,
  onValueChange,
  suggestions,
  placeholder = "Buscar...",
  className
}: AutocompleteInputProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionRefs = useRef<(HTMLButtonElement | null)[]>([]);

  // Mostrar sugestões quando há texto e sugestões disponíveis
  const showSuggestions = isOpen && value.trim() && suggestions.length > 0;

  useEffect(() => {
    setFocusedIndex(-1);
  }, [suggestions]);

  const handleInputFocus = () => {
    setIsOpen(true);
  };

  const handleInputBlur = () => {
    // Delay para permitir clique nas sugestões
    setTimeout(() => setIsOpen(false), 200);
  };

  const handleSuggestionClick = (suggestion: string) => {
    onValueChange(suggestion);
    setIsOpen(false);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showSuggestions) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setFocusedIndex(prev => 
          prev < suggestions.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setFocusedIndex(prev => prev > 0 ? prev - 1 : -1);
        break;
      case 'Enter':
        e.preventDefault();
        if (focusedIndex >= 0 && focusedIndex < suggestions.length) {
          handleSuggestionClick(suggestions[focusedIndex]);
        }
        break;
      case 'Escape':
        setIsOpen(false);
        setFocusedIndex(-1);
        break;
    }
  };

  useEffect(() => {
    if (focusedIndex >= 0 && suggestionRefs.current[focusedIndex]) {
      suggestionRefs.current[focusedIndex]?.scrollIntoView({
        block: 'nearest'
      });
    }
  }, [focusedIndex]);

  const clearInput = () => {
    onValueChange('');
    inputRef.current?.focus();
  };

  return (
    <div className={cn("relative w-full", className)}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => onValueChange(e.target.value)}
          onFocus={handleInputFocus}
          onBlur={handleInputBlur}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="pl-10 pr-10"
          autoComplete="off"
          aria-label={placeholder}
          aria-expanded={showSuggestions}
          aria-haspopup="listbox"
          role="combobox"
        />
        {value && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="absolute right-1 top-1/2 transform -translate-y-1/2 h-8 w-8 p-0 hover:bg-transparent"
            onClick={clearInput}
            aria-label="Limpar busca"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {showSuggestions && (
        <Card className="absolute z-50 w-full mt-1 max-h-60 overflow-y-auto border shadow-lg bg-popover">
          <div 
            role="listbox" 
            aria-label="Sugestões de busca"
            className="p-1"
          >
            {suggestions.map((suggestion, index) => (
              <Button
                key={suggestion}
                ref={(el) => {
                  suggestionRefs.current[index] = el;
                }}
                variant="ghost"
                size="sm"
                className={cn(
                  "w-full justify-start text-left p-2 h-auto min-h-[2rem] whitespace-normal",
                  focusedIndex === index && "bg-accent"
                )}
                onClick={() => handleSuggestionClick(suggestion)}
                role="option"
                aria-selected={focusedIndex === index}
              >
                <span className="truncate">{suggestion}</span>
              </Button>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
};