'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/utils/supabase/client'
import { 
  ArrowRight, Users, ChevronDown, 
  ClipboardCheck, BarChart2, FolderOpen, 
  Zap, GraduationCap, MessageCircle, Send
} from 'lucide-react'

export default function LandingPage() {
  const supabase = createClient()
  
  // State Data
  const [studentCount, setStudentCount] = useState(0)
  const [assistants, setAssistants] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  
  // State UI
  const [isAssistantsOpen, setIsAssistantsOpen] = useState(false)
  const [isScrolled, setIsScrolled] = useState(false)

  useEffect(() => {
    fetchLandingData()
    
    // Logic Scroll Navbar
    const handleScroll = () => {
        setIsScrolled(window.scrollY > 50)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const fetchLandingData = async () => {
    try {
      const { count } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('role', 'praktikan')
      
      setStudentCount(count || 0)

      const { data: asdos } = await supabase
        .from('profiles')
        .select('nama_lengkap, kode_asisten, role, jurusan, telegram') 
        .in('role', ['asisten', 'admin'])
        .order('kode_asisten', { ascending: true })
      
      setAssistants(asdos || [])
    } catch (err) {
      console.error("Gagal load data landing page")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans selection:bg-blue-500/30 overflow-x-hidden">
      
      {/* NAVBAR */}
      <nav className={`fixed top-0 w-full z-50 transition-all duration-500 border-b ${isScrolled ? 'translate-y-0 opacity-100 bg-slate-950/80 backdrop-blur-lg border-slate-800/50' : '-translate-y-24 opacity-0 border-transparent'}`}>
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
             <img 
                src="/logo-fister.png" 
                alt="Logo Lab" 
                className="w-10 h-10 object-contain drop-shadow-[0_0_15px_rgba(59,130,246,0.5)]" 
                onError={(e) => {e.currentTarget.style.display='none'}}
             />
             <div className="leading-tight hidden md:block">
                <span className="block font-bold text-white text-lg tracking-tight">Lab. Fisika Terapan</span>
                <span className="block text-[10px] text-slate-400 uppercase tracking-widest">FT UNTIRTA</span>
             </div>
          </div>
          
          <Link href="/login" className="group px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-full transition-all flex items-center gap-2 shadow-lg shadow-blue-900/20">
             Masuk 
             <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform"/>
          </Link>
        </div>
      </nav>

      {/* HERO SECTION */}
      <section className="relative pt-32 pb-20 px-6 text-center min-h-screen flex flex-col justify-center">
        {/* Background Glows */}
        <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-blue-600/20 rounded-full blur-[120px] -z-10 animate-pulse-slow"></div>
        <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-cyan-600/10 rounded-full blur-[100px] -z-10"></div>

        <div className="max-w-4xl mx-auto flex flex-col items-center animate-fade-in-up">
            {/* Logo Utama Besar */}
            <div className="mb-8 relative group">
                <div className="absolute inset-0 bg-blue-600/20 blur-3xl rounded-full group-hover:bg-blue-500/30 transition-all duration-500"></div>
                <img 
                    src="/logo-fister.png" 
                    alt="Logo Besar" 
                    className="w-32 h-32 md:w-44 md:h-44 object-contain relative z-10 drop-shadow-2xl transform group-hover:scale-105 transition-transform duration-500"
                />
            </div>

            {/* Judul & Subjudul */}
            <h1 className="text-4xl md:text-7xl font-black text-white mb-6 tracking-tight leading-tight">
                Laboratorium <br/>
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-cyan-400 to-blue-500">
                    Fisika Terapan
                </span>
            </h1>
            <p className="text-sm md:text-lg text-slate-400 font-medium uppercase tracking-[0.2em] mb-12 border-b border-slate-800 pb-8">
                Fakultas Teknik Universitas Sultan Ageng Tirtayasa
            </p>

            {/* Tombol CTA */}
            <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
                <Link href="/login" className="px-8 py-4 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-2xl transition-all shadow-[0_0_30px_rgba(37,99,235,0.3)] hover:shadow-[0_0_50px_rgba(37,99,235,0.5)] flex items-center justify-center gap-2 hover:-translate-y-1">
                    <Zap size={20} className="fill-white"/> Login Praktikan
                </Link>
                <a href="#fitur" className="px-8 py-4 bg-slate-900 border border-slate-800 text-slate-300 font-bold rounded-2xl hover:bg-slate-800 hover:text-white transition-all flex items-center justify-center gap-2 hover:-translate-y-1">
                    Explore Fitur
                </a>
            </div>
        </div>
      </section>

      {/* STATS & ASSISTANTS SECTION */}
      <section className="py-10 px-6 max-w-5xl mx-auto">
          {/* Grid Statistik */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              {/* Card Total Praktikan */}
              <div className="bg-slate-900/50 border border-slate-800 p-6 rounded-3xl flex items-center justify-between hover:border-blue-500/30 transition-colors group">
                  <div>
                      <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mb-1">Total Praktikan Aktif</p>
                      <h3 className="text-4xl font-black text-white group-hover:text-blue-400 transition-colors">{loading ? '...' : studentCount}</h3>
                  </div>
                  <div className="w-14 h-14 bg-slate-800 rounded-2xl flex items-center justify-center text-slate-400 group-hover:bg-blue-600 group-hover:text-white transition-all">
                      <Users size={28}/>
                  </div>
              </div>

              {/* Card Toggle List Asisten */}
              <button 
                onClick={() => setIsAssistantsOpen(!isAssistantsOpen)}
                className="bg-slate-900/50 border border-slate-800 p-6 rounded-3xl flex items-center justify-between hover:bg-slate-800 hover:border-blue-500/30 transition-all text-left w-full group"
              >
                  <div>
                      <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mb-1">Tim Laboratorium</p>
                      <h3 className="text-xl font-bold text-white group-hover:text-blue-400 transition-colors">
                          Lihat Daftar Asisten
                      </h3>
                  </div>
                  <div className={`w-14 h-14 bg-slate-800 rounded-2xl flex items-center justify-center text-slate-400 group-hover:text-white transition-all duration-300 ${isAssistantsOpen ? 'rotate-180 bg-blue-600 text-white' : ''}`}>
                      <ChevronDown size={28}/>
                  </div>
              </button>
          </div>

          {/* Collapsible List Asisten */}
          <div className={`overflow-hidden transition-all duration-500 ease-in-out ${isAssistantsOpen ? 'max-h-[1500px] opacity-100 mb-20' : 'max-h-0 opacity-0'}`}>
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 md:p-8">
                  <h3 className="text-white font-bold mb-6 flex items-center gap-2">
                      <GraduationCap className="text-blue-400"/> Asisten
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                      {assistants.map((ast) => (
                          <div key={ast.kode_asisten} className="relative flex items-center gap-3 p-4 rounded-2xl bg-slate-950 border border-slate-800 hover:border-blue-500/50 transition-all group">
                              {/* Avatar Kode Asisten */}
                              <div className="w-12 h-12 rounded-full bg-slate-900 flex items-center justify-center text-sm font-bold text-blue-400 border border-slate-700 shadow-inner shrink-0 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                                  {ast.kode_asisten || 'XX'}
                              </div>
                              
                              {/* Info Nama & Jurusan */}
                              <div className="min-w-0 flex-1">
                                  <p className="text-sm font-bold text-slate-200 truncate group-hover:text-white">{ast.nama_lengkap}</p>
                                  {/* Ganti Role jadi Jurusan */}
                                  <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider truncate">
                                      {ast.jurusan || '--'}
                                  </p>
                              </div>

                              {/* Telegram */}
                              {ast.telegram && (
                                  <a 
                                    href={`https://t.me/${ast.telegram}`} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="p-2 bg-slate-800 rounded-full text-slate-400 hover:bg-blue-500 hover:text-white transition-all absolute right-3"
                                    title="Hubungi via Telegram"
                                  >
                                      <Send size={14} />
                                  </a>
                              )}
                          </div>
                      ))}
                  </div>
              </div>
          </div>
      </section>

      {/* FEATURES SECTION */}
      <section id="fitur" className="py-20 px-6 bg-slate-900/30 border-y border-slate-800">
        <div className="max-w-6xl mx-auto">
            <div className="text-center mb-16">
                <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">Fitur Unggulan</h2>
                <p className="text-slate-400 max-w-2xl mx-auto">Sistem yang dirancang untuk mendukung kegiatan praktikum secara efisien dan transparan.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <FeatureCard 
                    icon={ClipboardCheck} 
                    color="blue"
                    title="Presensi Praktikum" 
                    desc="Memastikan data kehadiran tercatat rapi sesuai grup dan jadwal."
                />
                <FeatureCard 
                    icon={BarChart2} 
                    color="cyan"
                    title="Transparansi Nilai" 
                    desc="Lihat nilai modul secara real-time setelah periode transparansi dibuka."
                />
                <FeatureCard 
                    icon={FolderOpen} 
                    color="indigo"
                    title="Repositori Digital" 
                    desc="Akses modul, panduan, format laporan, dan lainnya dengan mudah."
                />
            </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="py-12 text-center border-t border-slate-900 bg-slate-950">
          <div className="flex items-center justify-center gap-3 mb-4 opacity-50 grayscale hover:grayscale-0 transition-all duration-500">
              <img src="/logo-fister.png" className="w-8 h-8 object-contain" alt="Logo Footer"/>
              <span className="font-bold text-white">Lab Fister</span>
          </div>
          <p className="text-slate-500 text-sm">
              &copy; {new Date().getFullYear()} Laboratorium Fisika Terapan. <br className="md:hidden"/> Fakultas Teknik UNTIRTA.
          </p>
      </footer>
    </div>
  )
}

// Komponen Kecil Card Fitur
function FeatureCard({ icon: Icon, title, desc, color }: any) {
    const colorClasses = {
        blue: "bg-blue-500/10 text-blue-400 border-blue-500/20",
        cyan: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20",
        indigo: "bg-indigo-500/10 text-indigo-400 border-indigo-500/20",
    }[color as string]

    return (
        <div className="bg-slate-950 p-8 rounded-3xl border border-slate-800 hover:border-slate-600 transition-all group hover:-translate-y-1 duration-300 shadow-lg">
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-6 border ${colorClasses}`}>
                <Icon size={28} />
            </div>
            <h3 className="text-lg font-bold text-white mb-3 group-hover:text-blue-400 transition-colors">{title}</h3>
            <p className="text-slate-400 text-sm leading-relaxed">
                {desc}
            </p>
        </div>
    )
}