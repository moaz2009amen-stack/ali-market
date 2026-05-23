'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Table from '@/components/ui/Table'
import Modal from '@/components/ui/Modal'
import Input from '@/components/ui/Input'
import Badge from '@/components/ui/Badge'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import { Plus, Edit2, Trash2, Truck, Phone } from 'lucide-react'
import { formatPhone } from '@/lib/utils/format'
import toast from 'react-hot-toast'

export default function SuppliersPage() {
  const supabase = createClient()
  const [suppliers, setSuppliers] = useState([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editMode, setEditMode] = useState(false)
  const [currentSupplier, setCurrentSupplier] = useState(null)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [supplierToDelete, setSupplierToDelete] = useState(null)
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    username: '',
    supplier_password: '',
    can_login: false
  })
  const [errors, setErrors] = useState({})

  useEffect(() => {
    fetchSuppliers()
  }, [])

  async function fetchSuppliers() {
    try {
      const { data, error } = await supabase
        .from('suppliers')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      setSuppliers(data || [])
    } catch (error) {
      console.error('Error fetching suppliers:', error)
      toast.error('حدث خطأ في تحميل الموردين')
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    const newValue = type === 'checkbox' ? checked : value
    setFormData(prev => ({ ...prev, [name]: newValue }))
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }))
    }
  }

  const validate = () => {
    const newErrors = {}
    
    if (!formData.name.trim()) newErrors.name = 'اسم المورد مطلوب'
    if (!formData.phone.trim()) newErrors.phone = 'رقم الهاتف مطلوب'
    else if (!/^01[0-9]{9}$/.test(formData.phone.replace(/\s/g, ''))) {
      newErrors.phone = 'رقم الهاتف غير صحيح'
    }
    
    if (formData.can_login) {
      if (!formData.username.trim()) newErrors.username = 'اسم المستخدم مطلوب'
      if (!formData.supplier_password && !editMode) {
        newErrors.supplier_password = 'كلمة المرور مطلوبة'
      }
      if (formData.supplier_password && formData.supplier_password.length < 6) {
        newErrors.supplier_password = 'كلمة المرور يجب أن تكون 6 أحرف على الأقل'
      }
    }
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!validate()) return

    try {
      if (editMode && currentSupplier) {
        // تعديل مورد موجود
        const updateData = {
          name: formData.name,
          phone: formData.phone,
          username: formData.can_login ? formData.username : null,
          can_login: formData.can_login
        }

        const { error } = await supabase
          .from('suppliers')
          .update(updateData)
          .eq('id', currentSupplier.id)

        if (error) throw error

        // إذا تم تفعيل تسجيل الدخول وكان هناك باسورد جديد
        if (formData.can_login && formData.supplier_password && formData.username) {
          // التحقق من وجود مستخدم مرتبط بالمورد
          const { data: existingUser } = await supabase
            .from('users')
            .select('id')
            .eq('supplier_id', currentSupplier.id)
            .single()

          if (existingUser) {
            // تحديث اسم المستخدم فقط
            await supabase
              .from('users')
              .update({ username: formData.username })
              .eq('id', existingUser.id)
          } else {
            // إنشاء حساب جديد
            await createSupplierAccount(currentSupplier.id, formData.username, formData.supplier_password)
          }
        }

        toast.success('تم تحديث المورد بنجاح')
      } else {
        // إضافة مورد جديد
        const { data: { user } } = await supabase.auth.getUser()
        
        const { data: newSupplier, error: supplierError } = await supabase
          .from('suppliers')
          .insert([{
            name: formData.name,
            phone: formData.phone,
            username: formData.can_login ? formData.username : null,
            can_login: formData.can_login,
            created_by: user.id
          }])
          .select()
          .single()

        if (supplierError) throw supplierError

        // إذا تم السماح بتسجيل الدخول
        if (formData.can_login && formData.username && formData.supplier_password) {
          await createSupplierAccount(newSupplier.id, formData.username, formData.supplier_password)
        }

        toast.success('تم إضافة المورد بنجاح')
      }

      fetchSuppliers()
      closeModal()
    } catch (error) {
      console.error('Error saving supplier:', error)
      if (error.message?.includes('duplicate') || error.message?.includes('unique')) {
        toast.error('اسم المستخدم موجود مسبقاً')
      } else {
        toast.error('حدث خطأ في حفظ المورد')
      }
    }
  }

  async function createSupplierAccount(supplierId, username, password) {
    try {
      // إنشاء email فريد
      const email = `${username}@aymanmarket.supplier`
      
      // التحقق من عدم وجود username مكرر
      const { data: existingUser } = await supabase
        .from('users')
        .select('id')
        .eq('username', username)
        .single()

      if (existingUser) {
        throw new Error('اسم المستخدم موجود مسبقاً')
      }

      // إنشاء المستخدم في Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: email,
        password: password,
        options: {
          data: {
            type: 'supplier',
            username: username
          },
          emailRedirectTo: undefined
        }
      })

      if (authError) throw authError

      // إضافة المستخدم في جدول users
      const { error: userError } = await supabase
        .from('users')
        .insert([{
          id: authData.user.id,
          email: email,
          username: username,
          full_name: username,
          role: 'supplier',
          supplier_id: supplierId
        }])

      if (userError) throw userError

      return true
    } catch (error) {
      console.error('Error creating supplier account:', error)
      throw error
    }
  }

  const handleEdit = (supplier) => {
    setCurrentSupplier(supplier)
    setFormData({
      name: supplier.name,
      phone: supplier.phone,
      username: supplier.username || '',
      supplier_password: '',
      can_login: supplier.can_login || false
    })
    setEditMode(true)
    setModalOpen(true)
  }

  const handleDelete = (supplier) => {
    setSupplierToDelete(supplier)
    setDeleteConfirmOpen(true)
  }

  const confirmDelete = async () => {
    if (!supplierToDelete) return

    try {
      // حذف حساب المستخدم المرتبط إن وجد
      const { data: linkedUser } = await supabase
        .from('users')
        .select('id')
        .eq('supplier_id', supplierToDelete.id)
        .single()

      if (linkedUser) {
        await supabase
          .from('users')
          .delete()
          .eq('id', linkedUser.id)
      }

      // حذف المورد
      const { error } = await supabase
        .from('suppliers')
        .delete()
        .eq('id', supplierToDelete.id)

      if (error) throw error
      
      toast.success('تم حذف المورد بنجاح')
      setDeleteConfirmOpen(false)
      setSupplierToDelete(null)
      fetchSuppliers()
    } catch (error) {
      console.error('Error deleting supplier:', error)
      toast.error('حدث خطأ في حذف المورد')
    }
  }

  const openModal = () => {
    setEditMode(false)
    setCurrentSupplier(null)
    setFormData({
      name: '',
      phone: '',
      username: '',
      supplier_password: '',
      can_login: false
    })
    setErrors({})
    setModalOpen(true)
  }

  const closeModal = () => {
    setModalOpen(false)
    setEditMode(false)
    setCurrentSupplier(null)
    setErrors({})
  }

  const columns = [
    { 
      header: 'المورد', 
      accessor: 'name',
      render: (row) => (
        <div>
          <p className="font-semibold text-gray-900">{row.name}</p>
          {row.username && <p className="text-xs text-primary-600">@{row.username}</p>}
        </div>
      )
    },
    { 
      header: 'رقم الهاتف', 
      accessor: 'phone',
      render: (row) => (
        <div className="flex items-center gap-2">
          <Phone size={16} className="text-gray-400" />
          <span className="font-mono">{formatPhone(row.phone)}</span>
        </div>
      )
    },
    { 
      header: 'الحالة', 
      accessor: 'can_login',
      render: (row) => (
        <Badge variant={row.can_login ? 'success' : 'default'}>
          {row.can_login ? 'يمكنه الدخول' : 'لا يمكنه الدخول'}
        </Badge>
      )
    },
    { 
      header: 'الإجراءات', 
      accessor: 'actions',
      render: (row) => (
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleEdit(row)}
            className="p-2 text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
          >
            <Edit2 size={18} />
          </button>
          <button
            onClick={() => handleDelete(row)}
            className="p-2 text-danger-600 hover:bg-danger-50 rounded-lg transition-colors"
          >
            <Trash2 size={18} />
          </button>
        </div>
      )
    },
  ]

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card padding={false} className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">إجمالي الموردين</p>
              <p className="text-2xl font-bold text-gray-900">{suppliers.length}</p>
            </div>
            <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center">
              <Truck className="text-primary-600" size={24} />
            </div>
          </div>
        </Card>

        <Card padding={false} className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">موردين نشطين</p>
              <p className="text-2xl font-bold text-success-600">
                {suppliers.filter(s => s.can_login).length}
              </p>
            </div>
            <div className="w-12 h-12 bg-success-100 rounded-lg flex items-center justify-center">
              <Truck className="text-success-600" size={24} />
            </div>
          </div>
        </Card>
      </div>

      <Card 
        title="الموردين"
        action={
          <Button onClick={openModal} size="md">
            <Plus size={20} />
            إضافة مورد
          </Button>
        }
      >
        <Table
          columns={columns}
          data={suppliers}
          loading={loading}
          emptyMessage="لا يوجد موردين. ابدأ بإضافة مورد جديد!"
        />
      </Card>

      <Modal
        isOpen={modalOpen}
        onClose={closeModal}
        title={editMode ? 'تعديل مورد' : 'إضافة مورد جديد'}
        size="md"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="اسم المورد"
            name="name"
            value={formData.name}
            onChange={handleChange}
            placeholder="اسم المورد"
            required
            error={errors.name}
          />

          <Input
            label="رقم الهاتف"
            type="tel"
            name="phone"
            value={formData.phone}
            onChange={handleChange}
            placeholder="01001234567"
            required
            error={errors.phone}
          />

          <div className="border-t border-gray-200 pt-4">
            <div className="flex items-center gap-2 mb-4">
              <input
                type="checkbox"
                id="can_login"
                name="can_login"
                checked={formData.can_login}
                onChange={handleChange}
                className="w-4 h-4 text-primary-600 rounded border-gray-300 focus:ring-primary-500"
              />
              <label htmlFor="can_login" className="text-sm font-medium text-gray-700">
                السماح للمورد بتسجيل الدخول
              </label>
            </div>

            {formData.can_login && (
              <div className="space-y-4">
                <Input
                  label="اسم المستخدم"
                  name="username"
                  value={formData.username}
                  onChange={handleChange}
                  placeholder="اسم مستخدم فريد"
                  required={formData.can_login}
                  error={errors.username}
                />

                <Input
                  label={editMode ? 'كلمة مرور جديدة (اختياري)' : 'كلمة المرور'}
                  type="password"
                  name="supplier_password"
                  value={formData.supplier_password}
                  onChange={handleChange}
                  placeholder={editMode ? 'اتركها فارغة للإبقاء على القديمة' : 'كلمة مرور (6 أحرف على الأقل)'}
                  required={formData.can_login && !editMode}
                  error={errors.supplier_password}
                />
              </div>
            )}
          </div>

          <div className="flex gap-3 pt-4">
            <Button type="submit" variant="primary" fullWidth>
              {editMode ? 'تحديث المورد' : 'إضافة المورد'}
            </Button>
            <Button type="button" variant="secondary" fullWidth onClick={closeModal}>
              إلغاء
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={deleteConfirmOpen}
        onClose={() => {
          setDeleteConfirmOpen(false)
          setSupplierToDelete(null)
        }}
        onConfirm={confirmDelete}
        title="حذف المورد"
        message={`هل أنت متأكد من حذف المورد "${supplierToDelete?.name}"؟ سيتم حذف حساب تسجيل الدخول أيضاً إن وُجد.`}
        confirmText="حذف المورد"
      />
    </div>
  )
}
