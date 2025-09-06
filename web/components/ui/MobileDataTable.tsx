'use client'

import { useState, ReactNode } from 'react'
import { ChevronDownIcon, ChevronUpIcon, EllipsisVerticalIcon } from '@heroicons/react/24/outline'

interface Column<T> {
  key: keyof T | string
  label: string
  render?: (value: any, row: T) => ReactNode
  sortable?: boolean
  mobileHidden?: boolean
  mobileLabel?: string
  className?: string
}

interface MobileDataTableProps<T> {
  data: T[]
  columns: Column<T>[]
  keyField: keyof T
  loading?: boolean
  emptyMessage?: string
  onRowClick?: (row: T) => void
  actions?: (row: T) => ReactNode
  searchable?: boolean
  searchPlaceholder?: string
  onSearch?: (query: string) => void
}

export default function MobileDataTable<T extends Record<string, any>>({
  data,
  columns,
  keyField,
  loading = false,
  emptyMessage = 'No data available',
  onRowClick,
  actions,
  searchable = false,
  searchPlaceholder = 'Search...',
  onSearch
}: MobileDataTableProps<T>) {
  const [sortField, setSortField] = useState<string | null>(null)
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')
  const [searchQuery, setSearchQuery] = useState('')
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set())

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
  }

  const handleSearch = (query: string) => {
    setSearchQuery(query)
    onSearch?.(query)
  }

  const toggleRowExpansion = (rowKey: string) => {
    const newExpanded = new Set(expandedRows)
    if (newExpanded.has(rowKey)) {
      newExpanded.delete(rowKey)
    } else {
      newExpanded.add(rowKey)
    }
    setExpandedRows(newExpanded)
  }

  const sortedData = [...data].sort((a, b) => {
    if (!sortField) return 0
    
    const aValue = a[sortField]
    const bValue = b[sortField]
    
    if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1
    if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1
    return 0
  })

  const visibleColumns = columns.filter(col => !col.mobileHidden)
  const hiddenColumns = columns.filter(col => col.mobileHidden)

  if (loading) {
    return (
      <div className="space-y-4">
        {searchable && (
          <div className="h-12 bg-gray-200 rounded-lg animate-pulse"></div>
        )}
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-20 bg-gray-200 rounded-lg animate-pulse"></div>
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Search */}
      {searchable && (
        <div className="relative">
          <input
            type="search"
            placeholder={searchPlaceholder}
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            className="w-full pl-4 pr-4 py-3 border-2 border-gray-300 rounded-lg text-base focus:border-maroon-600 focus:ring-2 focus:ring-maroon-600/20 transition-all duration-200 min-h-[48px]"
          />
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
            <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </div>
      )}

      {/* Desktop Table */}
      <div className="hidden md:block overflow-x-auto bg-white rounded-lg border border-gray-200">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              {columns.map((column) => (
                <th
                  key={String(column.key)}
                  className={`px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider ${
                    column.sortable ? 'cursor-pointer hover:bg-gray-100' : ''
                  } ${column.className || ''}`}
                  onClick={() => column.sortable && handleSort(String(column.key))}
                >
                  <div className="flex items-center gap-1">
                    {column.label}
                    {column.sortable && (
                      <div className="flex flex-col">
                        <ChevronUpIcon 
                          className={`w-3 h-3 ${
                            sortField === column.key && sortDirection === 'asc' 
                              ? 'text-maroon-600' 
                              : 'text-gray-400'
                          }`} 
                        />
                        <ChevronDownIcon 
                          className={`w-3 h-3 -mt-1 ${
                            sortField === column.key && sortDirection === 'desc' 
                              ? 'text-maroon-600' 
                              : 'text-gray-400'
                          }`} 
                        />
                      </div>
                    )}
                  </div>
                </th>
              ))}
              {actions && <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {sortedData.map((row) => (
              <tr
                key={String(row[keyField])}
                className={`${onRowClick ? 'cursor-pointer hover:bg-gray-50' : ''}`}
                onClick={() => onRowClick?.(row)}
              >
                {columns.map((column) => (
                  <td key={String(column.key)} className={`px-6 py-4 whitespace-nowrap text-sm ${column.className || ''}`}>
                    {column.render ? column.render(row[column.key], row) : String(row[column.key] || '')}
                  </td>
                ))}
                {actions && (
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    {actions(row)}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile Cards */}
      <div className="md:hidden space-y-3">
        {sortedData.map((row) => {
          const rowKey = String(row[keyField])
          const isExpanded = expandedRows.has(rowKey)
          
          return (
            <div
              key={rowKey}
              className="bg-white rounded-lg border border-gray-200 shadow-sm"
            >
              {/* Main card content */}
              <div
                className={`p-4 ${onRowClick ? 'cursor-pointer' : ''}`}
                onClick={() => onRowClick?.(row)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 space-y-2">
                    {visibleColumns.map((column) => (
                      <div key={String(column.key)} className="flex justify-between items-start">
                        <span className="text-sm font-medium text-gray-500 min-w-[80px]">
                          {column.mobileLabel || column.label}:
                        </span>
                        <span className="text-sm text-gray-900 text-right flex-1 ml-2">
                          {column.render ? column.render(row[column.key], row) : String(row[column.key] || '')}
                        </span>
                      </div>
                    ))}
                  </div>
                  
                  <div className="flex items-center gap-2 ml-4">
                    {actions && (
                      <div onClick={(e) => e.stopPropagation()}>
                        {actions(row)}
                      </div>
                    )}
                    
                    {hiddenColumns.length > 0 && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          toggleRowExpansion(rowKey)
                        }}
                        className="p-2 text-gray-400 hover:text-gray-600 min-h-[44px] min-w-[44px] flex items-center justify-center"
                        aria-label={isExpanded ? 'Show less' : 'Show more'}
                      >
                        {isExpanded ? (
                          <ChevronUpIcon className="w-5 h-5" />
                        ) : (
                          <ChevronDownIcon className="w-5 h-5" />
                        )}
                      </button>
                    )}
                  </div>
                </div>
              </div>
              
              {/* Expanded content */}
              {isExpanded && hiddenColumns.length > 0 && (
                <div className="border-t border-gray-100 p-4 bg-gray-50">
                  <div className="space-y-2">
                    {hiddenColumns.map((column) => (
                      <div key={String(column.key)} className="flex justify-between items-start">
                        <span className="text-sm font-medium text-gray-500 min-w-[80px]">
                          {column.mobileLabel || column.label}:
                        </span>
                        <span className="text-sm text-gray-900 text-right flex-1 ml-2">
                          {column.render ? column.render(row[column.key], row) : String(row[column.key] || '')}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Empty state */}
      {sortedData.length === 0 && (
        <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
          <div className="text-gray-400 mb-4">
            <svg className="w-12 h-12 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
            </svg>
          </div>
          <p className="text-gray-500 text-lg font-medium">{emptyMessage}</p>
        </div>
      )}
    </div>
  )
}
