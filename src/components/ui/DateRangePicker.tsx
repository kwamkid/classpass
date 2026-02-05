// src/components/ui/DateRangePicker.tsx
import React, { type FC, useState, useEffect, useRef } from 'react'
import { format, subDays, startOfMonth, endOfMonth, subMonths, startOfWeek, endOfWeek, subWeeks } from 'date-fns'
import { th } from 'date-fns/locale'
import { ChevronUp, ChevronDown, Check, Calendar as CalendarIcon } from 'lucide-react'

import { Button } from './Button'
import { Popover, PopoverContent, PopoverTrigger } from './Popover'
import { Calendar } from './Calendar'
import { DateInput } from './DateInput'
import { Label } from './Label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from './Select'
import { Switch } from './Switch'
import { cn } from '../../lib/utils'

// Type compatible with old DateValueType
export interface DateValueType {
  startDate: Date | string | null
  endDate: Date | string | null
}

interface DateRange {
  from: Date
  to: Date | undefined
}

interface Preset {
  name: string
  label: string
}

// Thai presets
const PRESETS: Preset[] = [
  { name: 'today', label: 'วันนี้' },
  { name: 'yesterday', label: 'เมื่อวาน' },
  { name: 'last7', label: '7 วันที่ผ่านมา' },
  { name: 'last14', label: '14 วันที่ผ่านมา' },
  { name: 'last30', label: '30 วันที่ผ่านมา' },
  { name: 'thisWeek', label: 'สัปดาห์นี้' },
  { name: 'lastWeek', label: 'สัปดาห์ที่แล้ว' },
  { name: 'thisMonth', label: 'เดือนนี้' },
  { name: 'lastMonth', label: 'เดือนที่แล้ว' }
]

const formatDate = (date: Date): string => {
  return format(date, 'd MMM yyyy', { locale: th })
}

const getDateAdjustedForTimezone = (dateInput: Date | string): Date => {
  if (typeof dateInput === 'string') {
    const parts = dateInput.split('-').map((part) => parseInt(part, 10))
    return new Date(parts[0], parts[1] - 1, parts[2])
  }
  return dateInput
}

export interface DateRangePickerProps {
  value: DateValueType | null
  onChange: (value: DateValueType | null) => void
  placeholder?: string
  disabled?: boolean
  showShortcuts?: boolean
  showCompare?: boolean
  className?: string
  align?: 'start' | 'center' | 'end'
}

