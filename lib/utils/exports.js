import * as XLSX from 'xlsx'

// تصدير Excel
export function exportToExcel(data, fileName, sheetName = 'Sheet1') {
  const worksheet = XLSX.utils.json_to_sheet(data)
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName)
  XLSX.writeFile(workbook, `${fileName}.xlsx`)
}

// طباعة فاتورة حرارية - مصلحة بالكامل
export function printThermalInvoice(invoice) {
  // حماية من القيم الفارغة
  const safeInvoice = {
    invoice_number: invoice.invoice_number || 'غير محدد',
    customer_name: invoice.customer_name || 'غير معروف',
    created_at: invoice.created_at || new Date().toISOString(),
    total_amount: parseFloat(invoice.total_amount || 0),
    paid_amount: parseFloat(invoice.paid_amount || 0),
    remaining_amount: parseFloat(invoice.remaining_amount || 0),
    items: (invoice.items || []).map(item => ({
      product_name: item.product_name || '',
      quantity: item.quantity || 0,
      selling_price: parseFloat(item.selling_price || 0),
    }))
  }

  const html = `<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="UTF-8">
  <title>فاتورة #${safeInvoice.invoice_number}</title>
  <style>
    @page {
      size: 80mm auto;
      margin: 0;
    }
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: Arial, sans-serif;
      font-size: 12px;
      direction: rtl;
      width: 80mm;
      padding: 8px;
      color: #000;
      background: #fff;
    }
    .header {
      text-align: center;
      border-bottom: 2px dashed #000;
      padding-bottom: 8px;
      margin-bottom: 8px;
    }
    .header h1 { font-size: 18px; font-weight: bold; margin-bottom: 2px; }
    .header p { font-size: 10px; }
    .info { margin-bottom: 8px; border-bottom: 1px dashed #000; padding-bottom: 8px; }
    .row { display: flex; justify-content: space-between; margin: 3px 0; font-size: 11px; }
    .items { border-bottom: 1px dashed #000; padding-bottom: 8px; margin-bottom: 8px; }
    .item { margin: 6px 0; }
    .item-name { font-weight: bold; font-size: 11px; margin-bottom: 2px; }
    .item-calc { display: flex; justify-content: space-between; font-size: 10px; }
    .totals { border-bottom: 2px dashed #000; padding-bottom: 8px; margin-bottom: 8px; }
    .total-row { display: flex; justify-content: space-between; font-weight: bold; margin: 4px 0; font-size: 12px; }
    .grand { font-size: 14px; border-top: 1px solid #000; padding-top: 4px; margin-top: 4px; }
    .footer { text-align: center; font-size: 10px; margin-top: 8px; }
  </style>
</head>
<body>
  <div class="header">
    <h1>جملة أبو علي</h1>
    <p>نظام إدارة المخزن والمبيعات</p>
  </div>

  <div class="info">
    <div class="row"><span>رقم الفاتورة:</span><strong>${safeInvoice.invoice_number}</strong></div>
    <div class="row"><span>التاريخ:</span><span>${new Date(safeInvoice.created_at).toLocaleDateString('ar-EG')}</span></div>
    <div class="row"><span>العميل:</span><strong>${safeInvoice.customer_name}</strong></div>
  </div>

  <div class="items">
    ${safeInvoice.items.map(item => `
      <div class="item">
        <div class="item-name">${item.product_name}</div>
        <div class="item-calc">
          <span>${item.quantity} × ${item.selling_price.toFixed(2)} ج</span>
          <strong>${(item.quantity * item.selling_price).toFixed(2)} ج</strong>
        </div>
      </div>
    `).join('')}
  </div>

  <div class="totals">
    <div class="total-row"><span>الإجمالي:</span><span>${safeInvoice.total_amount.toFixed(2)} جنيه</span></div>
    <div class="total-row"><span>المدفوع:</span><span>${safeInvoice.paid_amount.toFixed(2)} جنيه</span></div>
    <div class="total-row grand"><span>المتبقي:</span><span>${safeInvoice.remaining_amount.toFixed(2)} جنيه</span></div>
  </div>

  <div class="footer">
    <p><strong>شكراً لتعاملكم معنا</strong></p>
    <p>جملة أبو علي • ${new Date().toLocaleString('ar-EG')}</p>
  </div>
</body>
</html>`

  // ✅ الطريقة الصحيحة للطباعة - بدون popup
  const iframe = document.createElement('iframe')
  iframe.style.position = 'fixed'
  iframe.style.right = '0'
  iframe.style.bottom = '0'
  iframe.style.width = '0'
  iframe.style.height = '0'
  iframe.style.border = 'none'
  document.body.appendChild(iframe)

  const doc = iframe.contentWindow.document
  doc.open()
  doc.write(html)
  doc.close()

  iframe.onload = () => {
    setTimeout(() => {
      iframe.contentWindow.focus()
      iframe.contentWindow.print()
      setTimeout(() => {
        document.body.removeChild(iframe)
      }, 1000)
    }, 300)
  }
}
