import Dexie from 'dexie'

// ============================================================
// قاعدة البيانات المحلية
// ============================================================
export const db = new Dexie('JamlatAbuAli')

db.version(2).stores({
  products:      'id, name, category, is_active',
  customers:     'id, name, phone, is_active',
  invoices:      'id, invoice_number, customer_id, created_at',
  invoice_items: 'id, invoice_id',
  payments:      'id, customer_id, created_at',
  cache_meta:    'key',
  // ✅ جدول جديد: طابور العمليات اللي محتاجة تتزامن
  sync_queue:    '++id, table_name, operation, status, created_at',
})

// ============================================================
// Cache Operations
// ============================================================
export async function saveToCache(table, data) {
  try {
    if (!Array.isArray(data) || data.length === 0) return
    await db[table].bulkPut(data)
    await db.cache_meta.put({
      key:   `${table}_updated_at`,
      value: new Date().toISOString()
    })
  } catch (e) {
    console.error(`Cache save error (${table}):`, e)
  }
}

export async function getFromCache(table) {
  try {
    return await db[table].toArray()
  } catch (e) {
    console.error(`Cache get error (${table}):`, e)
    return []
  }
}

export function isOnline() {
  return typeof navigator !== 'undefined' ? navigator.onLine : true
}

// ============================================================
// Sync Queue — حفظ العمليات لما نت مش موجود
// ============================================================

// أضف عملية للطابور
export async function addToQueue(table_name, operation, data) {
  try {
    await db.sync_queue.add({
      table_name,
      operation,   // 'insert' | 'update' | 'delete'
      data:        JSON.stringify(data),
      status:      'pending',
      created_at:  new Date().toISOString(),
      retries:     0,
    })
  } catch (e) {
    console.error('Queue add error:', e)
  }
}

// جيب كل العمليات اللي لسه ما اترفعتش
export async function getPendingQueue() {
  try {
    return await db.sync_queue
      .where('status').equals('pending')
      .sortBy('created_at')
  } catch (e) {
    return []
  }
}

// عدد العمليات المنتظرة
export async function getPendingCount() {
  try {
    return await db.sync_queue.where('status').equals('pending').count()
  } catch (e) {
    return 0
  }
}

// ============================================================
// المزامنة — بتشتغل تلقائي لما النت يرجع
// ============================================================
export async function syncQueue(supabase) {
  const pending = await getPendingQueue()
  if (pending.length === 0) return { synced: 0, failed: 0 }

  let synced = 0
  let failed = 0

  for (const item of pending) {
    try {
      const data = JSON.parse(item.data)

      if (item.operation === 'insert') {
        const { error } = await supabase.from(item.table_name).insert([data])
        if (error) throw error
      } else if (item.operation === 'update') {
        const { id, ...rest } = data
        const { error } = await supabase.from(item.table_name).update(rest).eq('id', id)
        if (error) throw error
      } else if (item.operation === 'delete') {
        const { error } = await supabase.from(item.table_name).delete().eq('id', data.id)
        if (error) throw error
      }

      // نجح — احذفه من الطابور
      await db.sync_queue.delete(item.id)
      synced++
    } catch (e) {
      console.error(`Sync failed for item ${item.id}:`, e)
      // سجل الفشل
      await db.sync_queue.update(item.id, {
        retries: (item.retries || 0) + 1,
        status:  (item.retries || 0) >= 3 ? 'failed' : 'pending',
        error:   e.message,
      })
      failed++
    }
  }

  return { synced, failed }
}
