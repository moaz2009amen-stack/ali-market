// حساب إجمالي الفاتورة
export function calculateInvoiceTotal(items) {
  return items.reduce((total, item) => {
    return total + (item.quantity * item.price)
  }, 0)
}

// حساب الربح من فاتورة
export function calculateInvoiceProfit(items) {
  return items.reduce((profit, item) => {
    const cost = item.cost_price * item.quantity
    const revenue = item.price * item.quantity
    return profit + (revenue - cost)
  }, 0)
}

// حساب نسبة الربح
export function calculateProfitMargin(costPrice, sellingPrice) {
  if (costPrice === 0) return 0
  return ((sellingPrice - costPrice) / costPrice) * 100
}

// حساب الضريبة (إذا كانت مطلوبة مستقبلاً)
export function calculateTax(amount, taxRate = 0) {
  return amount * (taxRate / 100)
}

// حساب الخصم
export function calculateDiscount(amount, discountPercent) {
  return amount * (discountPercent / 100)
}

// حساب المتبقي
export function calculateRemaining(total, paid) {
  return Math.max(0, total - paid)
}

// التحقق من نقص المخزون
export function isLowStock(currentStock, minStock) {
  return currentStock <= minStock
}

// حساب قيمة المخزون
export function calculateInventoryValue(products) {
  return products.reduce((total, product) => {
    return total + (product.quantity * product.cost_price)
  }, 0)
}
