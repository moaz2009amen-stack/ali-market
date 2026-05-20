export default function Button({ 
  children, 
  variant = 'primary', 
  size = 'md', 
  fullWidth = false,
  disabled = false,
  type = 'button',
  onClick,
  className = ''
}) {
  const baseStyles = 'font-semibold rounded-lg transition-all duration-200 flex items-center justify-center gap-2'
  
  const variants = {
    primary: 'bg-primary-600 text-white hover:bg-primary-700 active:bg-primary-800 disabled:bg-gray-300',
    secondary: 'bg-gray-200 text-gray-900 hover:bg-gray-300 active:bg-gray-400 disabled:bg-gray-100',
    success: 'bg-success-500 text-white hover:bg-success-600 active:bg-success-700 disabled:bg-gray-300',
    danger: 'bg-danger-500 text-white hover:bg-danger-600 active:bg-danger-700 disabled:bg-gray-300',
    outline: 'border-2 border-primary-600 text-primary-600 hover:bg-primary-50 active:bg-primary-100 disabled:border-gray-300 disabled:text-gray-300',
  }
  
  const sizes = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-base',
    lg: 'px-6 py-3 text-lg',
  }
  
  const widthClass = fullWidth ? 'w-full' : ''
  
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${widthClass} ${className} disabled:cursor-not-allowed`}
    >
      {children}
    </button>
  )
}
