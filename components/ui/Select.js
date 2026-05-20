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
      
      <select
        id={name}
        name={name}
        value={value}
        onChange={onChange}
        required={required}
        disabled={disabled}
        className={`
          w-full px-4 py-2.5 rounded-lg border text-right
          ${error 
            ? 'border-danger-500 focus:border-danger-500 focus:ring-danger-500' 
            : 'border-gray-300 focus:border-primary-500 focus:ring-primary-500'
          }
          focus:ring-2 focus:ring-opacity-20 outline-none
          disabled:bg-gray-100 disabled:cursor-not-allowed
          transition-colors duration-200
          appearance-none bg-no-repeat
          bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2020%2020%22%3E%3Cpath%20stroke%3D%22%236b7280%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20stroke-width%3D%221.5%22%20d%3D%22M6%208l4%204%204-4%22%2F%3E%3C%2Fsvg%3E')]
          bg-[length:1.5em] bg-[left_0.5rem_center]
        `}
      >
        <option value="">{placeholder}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      
      {error && (
        <p className="mt-1.5 text-sm text-danger-500">{error}</p>
      )}
    </div>
  )
}
