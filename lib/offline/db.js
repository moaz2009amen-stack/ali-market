import Dexie from 'dexie'

// قاعدة البيانات المحلية للـ Offline Mode
export const db = new Dexie('AliMarketDB')

db.version(1).stores({
  products: '++id, name, barcode, quantity, sync_status',
  customers: '++id, name, phone, sync_status',
  invoices: '++id, invoice_number, customer_id, created_at, sync_status',
  invoice_items: '++id, invoice_id, product_id, quantity, price',
  payments: '++id, customer_id, amount, created_at, sync_status',
  sync_queue: '++id, table_name, action, data, created_at, status'
})

// حالات المزامنة
export const SYNC_STATUS = {
  PENDING: 'pending',
  SYNCED: 'synced',
  FAILED: 'failed'
}

// حفظ بيانات محلياً
export async function saveOfflineData(table, data) {
  try {
    const id = await db[table].add({
      ...data,
      sync_status: SYNC_STATUS.PENDING,
      created_at: new Date().toISOString()
    })
    
    // إضافة للـ Queue
    await db.sync_queue.add({
      table_name: table,
      action: 'insert',
      data: { ...data, local_id: id },
      created_at: new Date().toISOString(),
      status: SYNC_STATUS.PENDING
    })
    
    return id
  } catch (error) {
    console.error('Error saving offline data:', error)
    throw error
  }
}

// جلب البيانات المحلية
export async function getOfflineData(table) {
  try {
    return await db[table].toArray()
  } catch (error) {
    console.error('Error getting offline data:', error)
    return []
  }
}

// مزامنة البيانات
export async function syncData(supabase) {
  try {
    const pendingItems = await db.sync_queue
      .where('status')
      .equals(SYNC_STATUS.PENDING)
      .toArray()
    
    for (const item of pendingItems) {
      try {
        const { data, error } = await supabase
          .from(item.table_name)
          .insert(item.data)
          .select()
        
        if (error) throw error
        
        // تحديث الحالة
        await db.sync_queue.update(item.id, {
          status: SYNC_STATUS.SYNCED,
          synced_at: new Date().toISOString()
        })
        
        // تحديث الجدول الأصلي
        if (data && data[0]) {
          await db[item.table_name].update(item.data.local_id, {
            id: data[0].id,
            sync_status: SYNC_STATUS.SYNCED
          })
        }
      } catch (error) {
        console.error(`Sync error for ${item.table_name}:`, error)
        await db.sync_queue.update(item.id, {
          status: SYNC_STATUS.FAILED,
          error: error.message
        })
      }
    }
    
    return { success: true }
  } catch (error) {
    console.error('Sync error:', error)
    return { success: false, error }
  }
}

// التحقق من حالة الإنترنت
export function isOnline() {
  return navigator.onLine
}

// مراقبة حالة الإنترنت
export function watchOnlineStatus(callback) {
  window.addEventListener('online', () => callback(true))
  window.addEventListener('offline', () => callback(false))
  
  return () => {
    window.removeEventListener('online', callback)
    window.removeEventListener('offline', callback)
  }
}
