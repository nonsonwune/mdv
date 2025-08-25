"use client"

import React, { useState, useEffect } from 'react'
import { formatNaira } from '../../lib/format'

interface PriceRangeFilterProps {
  min: number
  max: number
  value: [number, number]
  onChange: (value: [number, number]) => void
  step?: number
  collapsible?: boolean
  defaultExpanded?: boolean
}

export default function PriceRangeFilter({
  min,
  max,
  value,
  onChange,
  step = 1000,
  collapsible = true,
  defaultExpanded = true
}: PriceRangeFilterProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded)
  const [localValue, setLocalValue] = useState(value)

  useEffect(() => {
    setLocalValue(value)
  }, [value])

  const handleMinChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newMin = Number(e.target.value)
    if (newMin <= localValue[1]) {
      setLocalValue([newMin, localValue[1]])
    }
  }

  const handleMaxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newMax = Number(e.target.value)
    if (newMax >= localValue[0]) {
      setLocalValue([localValue[0], newMax])
    }
  }

  const handleApply = () => {
    onChange(localValue)
  }

  const handleReset = () => {
    setLocalValue([min, max])
    onChange([min, max])
  }

  const minPercent = ((localValue[0] - min) / (max - min)) * 100
  const maxPercent = ((localValue[1] - min) / (max - min)) * 100

  return (
    <div className="border-b border-neutral-200 pb-4 mb-4">
      {collapsible ? (
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center justify-between w-full text-left py-2 hover:text-maroon-700 transition-colors"
        >
          <h3 className="text-sm font-semibold">Price Range</h3>
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
        <h3 className="text-sm font-semibold py-2">Price Range</h3>
      )}

      {(!collapsible || isExpanded) && (
        <div className="mt-4 space-y-4">
          {/* Range Slider */}
          <div className="relative pt-1">
            <div className="relative h-2 bg-neutral-200 rounded">
              <div
                className="absolute h-2 bg-maroon-700 rounded"
                style={{
                  left: `${minPercent}%`,
                  width: `${maxPercent - minPercent}%`
                }}
              />
            </div>
            
            {/* Min Slider */}
            <input
              type="range"
              min={min}
              max={max}
              step={step}
              value={localValue[0]}
              onChange={handleMinChange}
              className="absolute w-full h-2 bg-transparent appearance-none pointer-events-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-maroon-700 [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:cursor-pointer"
              style={{ zIndex: localValue[0] === max ? 2 : 1 }}
            />
            
            {/* Max Slider */}
            <input
              type="range"
              min={min}
              max={max}
              step={step}
              value={localValue[1]}
              onChange={handleMaxChange}
              className="absolute w-full h-2 bg-transparent appearance-none pointer-events-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-maroon-700 [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:cursor-pointer"
            />
          </div>

          {/* Price Inputs */}
          <div className="flex items-center gap-2">
            <div className="flex-1">
              <label className="text-xs text-neutral-600">Min</label>
              <input
                type="number"
                value={localValue[0]}
                onChange={(e) => setLocalValue([Number(e.target.value), localValue[1]])}
                className="w-full px-2 py-1 text-sm border border-neutral-300 rounded focus:outline-none focus:border-maroon-700"
                min={min}
                max={localValue[1]}
                step={step}
              />
            </div>
            <span className="text-neutral-400 mt-5">—</span>
            <div className="flex-1">
              <label className="text-xs text-neutral-600">Max</label>
              <input
                type="number"
                value={localValue[1]}
                onChange={(e) => setLocalValue([localValue[0], Number(e.target.value)])}
                className="w-full px-2 py-1 text-sm border border-neutral-300 rounded focus:outline-none focus:border-maroon-700"
                min={localValue[0]}
                max={max}
                step={step}
              />
            </div>
          </div>

          {/* Current Range Display */}
          <div className="text-sm text-center text-neutral-600">
            {formatNaira(localValue[0])} - {formatNaira(localValue[1])}
          </div>

          {/* Apply/Reset Buttons */}
          {(localValue[0] !== value[0] || localValue[1] !== value[1]) && (
            <div className="flex gap-2">
              <button
                onClick={handleApply}
                className="flex-1 px-3 py-1.5 text-xs bg-maroon-700 text-white rounded hover:bg-maroon-800 transition-colors"
              >
                Apply
              </button>
              <button
                onClick={handleReset}
                className="flex-1 px-3 py-1.5 text-xs border border-neutral-300 rounded hover:bg-neutral-50 transition-colors"
              >
                Reset
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
