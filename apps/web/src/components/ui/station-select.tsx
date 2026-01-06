'use client';

import * as React from 'react';
import { Check, ChevronsUpDown } from 'lucide-react';
import { STATIONS } from '@eurostar/core';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';

interface StationSelectProps {
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  error?: boolean;
  onBlur?: () => void;
  className?: string;
}

export function StationSelect({
  value,
  onValueChange,
  placeholder = 'Select station',
  disabled = false,
  error = false,
  onBlur,
  className,
}: StationSelectProps) {
  const [open, setOpen] = React.useState(false);

  const selectedStation = React.useMemo(
    () => STATIONS.find((station) => station.code === value),
    [value]
  );

  // Create searchable items with value for cmdk filtering
  const stationItems = React.useMemo(
    () =>
      STATIONS.map((station) => ({
        ...station,
        value: station.code,
        // Build search string for cmdk
        searchValue: [
          station.code,
          station.name,
          station.city,
          ...station.aliases,
        ]
          .join(' ')
          .toLowerCase(),
      })),
    []
  );

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (!isOpen && onBlur) {
      onBlur();
    }
  };

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn(
            'w-full justify-between font-normal',
            !value && 'text-muted-foreground',
            error && 'border-destructive',
            className
          )}
        >
          {selectedStation ? (
            <span className="truncate">
              {selectedStation.name}
              <span className="ml-1 text-muted-foreground">
                ({selectedStation.code})
              </span>
            </span>
          ) : (
            placeholder
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[300px] p-0" align="start">
        <Command filter={(value, search) => {
          const item = stationItems.find((s) => s.code === value);
          if (!item) return 0;
          if (!search) return 1;
          return item.searchValue.includes(search.toLowerCase()) ? 1 : 0;
        }}>
          <CommandInput placeholder="Search by name, city, or code..." />
          <CommandList>
            <CommandEmpty>No station found.</CommandEmpty>
            <CommandGroup>
              {stationItems.map((station) => (
                <CommandItem
                  key={station.code}
                  value={station.code}
                  onSelect={(currentValue) => {
                    onValueChange(currentValue === value ? '' : currentValue);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      'mr-2 h-4 w-4 flex-shrink-0',
                      value === station.code ? 'opacity-100' : 'opacity-0'
                    )}
                  />
                  <div className="flex flex-col min-w-0">
                    <span className="truncate">{station.name}</span>
                    <span className="text-xs text-muted-foreground truncate">
                      {station.city}, {station.country}
                    </span>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
