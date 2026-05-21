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

// تنسيق رقم الهاتف (بدون مسافات)
export function formatPhone(phone) {
  if (!phone) return ''
  // إرجاع الرقم كما هو بدون تنسيق
  return phone.replace(/\D/g, '')
}

// اختصار النصوص الطويلة
export function truncate(text, length = 50) {
  if (!text) return ''
  if (text.length <= length) return text
  return text.substring(0, length) + '...'
}
