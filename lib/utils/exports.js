import * as XLSX from 'xlsx'
import jsPDF from 'jspdf'
import 'jspdf-autotable'

// تصدير Excel
export function exportToExcel(data, fileName, sheetName = 'Sheet1') {
  const worksheet = XLSX.utils.json_to_sheet(data)
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName)
  XLSX.writeFile(workbook, `${fileName}.xlsx`)
}

// تصدير فاتورة PDF
export function exportInvoicePDF(invoice) {
  const doc = new jsPDF()
  
  // إعدادات الخط العربي
  doc.addFont('https://cdn.jsdelivr.net/npm/@fontsource/cairo@4.5.0/files/cairo-arabic-400-normal.woff', 'Cairo', 'normal')
  doc.setFont('Cairo')
  doc.setR2L(true)
  
  // العنوان
  doc.setFontSize(20)
  doc.text('Ayman Market', 105, 20, { align: 'center' })
  
  doc.setFontSize(16)
  doc.text('فاتورة بيع', 105, 30, { align: 'center' })
  
  // معلومات الفاتورة
  doc.setFontSize(12)
  doc.text(`رقم الفاتورة: ${invoice.invoice_number}`, 20, 45)
  doc.text(`التاريخ: ${new Date(invoice.created_at).toLocaleDateString('ar-EG')}`, 20, 55)
  doc.text(`العميل: ${invoice.customer_name}`, 20, 65)
  
  // جدول المنتجات
  const tableData = invoice.items.map(item => [
    item.product_name,
    item.quantity,
    item.price.toFixed(2),
    (item.quantity * item.price).toFixed(2)
  ])
  
  doc.autoTable({
    startY: 75,
    head: [['المنتج', 'الكمية', 'السعر', 'الإجمالي']],
    body: tableData,
    styles: {
      font: 'Cairo',
      fontSize: 10,
      halign: 'right'
    },
    headStyles: {
      fillColor: [59, 130, 246],
      textColor: 255
    }
  })
  
  // الإجماليات
  const finalY = doc.lastAutoTable.finalY + 10
  doc.setFontSize(14)
  doc.text(`الإجمالي: ${invoice.total_amount.toFixed(2)} جنيه`, 20, finalY)
  doc.text(`المدفوع: ${invoice.paid_amount.toFixed(2)} جنيه`, 20, finalY + 10)
  doc.text(`المتبقي: ${invoice.remaining_amount.toFixed(2)} جنيه`, 20, finalY + 20)
  
  // حفظ الملف
  doc.save(`invoice-${invoice.invoice_number}.pdf`)
}

// تصدير تقرير PDF
export function exportReportPDF(title, data, columns) {
  const doc = new jsPDF()
  
  doc.addFont('https://cdn.jsdelivr.net/npm/@fontsource/cairo@4.5.0/files/cairo-arabic-400-normal.woff', 'Cairo', 'normal')
  doc.setFont('Cairo')
  doc.setR2L(true)
  
  // العنوان
  doc.setFontSize(18)
  doc.text(title, 105, 20, { align: 'center' })
  
  doc.setFontSize(10)
  doc.text(`تاريخ التقرير: ${new Date().toLocaleDateString('ar-EG')}`, 105, 30, { align: 'center' })
  
  // الجدول
  doc.autoTable({
    startY: 40,
    head: [columns],
    body: data,
    styles: {
      font: 'Cairo',
      fontSize: 9,
      halign: 'right'
    },
    headStyles: {
      fillColor: [59, 130, 246],
      textColor: 255
    }
  })
  
  doc.save(`${title}.pdf`)
}

// طباعة فاتورة حرارية (HTML)
export function printThermalInvoice(invoice) {
  const printWindow = window.open('', '', 'width=300,height=600')
  
  printWindow.document.write(`
    <!DOCTYPE html>
    <html dir="rtl">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        body {
          font-family: 'Cairo', 'Arial', sans-serif;
          width: 80mm;
          margin: 0;
          padding: 10px;
          font-size: 12px;
          direction: rtl;
        }
        .header {
          text-align: center;
          border-bottom: 2px dashed #000;
          padding-bottom: 10px;
          margin-bottom: 10px;
        }
        .header h1 {
          margin: 0;
          font-size: 22px;
          font-weight: bold;
        }
        .header p {
          margin: 5px 0;
          font-size: 11px;
        }
        .info {
          margin-bottom: 10px;
          border-bottom: 1px dashed #000;
          padding-bottom: 10px;
        }
        .info-row {
          display: flex;
          justify-content: space-between;
          margin: 5px 0;
        }
        .items {
          border-bottom: 1px dashed #000;
          padding-bottom: 10px;
          margin-bottom: 10px;
        }
        .item {
          margin: 8px 0;
        }
        .item-header {
          font-weight: bold;
          margin-bottom: 3px;
        }
        .item-details {
          display: flex;
          justify-content: space-between;
          font-size: 11px;
        }
        .totals {
          border-bottom: 2px dashed #000;
          padding-bottom: 10px;
          margin-bottom: 10px;
        }
        .total-row {
          display: flex;
          justify-content: space-between;
          margin: 5px 0;
          font-weight: bold;
        }
        .total-row.grand {
          font-size: 14px;
          margin-top: 8px;
          padding-top: 8px;
          border-top: 1px solid #000;
        }
        .footer {
          text-align: center;
          font-size: 10px;
          margin-top: 10px;
        }
        @media print {
          body { 
            margin: 0;
            padding: 5px;
          }
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>جملة أبو علي</h1>
        <p>نظام إدارة المخزن والمبيعات</p>
        <p style="font-size: 10px;">صاحب المحل: أيمن</p>
      </div>
      
      <div class="info">
        <div class="info-row">
          <span>رقم الفاتورة:</span>
          <span><strong>${invoice.invoice_number}</strong></span>
        </div>
        <div class="info-row">
          <span>التاريخ:</span>
          <span>${new Date(invoice.created_at).toLocaleDateString('ar-EG')}</span>
        </div>
        <div class="info-row">
          <span>العميل:</span>
          <span><strong>${invoice.customer_name}</strong></span>
        </div>
      </div>
      
      <div class="items">
        ${invoice.items.map(item => `
          <div class="item">
            <div class="item-header">${item.product_name}</div>
            <div class="item-details">
              <span>${item.quantity} × ${item.selling_price.toFixed(2)} جنيه</span>
              <span><strong>${(item.quantity * item.selling_price).toFixed(2)} جنيه</strong></span>
            </div>
          </div>
        `).join('')}
      </div>
      
      <div class="totals">
        <div class="total-row">
          <span>الإجمالي:</span>
          <span>${invoice.total_amount.toFixed(2)} جنيه</span>
        </div>
        <div class="total-row">
          <span>المدفوع:</span>
          <span>${invoice.paid_amount.toFixed(2)} جنيه</span>
        </div>
        <div class="total-row grand">
          <span>المتبقي:</span>
          <span>${invoice.remaining_amount.toFixed(2)} جنيه</span>
        </div>
      </div>
      
      <div class="footer">
        <p><strong>شكراً لتعاملكم معنا</strong></p>
        <p>جملة أبو علي</p>
        <p>${new Date().toLocaleString('ar-EG')}</p>
      </div>
    </body>
    </html>
  `)
  
  printWindow.document.close()
  printWindow.focus()
  
  // الانتظار قليلاً قبل الطباعة لضمان تحميل الـ CSS
  setTimeout(() => {
    printWindow.print()
    printWindow.close()
  }, 250)
}