const DateRangePicker: FC<DateRangePickerProps> = ({
  value,
  onChange,
  placeholder = 'เลือกช่วงวันที่',
  disabled = false,
  showShortcuts = true,
  showCompare = false,
  className,
  align = 'start'
}) => {
  const [isOpen, setIsOpen] = useState(false)

  // Convert value to internal DateRange format
  const getInitialRange = (): DateRange => {
    if (value?.startDate && value?.endDate) {
      return {
        from: typeof value.startDate === 'string' ? getDateAdjustedForTimezone(value.startDate) : value.startDate,
        to: typeof value.endDate === 'string' ? getDateAdjustedForTimezone(value.endDate) : value.endDate
      }
    }
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    return { from: today, to: today }
  }

  const [range, setRange] = useState<DateRange>(getInitialRange)
  const [rangeCompare, setRangeCompare] = useState<DateRange | undefined>(undefined)
  const [selectedPreset, setSelectedPreset] = useState<string | undefined>(undefined)

  const openedRangeRef = useRef<DateRange | undefined>(undefined)
  const openedRangeCompareRef = useRef<DateRange | undefined>(undefined)

  const [isSmallScreen, setIsSmallScreen] = useState(
    typeof window !== 'undefined' ? window.innerWidth < 960 : false
  )

  useEffect(() => {
    const handleResize = (): void => {
      setIsSmallScreen(window.innerWidth < 960)
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // Sync with external value
  useEffect(() => {
    if (value?.startDate && value?.endDate) {
      setRange({
        from: typeof value.startDate === 'string' ? getDateAdjustedForTimezone(value.startDate) : value.startDate,
        to: typeof value.endDate === 'string' ? getDateAdjustedForTimezone(value.endDate) : value.endDate
      })
    }
  }, [value])

  const getPresetRange = (presetName: string): DateRange => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    switch (presetName) {
      case 'today':
        return { from: today, to: today }
      case 'yesterday': {
        const yesterday = subDays(today, 1)
        return { from: yesterday, to: yesterday }
      }
      case 'last7':
        return { from: subDays(today, 6), to: today }
      case 'last14':
        return { from: subDays(today, 13), to: today }
      case 'last30':
        return { from: subDays(today, 29), to: today }
      case 'thisWeek':
        return { from: startOfWeek(today, { weekStartsOn: 0 }), to: today }
      case 'lastWeek': {
        const lastWeekStart = startOfWeek(subWeeks(today, 1), { weekStartsOn: 0 })
        const lastWeekEnd = endOfWeek(subWeeks(today, 1), { weekStartsOn: 0 })
        return { from: lastWeekStart, to: lastWeekEnd }
      }
      case 'thisMonth':
        return { from: startOfMonth(today), to: today }
      case 'lastMonth': {
        const lastMonth = subMonths(today, 1)
        return { from: startOfMonth(lastMonth), to: endOfMonth(lastMonth) }
      }
      default:
        return { from: today, to: today }
    }
  }

  const setPreset = (preset: string): void => {
    const newRange = getPresetRange(preset)
    setRange(newRange)
    setSelectedPreset(preset)

    if (rangeCompare) {
      setRangeCompare({
        from: new Date(newRange.from.getFullYear() - 1, newRange.from.getMonth(), newRange.from.getDate()),
        to: newRange.to
          ? new Date(newRange.to.getFullYear() - 1, newRange.to.getMonth(), newRange.to.getDate())
          : undefined
      })
    }
  }

  const checkPreset = (): void => {
    for (const preset of PRESETS) {
      const presetRange = getPresetRange(preset.name)
      const normalizedRangeFrom = new Date(range.from)
      normalizedRangeFrom.setHours(0, 0, 0, 0)
      const normalizedPresetFrom = new Date(presetRange.from)
      normalizedPresetFrom.setHours(0, 0, 0, 0)

      const normalizedRangeTo = new Date(range.to ?? 0)
      normalizedRangeTo.setHours(0, 0, 0, 0)
      const normalizedPresetTo = new Date(presetRange.to ?? 0)
      normalizedPresetTo.setHours(0, 0, 0, 0)

      if (
        normalizedRangeFrom.getTime() === normalizedPresetFrom.getTime() &&
        normalizedRangeTo.getTime() === normalizedPresetTo.getTime()
      ) {
        setSelectedPreset(preset.name)
        return
      }
    }
    setSelectedPreset(undefined)
  }

  const resetValues = (): void => {
    const initialRange = getInitialRange()
    setRange(initialRange)
    setRangeCompare(undefined)
  }

  useEffect(() => {
    checkPreset()
  }, [range])

  const PresetButton = ({
    preset,
    label,
    isSelected
  }: {
    preset: string
    label: string
    isSelected: boolean
  }) => (
    <Button
      className={cn('w-full justify-start', isSelected && 'pointer-events-none')}
      variant="ghost"
      size="sm"
      onClick={() => setPreset(preset)}
    >
      <span className={cn('mr-2 opacity-0', isSelected && 'opacity-70')}>
        <Check className="h-4 w-4" />
      </span>
      {label}
    </Button>
  )

  const areRangesEqual = (a?: DateRange, b?: DateRange): boolean => {
    if (!a || !b) return a === b
    return (
      a.from.getTime() === b.from.getTime() &&
      (!a.to || !b.to || a.to.getTime() === b.to.getTime())
    )
  }

  useEffect(() => {
    if (isOpen) {
      openedRangeRef.current = range
      openedRangeCompareRef.current = rangeCompare
    }
  }, [isOpen])

  const displayText = range.from
    ? range.to
      ? `${formatDate(range.from)} - ${formatDate(range.to)}`
      : formatDate(range.from)
    : placeholder

  const handleApply = () => {
    setIsOpen(false)
    if (
      !areRangesEqual(range, openedRangeRef.current) ||
      !areRangesEqual(rangeCompare, openedRangeCompareRef.current)
    ) {
      onChange({
        startDate: range.from,
        endDate: range.to ?? range.from
      })
    }
  }

  const handleCancel = () => {
    setIsOpen(false)
    resetValues()
  }

  const handleClear = () => {
    onChange(null)
    setIsOpen(false)
  }

  return (
    <Popover
      modal={true}
      open={isOpen}
      onOpenChange={(open: boolean) => {
        if (!open) {
          resetValues()
        }
        setIsOpen(open)
      }}
    >
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          disabled={disabled}
          className={cn(
            'w-full justify-start text-left font-normal h-[42px]',
            !value && 'text-gray-500',
            className
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          <span className="flex-1 text-left">{displayText}</span>
          <div className="ml-2 opacity-60">
            {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </div>
        </Button>
      </PopoverTrigger>
      <PopoverContent align={align} className="w-auto p-0">
        <div className="flex flex-col lg:flex-row">
          {/* Main content */}
          <div className="flex flex-col">
            {/* Date inputs and compare toggle */}
            <div className="flex flex-col lg:flex-row gap-2 px-3 pt-3 justify-end items-center lg:items-start">
              {showCompare && (
                <div className="flex items-center space-x-2 pr-4 py-1">
                  <Switch
                    defaultChecked={Boolean(rangeCompare)}
                    onCheckedChange={(checked: boolean) => {
                      if (checked) {
                        if (!range.to) {
                          setRange({ from: range.from, to: range.from })
                        }
                        setRangeCompare({
                          from: new Date(range.from.getFullYear() - 1, range.from.getMonth(), range.from.getDate()),
                          to: range.to
                            ? new Date(range.to.getFullYear() - 1, range.to.getMonth(), range.to.getDate())
                            : new Date(range.from.getFullYear() - 1, range.from.getMonth(), range.from.getDate())
                        })
                      } else {
                        setRangeCompare(undefined)
                      }
                    }}
                    id="compare-mode"
                  />
                  <Label htmlFor="compare-mode">เปรียบเทียบ</Label>
                </div>
              )}
              <div className="flex flex-col gap-2">
                <div className="flex gap-2 items-center">
                  <DateInput
                    value={range.from}
                    onChange={(date) => {
                      const toDate = range.to == null || date > range.to ? date : range.to
                      setRange((prev) => ({ ...prev, from: date, to: toDate }))
                    }}
                  />
                  <div className="text-gray-400">-</div>
                  <DateInput
                    value={range.to}
                    onChange={(date) => {
                      const fromDate = date < range.from ? date : range.from
                      setRange((prev) => ({ ...prev, from: fromDate, to: date }))
                    }}
                  />
                </div>
                {rangeCompare != null && (
                  <div className="flex gap-2 items-center">
                    <DateInput
                      value={rangeCompare?.from}
                      onChange={(date) => {
                        if (rangeCompare) {
                          const compareToDate =
                            rangeCompare.to == null || date > rangeCompare.to ? date : rangeCompare.to
                          setRangeCompare((prev) => prev && ({ ...prev, from: date, to: compareToDate }))
                        } else {
                          setRangeCompare({ from: date, to: new Date() })
                        }
                      }}
                    />
                    <div className="text-gray-400">-</div>
                    <DateInput
                      value={rangeCompare?.to}
                      onChange={(date) => {
                        if (rangeCompare?.from) {
                          const compareFromDate = date < rangeCompare.from ? date : rangeCompare.from
                          setRangeCompare({ ...rangeCompare, from: compareFromDate, to: date })
                        }
                      }}
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Mobile presets dropdown */}
            {showShortcuts && isSmallScreen && (
              <div className="px-3 py-2">
                <Select value={selectedPreset} onValueChange={(value) => setPreset(value)}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="เลือกช่วงเวลา..." />
                  </SelectTrigger>
                  <SelectContent>
                    {PRESETS.map((preset) => (
                      <SelectItem key={preset.name} value={preset.name}>
                        {preset.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Calendar */}
            <div className="p-3">
              <Calendar
                mode="range"
                onSelect={(value: { from?: Date; to?: Date } | undefined) => {
                  if (value?.from != null) {
                    setRange({ from: value.from, to: value?.to })
                  }
                }}
                selected={range}
                numberOfMonths={isSmallScreen ? 1 : 2}
                defaultMonth={
                  new Date(new Date().setMonth(new Date().getMonth() - (isSmallScreen ? 0 : 1)))
                }
                disabled={{ after: new Date() }}
              />
            </div>
          </div>

          {/* Desktop presets sidebar */}
          {showShortcuts && !isSmallScreen && (
            <div className="border-l border-gray-200 p-3 min-w-[140px]">
              <p className="text-xs font-medium text-gray-500 mb-2">ทางลัด</p>
              <div className="flex flex-col gap-1">
                {PRESETS.map((preset) => (
                  <PresetButton
                    key={preset.name}
                    preset={preset.name}
                    label={preset.label}
                    isSelected={selectedPreset === preset.name}
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-between items-center gap-2 p-3 border-t border-gray-200">
          <Button variant="ghost" size="sm" onClick={handleClear}>
            ล้าง
          </Button>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={handleCancel}>
              ยกเลิก
            </Button>
            <Button size="sm" onClick={handleApply}>
              ตกลง
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}

DateRangePicker.displayName = 'DateRangePicker'

export default DateRangePicker
