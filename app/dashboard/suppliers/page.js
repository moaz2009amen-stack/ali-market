// في formData
const [formData, setFormData] = useState({
  name: '',
  company_name: '',
  phone: '',
  email: '',
  address: '',
  products_supplied: '',
  payment_terms: '',
  username: '',  // جديد
  supplier_password: '',  // جديد
  can_login: false  // جديد
})

// في الـ Form
<Input
  label="اسم المستخدم (للدخول)"
  name="username"
  value={formData.username}
  onChange={handleChange}
  placeholder="اسم مستخدم فريد"
/>

<Input
  label="كلمة المرور"
  type="password"
  name="supplier_password"
  value={formData.supplier_password}
  onChange={handleChange}
  placeholder="كلمة مرور قوية"
/>

<div className="flex items-center gap-2">
  <input
    type="checkbox"
    id="can_login"
    checked={formData.can_login}
    onChange={(e) => setFormData(prev => ({ ...prev, can_login: e.target.checked }))}
    className="w-4 h-4 text-primary-600 rounded"
  />
  <label htmlFor="can_login" className="text-sm text-gray-700">
    السماح للمورد بتسجيل الدخول
  </label>
</div>
