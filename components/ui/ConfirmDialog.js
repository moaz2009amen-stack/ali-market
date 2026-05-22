'use client'
import Button from './Button'
import { AlertTriangle } from 'lucide-react'

export default function ConfirmDialog({ 
  isOpen, 
  onClose, 
  onConfirm, 
  title = 'تأكيد الحذف',
  message = 'هل أنت متأكد؟ لا يمكن التراجع عن هذا الإجراء.',
  confirmText = 'حذف',
  cancelText = 'إلغاء',
  variant = 'danger'
}) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg max-w-md w-full p-6 shadow-xl">
        <div className="flex items-start gap-4 mb-6">
          <div className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 ${
            variant === 'danger' ? 'bg-danger-100' : 'bg-warning-100'
          }`}>
            <AlertTriangle className={variant === 'danger' ? 'text-danger-600' : 'text-warning-600'} size={24} />
          </div>
          
          <div className="flex-1">
            <h3 className="text-lg font-bold text-gray-900 mb-2">{title}</h3>
            <p className="text-gray-600">{message}</p>
          </div>
        </div>

        <div className="flex gap-3">
          <Button
            onClick={onConfirm}
            variant={variant}
            fullWidth
          >
            {confirmText}
          </Button>
          
          <Button
            onClick={onClose}
            variant="secondary"
            fullWidth
          >
            {cancelText}
          </Button>
        </div>
      </div>
    </div>
  )
}
