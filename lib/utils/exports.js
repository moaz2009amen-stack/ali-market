import * as XLSX from 'xlsx'

// تصدير Excel
export function exportToExcel(data, fileName, sheetName = 'Sheet1') {
  const worksheet = XLSX.utils.json_to_sheet(data)
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName)
  XLSX.writeFile(workbook, `${fileName}.xlsx`)
}

// ✅ تصدير تقرير PDF شامل (كانت مفقودة وبتسبب crash في reports/page.js)
export function exportReportPDF(reportData) {
  const printWindow = window.open('', '', 'width=800,height=600')

  const topProducts = (reportData.topProducts || []).map((p, i) => `
    <tr>
      <td>#${i + 1}</td>
      <td>${p.product_name}</td>
      <td>${p.quantity}</td>
      <td>${parseFloat(p.total || 0).toFixed(2)} جنيه</td>
    </tr>
  `).join('')

  const topCustomers = (reportData.topCustomers || []).map((c, i) => `
    <tr>
      <td>#${i + 1}</td>
      <td>${c.customer_name}</td>
      <td>${parseFloat(c.total_amount || 0).toFixed(2)} جنيه</td>
    </tr>
  `).join('')

  printWindow.document.write(`
    <!DOCTYPE html>
    <html dir="rtl" lang="ar">
    <head>
      <meta charset="UTF-8">
      <title>تقرير شامل - جملة أبو علي</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: Arial, sans-serif; padding: 20px; direction: rtl; color: #111; }
        h1 { font-size: 22px; text-align: center; margin-bottom: 4px; }
        .sub { text-align: center; color: #555; font-size: 12px; margin-bottom: 20px; }
        .stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 24px; }
        .stat { border: 1px solid #ddd; border-radius: 8px; padding: 12px; text-align: center; }
        .stat-label { font-size: 11px; color: #666; margin-bottom: 4px; }
        .stat-value { font-size: 16px; font-weight: bold; }
        h2 { font-size: 15px; margin-bottom: 10px; border-bottom: 2px solid #2563eb; padding-bottom: 6px; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 24px; font-size: 13px; }
        th { background: #f1f5f9; text-align: right; padding: 8px 12px; font-weight: bold; }
        td { padding: 7px 12px; border-bottom: 1px solid #eee; }
        .footer { text-align: center; font-size: 11px; color: #888; margin-top: 20px; border-top: 1px solid #ddd; padding-top: 12px; }
        @media print { body { padding: 10px; } }
      </style>
    </head>
    <body>
      <h1>جملة أبو علي</h1>
      <p class="sub">تقرير شامل - ${new Date().toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' })}</p>

      <div class="stats">
        <div class="stat">
          <div class="stat-label">إجمالي المبيعات</div>
          <div class="stat-value">${parseFloat(reportData.totalSales || 0).toFixed(2)} ج</div>
        </div>
        <div class="stat">
          <div class="stat-label">إجمالي الأرباح</div>
          <div class="stat-value">${parseFloat(reportData.totalProfit || 0).toFixed(2)} ج</div>
        </div>
        <div class="stat">
          <div class="stat-label">عدد العملاء</div>
          <div class="stat-value">${reportData.totalCustomers || 0}</div>
        </div>
        <div class="stat">
          <div class="stat-label">عدد المنتجات</div>
          <div class="stat-value">${reportData.totalProducts || 0}</div>
        </div>
      </div>

      <h2>أكثر المنتجات مبيعاً</h2>
      <table>
        <thead><tr><th>#</th><th>المنتج</th><th>الكمية</th><th>الإجمالي</th></tr></thead>
        <tbody>${topProducts || '<tr><td colspan="4" style="text-align:center">لا توجد بيانات</td></tr>'}</tbody>
      </table>

      <h2>أكثر العملاء شراءً</h2>
      <table>
        <thead><tr><th>#</th><th>العميل</th><th>إجمالي المشتريات</th></tr></thead>
        <tbody>${topCustomers || '<tr><td colspan="3" style="text-align:center">لا توجد بيانات</td></tr>'}</tbody>
      </table>

      <div class="footer">
        تم إنشاء التقرير بواسطة نظام جملة أبو علي • ${new Date().toLocaleString('ar-EG')}
      </div>
    </body>
    </html>
  `)

  printWindow.document.close()
  printWindow.focus()
  setTimeout(() => {
    printWindow.print()
    printWindow.close()
  }, 400)
}

// طباعة فاتورة حرارية - مصلحة بالكامل
export function printThermalInvoice(invoice) {
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
    @page { size: 80mm auto; margin: 0; }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: Arial, sans-serif; font-size: 12px; direction: rtl; width: 80mm; padding: 8px; color: #000; background: #fff; }
    .header { text-align: center; border-bottom: 2px dashed #000; padding-bottom: 8px; margin-bottom: 8px; }
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

  const iframe = document.createElement('iframe')
  iframe.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:none'
  document.body.appendChild(iframe)
  const doc = iframe.contentWindow.document
  doc.open()
  doc.write(html)
  doc.close()
  iframe.onload = () => {
    setTimeout(() => {
      iframe.contentWindow.focus()
      iframe.contentWindow.print()
      setTimeout(() => document.body.removeChild(iframe), 1000)
    }, 300)
  }
}
