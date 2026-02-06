// src/components/ui/Calendar.tsx
import * as React from 'react'
import { DayPicker } from 'react-day-picker'
import { th } from 'date-fns/locale'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '../../lib/utils'
import { buttonVariants } from './Button'

import 'react-day-picker/style.css'

export type CalendarProps = React.ComponentProps<typeof DayPicker>

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  ...props
}: CalendarProps) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn('p-3', className)}
      locale={th}
      classNames={{
        months: 'flex flex-col sm:flex-row gap-4',
        month: 'space-y-4',
        month_caption: 'flex justify-center pt-1 relative items-center h-10',
        caption_label: 'text-sm font-medium',
        nav: 'flex items-center gap-1',
        button_previous: cn(
          buttonVariants({ variant: 'outline' }),
          'absolute left-1 top-0 h-7 w-7 bg-white p-0 opacity-50 hover:opacity-100 z-10'
        ),
        button_next: cn(
          buttonVariants({ variant: 'outline' }),
          'absolute right-1 top-0 h-7 w-7 bg-white p-0 opacity-50 hover:opacity-100 z-10'
        ),
        month_grid: 'w-full border-collapse',
        weekdays: 'flex',
        weekday: 'text-gray-500 rounded-md w-9 font-normal text-[0.8rem] text-center',
        week: 'flex w-full mt-2',
        day: 'relative p-0 text-center text-sm focus-within:relative focus-within:z-20 [&:has([aria-selected])]:bg-primary-500 first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md [&:has([aria-selected].day-range-end)]:rounded-r-md',
        day_button: cn(
          buttonVariants({ variant: 'ghost' }),
          'h-9 w-9 p-0 font-normal aria-selected:opacity-100 hover:bg-primary-500 hover:text-white'
        ),
        range_start: 'day-range-start rounded-l-md',
        range_end: 'day-range-end rounded-r-md',
        selected:
          'bg-primary-500 text-white hover:bg-primary-600 hover:text-white focus:bg-primary-500 focus:text-white',
        today: 'bg-primary-100 text-primary-700',
        outside: 'text-gray-400 aria-selected:bg-primary-500 aria-selected:text-white',
        disabled: 'text-gray-400 opacity-50',
        range_middle: 'aria-selected:bg-primary-500 aria-selected:text-white',
        hidden: 'invisible',
        ...classNames,
      }}
      components={{
        Chevron: ({ orientation }) =>
          orientation === 'left'
            ? <ChevronLeft className="h-4 w-4" />
            : <ChevronRight className="h-4 w-4" />,
      }}
      {...props}
    />
  )
}
Calendar.displayName = 'Calendar'

export { Calendar }
