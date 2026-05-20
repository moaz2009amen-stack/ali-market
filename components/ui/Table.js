export default function Table({ 
  columns = [], 
  data = [], 
  onRowClick,
  emptyMessage = 'لا توجد بيانات',
  loading = false 
}) {
  if (loading) {
    return (
      <div className="w-full overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              {columns.map((col, idx) => (
                <th key={idx} className="px-6 py-3 text-right text-sm font-semibold text-gray-700">
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {[1, 2, 3].map((row) => (
              <tr key={row} className="border-b border-gray-200">
                {columns.map((col, idx) => (
                  <td key={idx} className="px-6 py-4">
                    <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  }

  if (data.length === 0) {
    return (
      <div className="w-full py-12 text-center">
        <p className="text-gray-500">{emptyMessage}</p>
      </div>
    )
  }

  return (
    <div className="w-full overflow-x-auto">
      <table className="w-full">
        <thead className="bg-gray-50 border-b border-gray-200">
          <tr>
            {columns.map((col, idx) => (
              <th 
                key={idx} 
                className="px-6 py-3 text-right text-sm font-semibold text-gray-700 whitespace-nowrap"
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {data.map((row, rowIdx) => (
            <tr
              key={rowIdx}
              onClick={() => onRowClick && onRowClick(row)}
              className={`
                ${onRowClick ? 'cursor-pointer hover:bg-gray-50' : ''}
                transition-colors duration-150
              `}
            >
              {columns.map((col, colIdx) => (
                <td key={colIdx} className="px-6 py-4 text-sm text-gray-900 whitespace-nowrap">
                  {col.render ? col.render(row) : row[col.accessor]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
