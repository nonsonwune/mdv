"use client"

import React, { useState } from 'react'

interface CheckboxFilterProps {
  title: string
  options: Array<{
    value: string
    label: string
    count?: number
  }>
  selected: string[]
  onChange: (values: string[]) => void
  showCount?: boolean
  collapsible?: boolean
  defaultExpanded?: boolean
}

export default function CheckboxFilter({
  title,
  options,
  selected,
  onChange,
  showCount = true,
  collapsible = true,
  defaultExpanded = true
}: CheckboxFilterProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded)

  const handleToggle = (value: string) => {
    if (selected.includes(value)) {
      onChange(selected.filter(v => v !== value))
    } else {
      onChange([...selected, value])
    }
  }

  const filteredOptions = options.filter(opt => opt.count === undefined || opt.count > 0)

  if (filteredOptions.length === 0) return null

  return (
    <div className="border-b border-neutral-200 pb-4 mb-4">
      {collapsible ? (
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center justify-between w-full text-left py-2 hover:text-maroon-700 transition-colors"
        >
          <h3 className="text-sm font-semibold">{title}</h3>
          <svg
            className={`w-4 h-4 transform transition-transform ${isExpanded ? 'rotate-180' : ''}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      ) : (
        <h3 className="text-sm font-semibold py-2">{title}</h3>
      )}

      {(!collapsible || isExpanded) && (
        <div className="mt-3 space-y-2 max-h-64 overflow-y-auto">
          {filteredOptions.map((option) => (
            <label
              key={option.value}
              className="flex items-center gap-2 cursor-pointer hover:text-maroon-700 transition-colors"
            >
              <input
                type="checkbox"
                checked={selected.includes(option.value)}
                onChange={() => handleToggle(option.value)}
                className="w-4 h-4 text-maroon-700 border-neutral-300 rounded focus:ring-maroon-700"
              />
              <span className="text-sm flex-1">{option.label}</span>
              {showCount && option.count !== undefined && (
                <span className="text-xs text-neutral-500">({option.count})</span>
              )}
            </label>
          ))}
        </div>
      )}
    </div>
  )
}
