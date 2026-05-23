# Ali Market - نظام إدارة المخزن والمبيعات

نظام إدارة متكامل لمخازن الجملة والتوزيع، مصمم خصيصاً للسوق المصري.

## 🚀 المميزات

- ✅ إدارة المنتجات والمخزون
- ✅ إدارة العملاء
- ✅ إنشاء وطباعة الفواتير
- ✅ تسجيل التحصيلات
- ✅ تقارير المبيعات والأرباح
- ✅ نظام صلاحيات (مالك / موظف)
- ✅ يعمل بدون إنترنت (Offline Mode)
- ✅ تطبيق ويب تقدمي (PWA)
- ✅ تصميم متجاوب للموبايل

## 🛠️ التقنيات المستخدمة

- **Frontend:** Next.js 14, React, Tailwind CSS
- **Backend:** Supabase (PostgreSQL)
- **Deployment:** Vercel
- **Offline:** IndexedDB + Dexie.js

## 📋 متطلبات التشغيل

- Node.js 18+
- حساب Supabase
- حساب Vercel (للنشر)

## 🔧 التثبيت والتشغيل

1. استنساخ المشروع:
```bash
git clone https://github.com/YOUR_USERNAME/ali-market.git
cd ali-market
```

2. تثبيت المكتبات:
```bash
npm install
```

3. إعداد ملف البيئة:
```bash
# أنشئ ملف .env.local وأضف:
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

4. إعداد قاعدة البيانات:
- افتح Supabase SQL Editor
- شغّل السكريبت من `database/schema.sql`

5. تشغيل المشروع:
```bash
npm run dev
```

6. افتح المتصفح على: `http://localhost:3000`

## 🔐 حساب تجريبي

- البريد: `owner@alimarket.com`
- كلمة المرور: `123456`

## 📦 النشر على Vercel

1. ادفع الكود على GitHub
2. اربط المشروع بـ Vercel
3. أضف متغيرات البيئة في Vercel
4. انشر!

## 📱 تثبيت كـ PWA

على الموبايل:
1. افتح الموقع في المتصفح
2. اضغط "إضافة إلى الشاشة الرئيسية"
3. استخدمه كتطبيق!

## 📄 الترخيص

هذا المشروع ملك خاص.

## 👨‍💻 المطور

معاذ - مطور Full Stack

---

© 2024 Ali Market. جميع الحقوق محفوظة.
