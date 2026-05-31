import Dexie from 'dexie'

// قاعدة بيانات محلية على الجهاز
export const db = new Dexie('JamlatAbuAli')

db.version(1).stores({
  products: 'id, name, category, is_active',
  customers: 'id, name, phone, is_active',
  invoices: 'id, invoice_number, customer_id, created_at',
  invoice_items: 'id, invoice_id',
  payments: 'id, customer_id, created_at',
  cache_meta: 'key'
})

// حفظ بيانات في الـ cache المحلي
export async function saveToCache(table, data) {
  try {
    if (!Array.isArray(data) || data.length === 0) return
    await db[table].bulkPut(data)
    await db.cache_meta.put({ key: `${table}_updated_at`, value: new Date().toISOString() })
  } catch (error) {
    console.error(`Cache save error (${table}):`, error)
  }
}

// جيب بيانات من الـ cache المحلي
export async function getFromCache(table) {
  try {
    return await db[table].toArray()
  } catch (error) {
    console.error(`Cache get error (${table}):`, error)
    return []
  }
}

// امسح cache جدول معين
export async function clearCache(table) {
  try {
    await db[table].clear()
  } catch (error) {
    console.error(`Cache clear error (${table}):`, error)
  }
}

// متى آخر تحديث؟
export async function getLastUpdated(table) {
  try {
    const meta = await db.cache_meta.get(`${table}_updated_at`)
    return meta?.value || null
  } catch {
    return null
  }
}

// هل الجهاز متصل؟
export function isOnline() {
  return typeof navigator !== 'undefined' ? navigator.onLine : true
}
