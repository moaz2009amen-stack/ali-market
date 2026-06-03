'use client'
import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'

export default function WelcomePage() {
  const router = useRouter()
  const canvasRef = useRef(null)
  const [visible, setVisible] = useState(false)
  const [entering, setEntering] = useState(false)

  // ✅ رسم خلفية الجزيئات المتحركة
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    let animId

    const resize = () => {
      canvas.width  = window.innerWidth
      canvas.height = window.innerHeight
    }
    resize()
    window.addEventListener('resize', resize)

    // جزيئات صغيرة
    const particles = Array.from({ length: 60 }, () => ({
      x:   Math.random() * canvas.width,
      y:   Math.random() * canvas.height,
      r:   Math.random() * 2.5 + 0.5,
      dx:  (Math.random() - 0.5) * 0.4,
      dy:  (Math.random() - 0.5) * 0.4,
      o:   Math.random() * 0.5 + 0.1,
    }))

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      particles.forEach(p => {
        p.x += p.dx
        p.y += p.dy
        if (p.x < 0 || p.x > canvas.width)  p.dx *= -1
        if (p.y < 0 || p.y > canvas.height) p.dy *= -1

        ctx.beginPath()
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(255,255,255,${p.o})`
        ctx.fill()
      })

      // خطوط بين الجزيئات القريبة
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx   = particles[i].x - particles[j].x
          const dy   = particles[i].y - particles[j].y
          const dist = Math.sqrt(dx * dx + dy * dy)
          if (dist < 120) {
            ctx.beginPath()
            ctx.moveTo(particles[i].x, particles[i].y)
            ctx.lineTo(particles[j].x, particles[j].y)
            ctx.strokeStyle = `rgba(255,255,255,${0.08 * (1 - dist / 120)})`
            ctx.lineWidth = 0.8
            ctx.stroke()
          }
        }
      }
      animId = requestAnimationFrame(draw)
    }
    draw()

    setTimeout(() => setVisible(true), 100)

    return () => {
      cancelAnimationFrame(animId)
      window.removeEventListener('resize', resize)
    }
  }, [])

  const handleEnter = () => {
    setEntering(true)
    setTimeout(() => router.push('/dashboard'), 600)
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Tajawal:wght@300;400;500;700;800&display=swap');

        * { margin: 0; padding: 0; box-sizing: border-box; }

        body {
          font-family: 'Tajawal', sans-serif;
          overflow: hidden;
        }

        .page {
          min-height: 100vh;
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, #0f172a 0%, #1e3a5f 40%, #0f3460 70%, #162447 100%);
          direction: rtl;
          overflow: hidden;
        }

        canvas {
          position: absolute;
          inset: 0;
          pointer-events: none;
        }

        /* دوائر ضوئية في الخلفية */
        .glow-1 {
          position: absolute;
          width: 600px; height: 600px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(37,99,235,0.15) 0%, transparent 70%);
          top: -200px; right: -200px;
          animation: pulse-glow 4s ease-in-out infinite;
        }
        .glow-2 {
          position: absolute;
          width: 400px; height: 400px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(16,185,129,0.1) 0%, transparent 70%);
          bottom: -100px; left: -100px;
          animation: pulse-glow 5s ease-in-out infinite reverse;
        }

        @keyframes pulse-glow {
          0%, 100% { transform: scale(1); opacity: 1; }
          50%       { transform: scale(1.1); opacity: 0.7; }
        }

        .card {
          position: relative;
          z-index: 10;
          background: rgba(255,255,255,0.05);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border: 1px solid rgba(255,255,255,0.12);
          border-radius: 28px;
          padding: 3rem 2.5rem;
          max-width: 440px;
          width: 90%;
          text-align: center;
          box-shadow:
            0 25px 60px rgba(0,0,0,0.4),
            inset 0 1px 0 rgba(255,255,255,0.1);
          transition: opacity 0.8s ease, transform 0.8s ease;
          opacity: 0;
          transform: translateY(30px) scale(0.97);
        }

        .card.visible {
          opacity: 1;
          transform: translateY(0) scale(1);
        }

        .card.exiting {
          opacity: 0;
          transform: translateY(-20px) scale(1.02);
        }

        /* أيقونة المتجر */
        .icon-wrap {
          width: 90px; height: 90px;
          background: linear-gradient(135deg, #2563eb, #1d4ed8);
          border-radius: 24px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 1.5rem;
          font-size: 2.5rem;
          box-shadow:
            0 8px 30px rgba(37,99,235,0.4),
            inset 0 1px 0 rgba(255,255,255,0.2);
          animation: float 3s ease-in-out infinite;
        }

        @keyframes float {
          0%, 100% { transform: translateY(0);   }
          50%       { transform: translateY(-8px); }
        }

        /* العنوان */
        .title {
          font-size: 2.2rem;
          font-weight: 800;
          color: #fff;
          margin-bottom: .4rem;
          letter-spacing: -0.5px;
          animation: fade-up 0.8s ease 0.3s both;
        }

        .subtitle {
          font-size: 1rem;
          color: rgba(255,255,255,0.55);
          font-weight: 300;
          margin-bottom: 2.5rem;
          animation: fade-up 0.8s ease 0.5s both;
        }

        @keyframes fade-up {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }

        /* إحصائيات صغيرة */
        .stats {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: .75rem;
          margin-bottom: 2rem;
          animation: fade-up 0.8s ease 0.6s both;
        }

        .stat {
          background: rgba(255,255,255,0.07);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 14px;
          padding: .75rem .5rem;
          transition: background 0.2s;
        }
        .stat:hover {
          background: rgba(255,255,255,0.12);
        }
        .stat-icon { font-size: 1.4rem; margin-bottom: .3rem; }
        .stat-label {
          font-size: .7rem;
          color: rgba(255,255,255,0.45);
          font-weight: 400;
        }
        .stat-value {
          font-size: .95rem;
          font-weight: 700;
          color: #fff;
          margin-top: .1rem;
        }

        /* زرار الدخول */
        .enter-btn {
          width: 100%;
          padding: 1rem;
          border-radius: 14px;
          border: none;
          background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
          color: #fff;
          font-size: 1.1rem;
          font-weight: 700;
          font-family: 'Tajawal', sans-serif;
          cursor: pointer;
          position: relative;
          overflow: hidden;
          box-shadow:
            0 8px 25px rgba(37,99,235,0.45),
            inset 0 1px 0 rgba(255,255,255,0.15);
          transition: transform 0.2s, box-shadow 0.2s;
          animation: fade-up 0.8s ease 0.8s both;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: .6rem;
        }

        .enter-btn::before {
          content: '';
          position: absolute;
          inset: 0;
          background: linear-gradient(135deg, rgba(255,255,255,0.15), transparent);
          opacity: 0;
          transition: opacity 0.2s;
        }

        .enter-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 12px 35px rgba(37,99,235,0.55), inset 0 1px 0 rgba(255,255,255,0.15);
        }
        .enter-btn:hover::before { opacity: 1; }
        .enter-btn:active { transform: translateY(0); }

        /* ripple effect */
        .enter-btn .ripple {
          position: absolute;
          border-radius: 50%;
          background: rgba(255,255,255,0.3);
          animation: ripple 0.6s ease-out;
          pointer-events: none;
        }
        @keyframes ripple {
          from { transform: scale(0); opacity: 1; }
          to   { transform: scale(4); opacity: 0; }
        }

        .arrow {
          transition: transform 0.2s;
          display: inline-block;
        }
        .enter-btn:hover .arrow { transform: translateX(-4px); }

        /* تذييل */
        .footer-text {
          margin-top: 1.5rem;
          font-size: .75rem;
          color: rgba(255,255,255,0.25);
          animation: fade-up 0.8s ease 1s both;
        }

        /* شريط متحرك في الأسفل */
        .progress-bar {
          position: absolute;
          bottom: 0; left: 0; right: 0;
          height: 3px;
          background: rgba(255,255,255,0.08);
          border-radius: 0 0 28px 28px;
          overflow: hidden;
        }
        .progress-fill {
          height: 100%;
          background: linear-gradient(90deg, #2563eb, #10b981, #2563eb);
          background-size: 200%;
          animation: shimmer 2s linear infinite;
        }
        @keyframes shimmer {
          from { background-position: 200% 0; }
          to   { background-position: -200% 0; }
        }
      `}</style>

      <div className="page">
        <canvas ref={canvasRef} />
        <div className="glow-1" />
        <div className="glow-2" />

        <div className={`card ${visible ? 'visible' : ''} ${entering ? 'exiting' : ''}`}>
          <div className="icon-wrap">🛒</div>

          <h1 className="title">جملة أبو علي</h1>
          <p className="subtitle">نظام إدارة المخزن والمبيعات</p>

          <div className="stats">
            {[
              { icon: '📦', label: 'إدارة المخزون', value: 'لحظياً' },
              { icon: '🧾', label: 'فواتير سريعة', value: 'وطباعة' },
              { icon: '👥', label: 'متابعة العملاء', value: 'والديون' },
            ].map((s, i) => (
              <div className="stat" key={i}>
                <div className="stat-icon">{s.icon}</div>
                <div className="stat-label">{s.label}</div>
                <div className="stat-value">{s.value}</div>
              </div>
            ))}
          </div>

          <button
            className="enter-btn"
            onClick={(e) => {
              // ripple effect
              const btn  = e.currentTarget
              const rect = btn.getBoundingClientRect()
              const size = Math.max(rect.width, rect.height)
              const x    = e.clientX - rect.left - size / 2
              const y    = e.clientY - rect.top  - size / 2
              const el   = document.createElement('span')
              el.className = 'ripple'
              el.style.cssText = `width:${size}px;height:${size}px;left:${x}px;top:${y}px`
              btn.appendChild(el)
              setTimeout(() => el.remove(), 600)
              handleEnter()
            }}
          >
            <span>ابدأ الآن</span>
            <span className="arrow">←</span>
          </button>

          <p className="footer-text">© 2025 جملة أبو علي · جميع الحقوق محفوظة</p>

          <div className="progress-bar">
            <div className="progress-fill" />
          </div>
        </div>
      </div>
    </>
  )
}
