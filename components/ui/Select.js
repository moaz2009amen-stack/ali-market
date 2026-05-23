export default function Select({
  label,
  name,
  value,
  onChange,
  options = [],
  placeholder = 'اختر...',
  required = false,
  disabled = false,
  error,
  className = ''
}) {
  return (
    <div className={`w-full ${className}`}>
      {label && (
        <label htmlFor={name} className="block text-sm font-medium text-gray-700 mb-2">
          {label}
          {required && <span className="text-danger-500 mr-1">*</span>}
        </label>
      )}
      
      <div className="relative">
        <select
          id={name}
          name={name}
          value={value}
          onChange={onChange}
          required={required}
          disabled={disabled}
          className={`
            w-full px-4 py-2.5 rounded-lg border text-right
            bg-white
            ${error 
              ? 'border-danger-500 focus:border-danger-500 focus:ring-danger-500' 
              : 'border-gray-300 focus:border-primary-500 focus:ring-primary-500'
            }
            focus:ring-2 focus:ring-opacity-20 outline-none
            disabled:bg-gray-100 disabled:cursor-not-allowed
            transition-colors duration-200
            appearance-none
            cursor-pointer
          `}
        >
          <option value="" disabled>{placeholder}</option>
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        
        {/* Custom Arrow */}
        <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
          <svg width="12" height="8" viewBox="0 0 12 8" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M1 1.5L6 6.5L11 1.5" stroke="#6B7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
      </div>
      
      {error && (
        <p className="mt-1.5 text-sm text-danger-500">{error}</p>
      )}
    </div>
  )
}
