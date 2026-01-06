'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Search, X, CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';

export interface FilterOption<T extends string = string> {
  value: T;
  label: string;
}

export interface DateRange {
  from: Date | undefined;
  to: Date | undefined;
}

export interface FilterConfig<T extends string = string> {
  key: string;
  label: string;
  options: FilterOption<T>[];
  defaultValue?: T;
}

export interface SearchFilterProps<T extends string = string> {
  /** Placeholder text for search input */
  searchPlaceholder?: string;
  /** Callback when search value changes (debounced) */
  onSearchChange?: (value: string) => void;
  /** Debounce delay in milliseconds */
  debounceMs?: number;
  /** Filter configurations */
  filters?: FilterConfig<T>[];
  /** Callback when any filter changes */
  onFiltersChange?: (filters: Record<string, string>) => void;
  /** Whether to show date range filter */
  showDateRange?: boolean;
  /** Callback when date range changes */
  onDateRangeChange?: (range: DateRange) => void;
  /** Total count of items (before filtering) */
  totalCount?: number | undefined;
  /** Filtered count of items */
  filteredCount?: number | undefined;
  /** Custom className */
  className?: string;
}

export function SearchFilter<T extends string = string>({
  searchPlaceholder = 'Search...',
  onSearchChange,
  debounceMs = 300,
  filters = [],
  onFiltersChange,
  showDateRange = false,
  onDateRangeChange,
  totalCount,
  filteredCount,
  className,
}: SearchFilterProps<T>) {
  const [searchValue, setSearchValue] = useState('');
  const [filterValues, setFilterValues] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    filters.forEach((f) => {
      initial[f.key] = f.defaultValue ?? f.options[0]?.value ?? '';
    });
    return initial;
  });
  const [dateRange, setDateRange] = useState<DateRange>({ from: undefined, to: undefined });

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      onSearchChange?.(searchValue);
    }, debounceMs);

    return () => clearTimeout(timer);
  }, [searchValue, debounceMs, onSearchChange]);

  // Handle filter change
  const handleFilterChange = useCallback(
    (key: string, value: string) => {
      const newFilters = { ...filterValues, [key]: value };
      setFilterValues(newFilters);
      onFiltersChange?.(newFilters);
    },
    [filterValues, onFiltersChange]
  );

  // Handle date range change
  const handleDateRangeChange = useCallback(
    (range: DateRange) => {
      setDateRange(range);
      onDateRangeChange?.(range);
    },
    [onDateRangeChange]
  );

  // Active filters for badges
  const activeFilters = useMemo(() => {
    const active: { key: string; label: string; value: string; displayValue: string }[] = [];

    // Search
    if (searchValue.trim()) {
      active.push({
        key: 'search',
        label: 'Search',
        value: searchValue,
        displayValue: `"${searchValue}"`,
      });
    }

    // Dropdown filters
    filters.forEach((filter) => {
      const value = filterValues[filter.key];
      const defaultValue = filter.defaultValue ?? filter.options[0]?.value;
      if (value && value !== defaultValue) {
        const option = filter.options.find((o) => o.value === value);
        active.push({
          key: filter.key,
          label: filter.label,
          value,
          displayValue: option?.label ?? value,
        });
      }
    });

    // Date range
    if (dateRange.from || dateRange.to) {
      let displayValue = '';
      if (dateRange.from && dateRange.to) {
        displayValue = `${format(dateRange.from, 'dd MMM')} - ${format(dateRange.to, 'dd MMM')}`;
      } else if (dateRange.from) {
        displayValue = `From ${format(dateRange.from, 'dd MMM')}`;
      } else if (dateRange.to) {
        displayValue = `Until ${format(dateRange.to, 'dd MMM')}`;
      }
      active.push({
        key: 'dateRange',
        label: 'Date',
        value: 'dateRange',
        displayValue,
      });
    }

    return active;
  }, [searchValue, filters, filterValues, dateRange]);

  // Clear individual filter
  const clearFilter = useCallback(
    (key: string) => {
      if (key === 'search') {
        setSearchValue('');
        onSearchChange?.('');
      } else if (key === 'dateRange') {
        setDateRange({ from: undefined, to: undefined });
        onDateRangeChange?.({ from: undefined, to: undefined });
      } else {
        const filter = filters.find((f) => f.key === key);
        const defaultValue = filter?.defaultValue ?? filter?.options[0]?.value ?? '';
        handleFilterChange(key, defaultValue);
      }
    },
    [filters, handleFilterChange, onSearchChange, onDateRangeChange]
  );

  // Clear all filters
  const clearAllFilters = useCallback(() => {
    setSearchValue('');
    onSearchChange?.('');

    const resetFilters: Record<string, string> = {};
    filters.forEach((f) => {
      resetFilters[f.key] = f.defaultValue ?? f.options[0]?.value ?? '';
    });
    setFilterValues(resetFilters);
    onFiltersChange?.(resetFilters);

    setDateRange({ from: undefined, to: undefined });
    onDateRangeChange?.({ from: undefined, to: undefined });
  }, [filters, onSearchChange, onFiltersChange, onDateRangeChange]);

  const hasActiveFilters = activeFilters.length > 0;

  return (
    <div className={cn('space-y-3', className)}>
      {/* Search and filter controls */}
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        {/* Search input */}
        <div className="relative flex-1 sm:max-w-xs">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="text"
            placeholder={searchPlaceholder}
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            className="pl-9 min-h-[44px]"
          />
          {searchValue && (
            <button
              onClick={() => {
                setSearchValue('');
                onSearchChange?.('');
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Filter dropdowns */}
        {filters.map((filter) => (
          <Select
            key={filter.key}
            value={filterValues[filter.key] ?? ''}
            onValueChange={(value) => handleFilterChange(filter.key, value)}
          >
            <SelectTrigger className="w-full sm:w-[180px] min-h-[44px]">
              <SelectValue placeholder={filter.label} />
            </SelectTrigger>
            <SelectContent>
              {filter.options.map((option) => (
                <SelectItem
                  key={option.value}
                  value={option.value}
                  className="min-h-[44px]"
                >
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ))}

        {/* Date range picker */}
        {showDateRange && (
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  'w-full sm:w-[240px] justify-start text-left font-normal min-h-[44px]',
                  !dateRange.from && !dateRange.to && 'text-muted-foreground'
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {dateRange.from ? (
                  dateRange.to ? (
                    <>
                      {format(dateRange.from, 'dd MMM')} - {format(dateRange.to, 'dd MMM yyyy')}
                    </>
                  ) : (
                    format(dateRange.from, 'dd MMM yyyy')
                  )
                ) : (
                  'Select date range'
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="range"
                selected={
                  dateRange.from && dateRange.to
                    ? { from: dateRange.from, to: dateRange.to }
                    : undefined
                }
                onSelect={(range) =>
                  handleDateRangeChange({ from: range?.from, to: range?.to })
                }
                numberOfMonths={2}
              />
            </PopoverContent>
          </Popover>
        )}

        {/* Clear all button */}
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearAllFilters}
            className="min-h-[44px] w-full sm:w-auto"
          >
            <X className="mr-1 h-4 w-4" />
            Clear all
          </Button>
        )}
      </div>

      {/* Active filter badges */}
      {hasActiveFilters && (
        <div className="flex flex-wrap items-center gap-2">
          {activeFilters.map((filter) => (
            <Badge
              key={filter.key}
              variant="secondary"
              className="gap-1 pr-1"
            >
              <span className="text-muted-foreground">{filter.label}:</span>
              <span>{filter.displayValue}</span>
              <button
                onClick={() => clearFilter(filter.key)}
                className="ml-1 rounded-full p-0.5 hover:bg-muted"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}

          {/* Result count */}
          {typeof filteredCount === 'number' && typeof totalCount === 'number' && (
            <span className="text-sm text-muted-foreground ml-2">
              {filteredCount} of {totalCount} results
            </span>
          )}
        </div>
      )}
    </div>
  );
}
