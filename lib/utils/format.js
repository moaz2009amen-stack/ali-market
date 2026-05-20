// تنسيق الأرقام والعملة
export function formatCurrency(amount) {
  return new Intl.NumberFormat('ar-EG', {
    style: 'currency',
    currency: 'EGP',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}

// تنسيق الأرقام فقط
export function formatNumber(number) {
  return new Intl.NumberFormat('ar-EG').format(number)
}

// تنسيق التاريخ
export function formatDate(date) {
  return new Intl.DateTimeFormat('ar-EG', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(new Date(date))
}

// تنسيق التاريخ والوقت
export function formatDateTime(date) {
  return new Intl.DateTimeFormat('ar-EG', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date))
}

// تنسيق رقم الهاتف
export function formatPhone(phone) {
  if (!phone) return ''
  // إزالة المسافات والرموز
  const cleaned = phone.replace(/\D/g, '')
  // تنسيق: 0123 456 7890
  const match = cleaned.match(/^(\d{4})(\d{3})(\d{4})$/)
  if (match) {
    return `${match[1]} ${match[2]} ${match[3]}`
  }
  return phone
}

// اختصار النصوص الطويلة
export function truncate(text, length = 50) {
  if (!text) return ''
  if (text.length <= length) return text
  return text.substring(0, length) + '...'
}
