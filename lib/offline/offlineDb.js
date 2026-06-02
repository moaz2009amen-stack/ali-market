import Dexie from 'dexie'

// ============================================================
// UUID صح متوافق مع Supabase (بدل local_xxx)
// ============================================================
export function generateUUID() {
  // crypto.randomUUID متاح في كل المتصفحات الحديثة
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID()
  }
  // fallback
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0
    return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16)
  })
}

// ============================================================
// قاعدة البيانات المحلية - Dexie
// ============================================================
export const db = new Dexie('JamlatAbuAli')

// ✅ نسخة واحدة واضحة — مفيش version conflict
db.version(1).stores({
  products:      'id, name, is_active',
  customers:     'id, name, is_active',
  invoices:      'id, invoice_number, customer_id, created_at',
  invoice_items: 'id, invoice_id',
  payments:      'id, customer_id, invoice_id, created_at',
  cache_meta:    'key',
  sync_queue:    '++local_id, status, created_at',
})

// ============================================================
// Cache helpers
// ============================================================
export async function saveToCache(table, data) {
  try {
    if (!Array.isArray(data)) return
    await db[table].bulkPut(data)
    await db.cache_meta.put({ key: `${table}_at`, value: Date.now() })
  } catch (e) {
    console.warn(`saveToCache(${table}):`, e.message)
  }
}

export async function getFromCache(table) {
  try {
    return await db[table].toArray()
  } catch (e) {
    console.warn(`getFromCache(${table}):`, e.message)
    return []
  }
}

export function isOnline() {
  if (typeof navigator === 'undefined') return true
  return navigator.onLine
}

// ============================================================
// Sync Queue
// ============================================================
export async function addToQueue(tableName, operation, data) {
  try {
    await db.sync_queue.add({
      table_name: tableName,
      operation,                        // 'insert' | 'update' | 'delete'
      payload:    JSON.stringify(data),
      status:     'pending',
      retries:    0,
      created_at: Date.now(),
    })
  } catch (e) {
    console.warn('addToQueue:', e.message)
  }
}

export async function getPendingCount() {
  try {
    return await db.sync_queue.where('status').equals('pending').count()
  } catch (e) { return 0 }
}

export async function getPendingQueue() {
  try {
    return await db.sync_queue
      .where('status').equals('pending')
      .sortBy('created_at')
  } catch (e) { return [] }
}

// ============================================================
// المزامنة مع Supabase
// ============================================================
export async function syncQueue(supabase) {
  const items = await getPendingQueue()
  if (items.length === 0) return { synced: 0, failed: 0 }

  let synced = 0, failed = 0

  for (const item of items) {
    try {
      const data = JSON.parse(item.payload)

      if (item.operation === 'insert') {
        // ✅ احذف الحقول اللي بنستخدمها محلياً بس
        const { customer_name, collected_by_name, ...supabaseData } = data
        const { error } = await supabase.from(item.table_name).insert([supabaseData])
        if (error) throw error

      } else if (item.operation === 'update') {
        const { id, customer_name, collected_by_name, ...rest } = data
        const { error } = await supabase.from(item.table_name).update(rest).eq('id', id)
        if (error) throw error

      } else if (item.operation === 'delete') {
        const { error } = await supabase.from(item.table_name).delete().eq('id', data.id)
        if (error) throw error
      }

      // نجح — احذفه
      await db.sync_queue.delete(item.local_id)
      synced++

    } catch (e) {
      console.warn(`Sync failed [${item.table_name}/${item.operation}]:`, e.message)
      const retries = (item.retries || 0) + 1
      await db.sync_queue.update(item.local_id, {
        retries,
        status: retries >= 5 ? 'failed' : 'pending',
        error:  e.message,
      })
      failed++
    }
  }

  return { synced, failed }
}
