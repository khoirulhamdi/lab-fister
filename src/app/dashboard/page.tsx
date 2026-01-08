'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'

// --- KONFIGURASI ---
const MODUL_LIST = ['Sosialisasi', 'PA', 'MY', 'PJK', 'TP', 'HKM', 'RL', 'CL', 'VF', 'VT']
const SHIFT_LIST = ['1', '2', '3', '4']
const KATEGORI_FILE = ['Modul', 'Jadwal', 'Panduan', 'Kelompok', 'Lainnya']
const LOGO_URL = "/fister-logo.jpg" 

// Helper Linkify
const linkify = (text: string) => {
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  return text.split(urlRegex).map((part, i) => {
    if (part.match(urlRegex)) return <a key={i} href={part} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline break-all">{part}</a>;
    return part;
  });
};

const getTodayDate = () => new Date().toISOString().split('T')[0];

const getGradeChar = (score: number) => {
    if (score >= 85) return 'A';
    if (score >= 80) return 'A-';
    if (score >= 75) return 'B+';
    if (score >= 70) return 'B';
    if (score >= 65) return 'B-';
    if (score >= 60) return 'C+';
    if (score >= 50) return 'C';
    if (score >= 40) return 'D';
    return 'E';
}

export default function Dashboard() {
  const supabase = createClient()
  const router = useRouter()
  
  // --- STATE SYSTEM ---
  const [activeTab, setActiveTab] = useState('home') 
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  
  // --- TOAST NOTIFICATION STATE ---
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' }) // type: 'success' | 'error'

  // --- DATA ---
  const [profile, setProfile] = useState<any>(null)
  const [sessions, setSessions] = useState<any[]>([]) 
  const [assistants, setAssistants] = useState<any[]>([]) 
  const [assistantLogs, setAssistantLogs] = useState<any[]>([])
  const [announcements, setAnnouncements] = useState<any[]>([])
  const [resources, setResources] = useState<any[]>([])
  
  // --- FILTER ---
  const [filter, setFilter] = useState({ nama: '', modul: '', tanggal: '', shift: '' })

  // --- LOADING & PROCESS ---
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [posting, setPosting] = useState(false)
  const [uploading, setUploading] = useState(false)

  // Forms
  const [absenPraktikanForm, setAbsenPraktikanForm] = useState({ modul: MODUL_LIST[1], assistant_id: '', tanggal: getTodayDate(), shift: '1' })
  const [absenAsistenForm, setAbsenAsistenForm] = useState({ modul: MODUL_LIST[1], tanggal: getTodayDate(), shift: '1' })
  
  const [editingId, setEditingId] = useState<string | null>(null)
  const [gradeForm, setGradeForm] = useState({ tp: 0, tl: 0, pd: 0, la: 0 })
  const [fileForm, setFileForm] = useState({ judul: '', kategori: KATEGORI_FILE[0], file: null as File | null })

  useEffect(() => {
    fetchData()
  }, [])

  // --- HELPER: SHOW NOTIFICATION ---
  const showNotification = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ show: true, message, type })
    // Hilang otomatis setelah 3 detik
    setTimeout(() => {
        setToast((prev) => ({ ...prev, show: false }))
    }, 3000)
  }

  const fetchData = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return router.push('/')

    const { data: profileData } = await supabase.from('profiles').select('*').eq('id', user.id).single()
    if (!profileData) return router.push('/')
    setProfile(profileData)

    const { data: ann } = await supabase.from('announcements').select('*').order('created_at', { ascending: false })
    setAnnouncements(ann || [])

    const { data: asistenList } = await supabase.from('profiles').select('id, nama_lengkap, kode_asisten').eq('role', 'asisten')
    setAssistants(asistenList || [])

    let query = supabase.from('practicum_sessions').select(`*, student:student_id(nama_lengkap, nim), assistant:assistant_id(nama_lengkap, kode_asisten)`).order('created_at', { ascending: false })
    if (profileData.role === 'praktikan') query = query.eq('student_id', user.id) 
    else query = query.eq('assistant_id', user.id) 
    const { data: sess } = await query
    setSessions(sess || [])

    const { data: logs } = await supabase.from('assistant_attendance').select('*, profiles:assistant_id(nama_lengkap, kode_asisten)').order('created_at', { ascending: false })
    setAssistantLogs(logs || [])

    const { data: res } = await supabase.from('resources').select('*, uploader:uploaded_by(nama_lengkap)').order('created_at', { ascending: false })
    setResources(res || [])
    
    setLoading(false)
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/')
  }

  const calculateFinalScore = () => {
    const praktikumModules = sessions.filter(s => s.modul !== 'Sosialisasi' && s.status === 'graded');
    const totalNilaiModul = praktikumModules.reduce((acc, curr) => acc + (curr.nilai_akhir || 0), 0);
    const pembagi = 7; 
    let average = totalNilaiModul > 0 ? totalNilaiModul / pembagi : 0;
    const sosialisasi = sessions.find(s => s.modul === 'Sosialisasi' && s.status === 'graded');
    const bonusSosialisasi = sosialisasi ? 10 : 0;
    let finalScore = average + bonusSosialisasi;
    if (finalScore > 100) finalScore = 100;

    return {
        average: average.toFixed(2),
        bonus: bonusSosialisasi,
        final: finalScore.toFixed(2),
        finalGrade: getGradeChar(finalScore),
        moduleCount: praktikumModules.length
    };
  }

  const getFilteredSessions = () => {
    if (profile.role === 'praktikan') return sessions; 
    return sessions.filter(s => {
        const matchName = s.student?.nama_lengkap.toLowerCase().includes(filter.nama.toLowerCase());
        const matchModul = filter.modul ? s.modul === filter.modul : true;
        const matchDate = filter.tanggal ? s.tanggal === filter.tanggal : true;
        const matchShift = filter.shift ? s.shift === filter.shift : true;
        return matchName && matchModul && matchDate && matchShift;
    })
  }

  const handleAbsenPraktikan = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    const { error } = await supabase.from('practicum_sessions').insert({
      student_id: profile.id, assistant_id: absenPraktikanForm.assistant_id, 
      modul: absenPraktikanForm.modul, tanggal: absenPraktikanForm.tanggal, shift: absenPraktikanForm.shift
    })
    
    if (error) {
        if(error.code === '23505') showNotification('Anda sudah mengambil absen untuk modul ini!', 'error');
        else showNotification(error.message, 'error');
    } else { 
        showNotification('Absensi Berhasil!'); 
        fetchData(); 
        setActiveTab('nilai'); 
    } 
    setSubmitting(false)
  }

  const handleAbsenAsisten = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    const { error } = await supabase.from('assistant_attendance').insert({
      assistant_id: profile.id, modul: absenAsistenForm.modul, tanggal: absenAsistenForm.tanggal, shift: absenAsistenForm.shift
    })
    
    if (error) {
        if(error.code === '23505') showNotification('Anda sudah absen di shift & tanggal ini!', 'error');
        else showNotification(error.message, 'error');
    } else { 
        showNotification('Absensi Asisten Tersimpan!');
        const { data: logs } = await supabase.from('assistant_attendance').select('*, profiles:assistant_id(nama_lengkap, kode_asisten)').order('created_at', { ascending: false })
        setAssistantLogs(logs || [])
    } 
    setSubmitting(false)
  }

  const startGrading = (session: any) => {
    setEditingId(session.id)
    if(session.modul === 'Sosialisasi') {
        setGradeForm({ tp: 25, tl: 25, pd: 25, la: 25 }) 
    } else {
        setGradeForm({ tp: session.nilai_tp || 0, tl: session.nilai_tl || 0, pd: session.nilai_pd || 0, la: session.nilai_la || 0 })
    }
  }

  const saveGrade = async (id: string) => {
    setSubmitting(true)
    const totalScore = gradeForm.tp + gradeForm.tl + gradeForm.pd + gradeForm.la
    let gradeChar = getGradeChar(totalScore)
    
    const { error } = await supabase.from('practicum_sessions').update({
      nilai_tp: gradeForm.tp, nilai_tl: gradeForm.tl, nilai_pd: gradeForm.pd, nilai_la: gradeForm.la, grade: gradeChar, status: 'graded'
    }).eq('id', id)

    if (error) showNotification(error.message, 'error')
    else { 
        showNotification('Nilai Berhasil Disimpan!');
        setEditingId(null); 
        fetchData(); 
    }
    setSubmitting(false)
  }

  const handlePostAnnouncement = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setPosting(true)
    const form = e.currentTarget
    const judul = (form.elements.namedItem('judul') as HTMLInputElement).value
    const isi = (form.elements.namedItem('isi') as HTMLTextAreaElement).value
    const { error } = await supabase.from('announcements').insert({ judul, isi })
    if (!error) { 
        form.reset(); 
        fetchData(); 
        showNotification('Pengumuman diposting!');
    } else {
        showNotification(error.message, 'error');
    }
    setPosting(false)
  }

  const handleDeleteAnnouncement = async (id: string) => {
    if(!confirm('Hapus pengumuman ini?')) return
    const { error } = await supabase.from('announcements').delete().eq('id', id)
    if(error) showNotification(error.message, 'error')
    else {
        setAnnouncements(prev => prev.filter(a => a.id !== id))
        showNotification('Pengumuman dihapus.')
    }
  }

  const handleUploadFile = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!fileForm.file) return showNotification('Pilih file dulu!', 'error')
    setUploading(true)
    try {
      const fileExt = fileForm.file.name.split('.').pop()
      const fileName = `${Date.now()}.${fileExt}`
      const { error: uploadError } = await supabase.storage.from('lab-files').upload(fileName, fileForm.file)
      if (uploadError) throw new Error(uploadError.message)
      const { data: { publicUrl } } = supabase.storage.from('lab-files').getPublicUrl(fileName)
      const { error: dbError } = await supabase.from('resources').insert({
        judul: fileForm.judul, kategori: fileForm.kategori, file_url: publicUrl, uploaded_by: profile.id
      })
      if (dbError) throw new Error(dbError.message)
      
      showNotification('File berhasil diupload!');
      setFileForm({ judul: '', kategori: KATEGORI_FILE[0], file: null })
      fetchData() 
    } catch (err: any) { showNotification(err.message, 'error') } 
    finally { setUploading(false) }
  }

  const handleDeleteFile = async (id: string, fileUrl: string) => {
    if(!confirm('Hapus file ini permanen?')) return
    try {
        const { error } = await supabase.from('resources').delete().eq('id', id)
        if(error) throw new Error(error.message)
        const fileName = fileUrl.split('/').pop()
        if(fileName) await supabase.storage.from('lab-files').remove([fileName])
        
        setResources((prev) => prev.filter((item) => item.id !== id))
        showNotification('File berhasil dihapus.')
    } catch (error: any) { showNotification(error.message, 'error') }
  }

  // --- ICONS ---
  const Icons = {
    Home: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>,
    Absen: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" /></svg>,
    Nilai: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>,
    File: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" /></svg>,
    Logout: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>,
    Download: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>,
    Trash: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
  }

  const NavItem = ({ label, id, icon }: { label: string, id: string, icon: any }) => (
    <button onClick={() => { setActiveTab(id); setIsMobileMenuOpen(false) }}
      className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-bold transition-all w-full md:w-auto ${activeTab === id ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30' : 'text-slate-500 hover:bg-slate-800 hover:text-white'}`}>
      {icon}<span>{label}</span>
    </button>
  )

  // --- CUSTOM LOADING SCREEN (LOGO + SPINNER) ---
  if (loading) return (
    <div className="fixed inset-0 bg-slate-900 flex justify-center items-center z-[9999]">
       <div className="relative w-20 h-20 flex justify-center items-center">
          {/* Spinner Ring */}
          <div className="absolute w-full h-full border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin"></div>
          {/* Logo Center */}
          <img src={LOGO_URL} alt="Loading..." className="w-10 h-10 rounded-full object-cover" />
       </div>
    </div>
  )

  const filteredSessions = getFilteredSessions();
  const scoreData = profile.role === 'praktikan' ? calculateFinalScore() : null;

  return (
    <div className="min-h-screen bg-slate-900 text-slate-200 font-sans flex flex-col relative">
      
      {/* --- TOAST NOTIFICATION COMPONENT --- */}
      {toast.show && (
        <div className={`fixed top-6 left-1/2 -translate-x-1/2 px-6 py-3 rounded-lg shadow-2xl z-[100] flex items-center gap-3 animate-fade-in-down border ${toast.type === 'error' ? 'bg-red-900/90 border-red-500 text-white' : 'bg-emerald-900/90 border-emerald-500 text-white'}`}>
            <span className="text-xl">{toast.type === 'error' ? '🚫' : '✅'}</span>
            <span className="font-medium text-sm">{toast.message}</span>
        </div>
      )}

      <nav className="bg-slate-800 border-b border-slate-700 sticky top-0 z-50 shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <img src={LOGO_URL} alt="Logo" className="w-10 h-10 rounded-full border border-blue-500 shadow-sm object-cover" />
              <div>
                <h1 className="font-bold text-lg text-white leading-none">Lab Fister</h1>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs font-semibold text-slate-400">{profile.nama_lengkap}</span>
                  <span className={`text-[9px] px-1.5 py-0.5 rounded border uppercase font-bold ${profile.role === 'asisten' ? 'bg-blue-500/20 text-blue-400 border-blue-500/50' : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'}`}>{profile.role}</span>
                </div>
              </div>
            </div>
            <div className="hidden md:flex items-center gap-1">
              <NavItem id="home" label="Home" icon={Icons.Home} />
              <NavItem id="absen" label="Absensi" icon={Icons.Absen} />
              <NavItem id="nilai" label="Nilai" icon={Icons.Nilai} />
              <NavItem id="files" label="File" icon={Icons.File} />
              <div className="h-6 w-px bg-slate-700 mx-3"></div>
              <button onClick={handleLogout} className="text-red-500 hover:text-red-400 text-sm font-medium px-3 flex items-center gap-1">{Icons.Logout} Logout</button>
            </div>
            <div className="md:hidden">
              <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="text-slate-300 p-2">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
              </button>
            </div>
          </div>
        </div>
        {isMobileMenuOpen && (
          <div className="md:hidden bg-slate-800 border-t border-slate-700 p-2 space-y-1 shadow-xl">
            <NavItem id="home" label="Dashboard" icon={Icons.Home} />
            <NavItem id="absen" label="Form Absensi" icon={Icons.Absen} />
            <NavItem id="nilai" label="Transparansi Nilai" icon={Icons.Nilai} />
            <NavItem id="files" label="File Praktikan" icon={Icons.File} />
            <button onClick={handleLogout} className="w-full text-left px-4 py-3 text-red-400 font-bold flex items-center gap-2">{Icons.Logout} Logout</button>
          </div>
        )}
      </nav>

      <main className="flex-1 p-4 md:p-8 max-w-5xl mx-auto w-full">
        {/* TAB 1: HOME */}
        {activeTab === 'home' && (
            <div className="animate-fade-in space-y-6">
              <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 shadow-sm">
                <div className="flex justify-between items-center mb-6 pb-4 border-b border-slate-700">
                    <h2 className="font-bold text-xl text-blue-400 flex items-center gap-2">📢 Pengumuman</h2>
                    {profile.role === 'asisten' && <span className="text-xs text-slate-400 bg-slate-900 px-2 py-1 rounded">Mode Asisten</span>}
                </div>
                <div className="space-y-4">
                  {announcements.length === 0 ? <p className="text-center text-slate-500 italic py-10">Belum ada informasi terbaru.</p> : 
                    announcements.map((info) => (
                    <div key={info.id} className="bg-slate-700/50 p-4 rounded-lg border-l-4 border-blue-500 shadow-sm relative group">
                      <h3 className="font-bold text-white text-lg">{info.judul}</h3>
                      <p className="text-sm text-slate-300 mt-2 whitespace-pre-wrap leading-relaxed">{linkify(info.isi)}</p>
                      <div className="flex justify-between items-center mt-3">
                         <p className="text-xs text-slate-500">{new Date(info.created_at).toLocaleDateString('id-ID')}</p>
                         {profile.role === 'asisten' && (
                             <button onClick={() => handleDeleteAnnouncement(info.id)} className="text-red-400 text-xs hover:underline opacity-50 group-hover:opacity-100 transition-opacity">Hapus</button>
                         )}
                      </div>
                    </div>
                  ))}
                </div>
                {profile.role === 'asisten' && (
                  <div className="mt-8 pt-6 border-t border-slate-700">
                    <h3 className="text-sm font-bold text-slate-300 mb-3">Buat Pengumuman Baru</h3>
                    <form onSubmit={handlePostAnnouncement} className="space-y-3">
                      <input name="judul" required placeholder="Judul Pengumuman" className="w-full bg-slate-900 border border-slate-600 rounded-md p-2.5 text-sm text-white focus:ring-2 focus:ring-blue-500 outline-none"/>
                      <textarea name="isi" required placeholder="Isi Pengumuman..." rows={3} className="w-full bg-slate-900 border border-slate-600 rounded-md p-2.5 text-sm text-white resize-none focus:ring-2 focus:ring-blue-500 outline-none"></textarea>
                      <button disabled={posting} className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm font-bold shadow-lg shadow-blue-500/20 transition-all">{posting ? 'Memposting...' : 'Publikasikan'}</button>
                    </form>
                  </div>
                )}
              </div>

              {/* GRID WIDGET */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                 {profile.role === 'praktikan' ? (
                     <>
                        <div className="bg-slate-800 p-4 rounded-xl border border-slate-700 flex flex-col justify-center items-center text-center hover:border-blue-500 transition-colors cursor-pointer" onClick={()=>setActiveTab('nilai')}>
                             <span className="text-3xl mb-1">🎓</span>
                             <p className="text-xs text-slate-400 uppercase font-bold">Modul Selesai</p>
                             <p className="text-2xl font-bold text-white">{scoreData?.moduleCount || 0} / 7</p>
                        </div>
                        <div className="bg-slate-800 p-4 rounded-xl border border-slate-700 flex flex-col justify-center items-center text-center hover:border-blue-500 transition-colors cursor-pointer" onClick={()=>setActiveTab('nilai')}>
                             <span className="text-3xl mb-1">⭐</span>
                             <p className="text-xs text-slate-400 uppercase font-bold">Nilai</p>
                             <p className="text-2xl font-bold text-yellow-400">{scoreData?.final || 0}</p>
                        </div>
                     </>
                 ) : (
                     <>
                        <div className="bg-slate-800 p-4 rounded-xl border border-slate-700 flex flex-col justify-center items-center text-center hover:border-blue-500 transition-colors cursor-pointer" onClick={()=>setActiveTab('nilai')}>
                             <span className="text-3xl mb-1">📊</span>
                             <p className="text-xs text-slate-400 uppercase font-bold">Praktikan Dinilai</p>
                             <p className="text-2xl font-bold text-white">{sessions.length}</p>
                        </div>
                        <div className="bg-slate-800 p-4 rounded-xl border border-slate-700 flex flex-col justify-center items-center text-center hover:border-blue-500 transition-colors cursor-pointer" onClick={()=>setActiveTab('absen')}>
                             <span className="text-3xl mb-1">🕒</span>
                             <p className="text-xs text-slate-400 uppercase font-bold">Total Shift</p>
                             <p className="text-2xl font-bold text-white">{assistantLogs.length}</p>
                        </div>
                     </>
                 )}
                 <div onClick={()=>setActiveTab('absen')} className="bg-blue-600/10 border border-blue-600/30 p-4 rounded-xl flex flex-col justify-center items-center text-center hover:bg-blue-600 hover:text-white transition-all cursor-pointer group">
                      <div className="text-blue-400 group-hover:text-white mb-1">{Icons.Absen}</div>
                      <p className="text-sm font-bold">Isi Absensi</p>
                 </div>
                 <div onClick={()=>setActiveTab('files')} className="bg-emerald-600/10 border border-emerald-600/30 p-4 rounded-xl flex flex-col justify-center items-center text-center hover:bg-emerald-600 hover:text-white transition-all cursor-pointer group">
                      <div className="text-emerald-400 group-hover:text-white mb-1">{Icons.File}</div>
                      <p className="text-sm font-bold">Modul & File</p>
                 </div>
              </div>
            </div>
        )}

        {/* TAB 2: ABSENSI */}
        {activeTab === 'absen' && (
            <div className="animate-fade-in max-w-2xl mx-auto">
              {profile.role === 'praktikan' ? (
                <div className="bg-slate-800 p-8 rounded-xl border border-slate-700 shadow-lg">
                  <div className="text-center mb-8">
                    <div className="inline-block p-3 rounded-full bg-blue-900/30 text-blue-400 mb-4">{Icons.Absen}</div>
                    <h2 className="font-bold text-2xl text-white">Form Absensi Praktikan</h2>
                    <p className="text-slate-400 text-sm mt-1">Isi data sesuai jadwal praktikum.</p>
                  </div>
                  <form onSubmit={handleAbsenPraktikan} className="space-y-5">
                    <div>
                      <label className="block text-xs font-semibold text-slate-400 mb-1 uppercase tracking-wider">Modul / Kegiatan</label>
                      <select className="w-full bg-slate-900 border border-slate-600 rounded-lg p-3 text-sm text-white focus:ring-2 focus:ring-blue-500 outline-none" onChange={e => setAbsenPraktikanForm({...absenPraktikanForm, modul: e.target.value})} value={absenPraktikanForm.modul}>
                        {MODUL_LIST.map(m => <option key={m} value={m}>{m}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-400 mb-1 uppercase tracking-wider">Shift</label>
                      <select className="w-full bg-slate-900 border border-slate-600 rounded-lg p-3 text-sm text-white focus:ring-2 focus:ring-blue-500 outline-none" onChange={e => setAbsenPraktikanForm({...absenPraktikanForm, shift: e.target.value})}>
                        {SHIFT_LIST.map(s => <option key={s} value={s}>Shift {s}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-400 mb-1 uppercase tracking-wider">Asisten Pembimbing</label>
                      <select required className="w-full bg-slate-900 border border-slate-600 rounded-lg p-3 text-sm text-white focus:ring-2 focus:ring-blue-500 outline-none" onChange={e => setAbsenPraktikanForm({...absenPraktikanForm, assistant_id: e.target.value})}>
                        <option value="">-- Pilih Asisten --</option>
                        {assistants.map(a => <option key={a.id} value={a.id}>{a.kode_asisten ? `[${a.kode_asisten}] ` : ''} {a.nama_lengkap}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-400 mb-1 uppercase tracking-wider">Tanggal</label>
                      <input required type="date" value={absenPraktikanForm.tanggal} className="w-full bg-slate-900 border border-slate-600 rounded-lg p-3 text-sm text-white focus:ring-2 focus:ring-blue-500 outline-none" onChange={e => setAbsenPraktikanForm({...absenPraktikanForm, tanggal: e.target.value})} />
                    </div>
                    <button disabled={submitting} className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg font-bold shadow-lg shadow-blue-500/30 transition-all transform hover:scale-[1.02]">{submitting ? 'Mengirim Data...' : 'Kirim Kehadiran'}</button>
                  </form>
                </div>
              ) : (
                <div className="space-y-8">
                    <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 shadow-sm">
                       <h2 className="font-bold text-lg text-white mb-4 border-b border-slate-700 pb-2 flex items-center gap-2">📝 Absensi Asisten</h2>
                       <form onSubmit={handleAbsenAsisten} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                           <div>
                              <label className="text-[10px] uppercase font-bold text-slate-500">Modul</label>
                              <select className="w-full bg-slate-900 border border-slate-600 rounded p-2 text-sm text-white mt-1" onChange={e => setAbsenAsistenForm({...absenAsistenForm, modul: e.target.value})} value={absenAsistenForm.modul}>
                                {MODUL_LIST.map(m => <option key={m} value={m}>{m}</option>)}
                              </select>
                           </div>
                           <div>
                              <label className="text-[10px] uppercase font-bold text-slate-500">Shift</label>
                              <select className="w-full bg-slate-900 border border-slate-600 rounded p-2 text-sm text-white mt-1" onChange={e => setAbsenAsistenForm({...absenAsistenForm, shift: e.target.value})}>
                                {SHIFT_LIST.map(s => <option key={s} value={s}>Shift {s}</option>)}
                              </select>
                           </div>
                           <div className="md:col-span-2">
                              <label className="text-[10px] uppercase font-bold text-slate-500">Tanggal</label>
                              <input required type="date" value={absenAsistenForm.tanggal} className="w-full bg-slate-900 border border-slate-600 rounded p-2 text-sm text-white mt-1" onChange={e => setAbsenAsistenForm({...absenAsistenForm, tanggal: e.target.value})} />
                           </div>
                           <div className="md:col-span-2">
                              <button disabled={submitting} className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded font-bold text-sm">{submitting ? 'Menyimpan...' : 'Simpan Absensi Saya'}</button>
                           </div>
                       </form>
                    </div>

                    <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 shadow-sm">
                        <h2 className="font-bold text-lg text-white mb-4 flex items-center justify-between">
                            <span>📋 Rekap Absensi Asisten</span>
                            <span className="text-xs bg-slate-900 px-2 py-1 rounded text-slate-400">{assistantLogs.length} Record</span>
                        </h2>
                        <div className="overflow-x-auto rounded border border-slate-700 max-h-[400px]">
                            <table className="w-full text-sm text-left text-slate-300">
                                <thead className="text-xs text-slate-400 uppercase bg-slate-900 sticky top-0">
                                    <tr><th className="px-4 py-2">Tanggal</th><th className="px-4 py-2">Asisten</th><th className="px-4 py-2 text-center">Shift</th><th className="px-4 py-2 text-center">Modul</th></tr>
                                </thead>
                                <tbody className="divide-y divide-slate-700 bg-slate-800">
                                    {assistantLogs.map((log) => (
                                        <tr key={log.id} className="hover:bg-slate-700/50">
                                            <td className="px-4 py-2 text-xs font-mono">{log.tanggal}</td>
                                            <td className="px-4 py-2"><div className="font-bold text-white text-xs">{log.profiles?.nama_lengkap}</div><div className="text-[10px] text-blue-400">[{log.profiles?.kode_asisten || '-'}]</div></td>
                                            <td className="px-4 py-2 text-center"><span className="bg-slate-900 px-2 py-0.5 rounded text-xs">{log.shift}</span></td>
                                            <td className="px-4 py-2 text-center font-bold text-white">{log.modul}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
              )}
            </div>
        )}

        {/* TAB 3: NILAI */}
        {activeTab === 'nilai' && (
            <div className="animate-fade-in bg-slate-800 p-6 rounded-xl border border-slate-700 shadow-sm min-h-[500px]">
              
              {profile.role === 'praktikan' && scoreData && (
                <div className="mb-6 grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="bg-slate-700 p-4 rounded-lg border border-slate-600">
                        <p className="text-xs text-slate-400 uppercase">Modul Selesai</p>
                        <p className="text-2xl font-bold text-white">{scoreData.moduleCount} / 7</p>
                    </div>
                    <div className="bg-slate-700 p-4 rounded-lg border border-slate-600">
                        <p className="text-xs text-slate-400 uppercase">Rata-rata Modul</p>
                        <p className="text-2xl font-bold text-yellow-400">{scoreData.average}</p>
                    </div>
                    <div className="bg-slate-700 p-4 rounded-lg border border-slate-600">
                        <p className="text-xs text-slate-400 uppercase">Sosialisasi</p>
                        <p className={`text-2xl font-bold ${scoreData.bonus > 0 ? 'text-green-400' : 'text-slate-500'}`}>{scoreData.bonus > 0 ? '+10' : '0 (Pending)'}</p>
                    </div>
                    <div className="bg-slate-700 p-4 rounded-lg border-2 border-blue-500 bg-blue-900/20">
                        <p className="text-xs text-blue-300 uppercase font-bold ">Nilai Akhir</p>
                        <div className="flex items-end gap-2">
                             <span className="text-3xl font-bold text-blue-400">{scoreData.final}</span>
                             <span className="text-2xl font-bold px-3 py-1 bg-blue-900/30 text-blue-400 rounded-full">{scoreData.finalGrade}</span>
                        </div>
                    </div>
                </div>
              )}

              {profile.role === 'asisten' && (
                  <div className="mb-6 bg-slate-900 p-4 rounded-lg border border-slate-700 grid grid-cols-1 md:grid-cols-4 gap-3">
                      <input placeholder="Cari Nama..." className="bg-slate-800 border border-slate-600 rounded px-3 py-2 text-sm text-white" value={filter.nama} onChange={e => setFilter({...filter, nama: e.target.value})} />
                      <select className="bg-slate-800 border border-slate-600 rounded px-3 py-2 text-sm text-white" value={filter.modul} onChange={e => setFilter({...filter, modul: e.target.value})}>
                          <option value="">Semua Modul</option>
                          {MODUL_LIST.map(m => <option key={m} value={m}>{m}</option>)}
                      </select>
                      <select className="bg-slate-800 border border-slate-600 rounded px-3 py-2 text-sm text-white" value={filter.shift} onChange={e => setFilter({...filter, shift: e.target.value})}>
                          <option value="">Semua Shift</option>
                          {SHIFT_LIST.map(s => <option key={s} value={s}>Shift {s}</option>)}
                      </select>
                      <input type="date" className="bg-slate-800 border border-slate-600 rounded px-3 py-2 text-sm text-white" value={filter.tanggal} onChange={e => setFilter({...filter, tanggal: e.target.value})} />
                  </div>
              )}

              <div className="flex justify-between items-end mb-6">
                 <div>
                    <h2 className="font-bold text-xl text-white flex items-center gap-2">{Icons.Nilai} {profile.role === 'praktikan' ? 'Rincian Nilai' : 'Input Nilai Praktikan'}</h2>
                    <p className="text-sm text-slate-400 mt-1">{profile.role === 'praktikan' ? 'Detail perolehan nilai per modul.' : 'Kelola data nilai mahasiswa bimbingan Anda.'}</p>
                 </div>
                 <div className="text-xs font-bold px-3 py-1 bg-blue-900/30 text-blue-400 rounded-full">{filteredSessions.length} Data</div>
              </div>
              
              <div className="overflow-x-auto rounded-lg border border-slate-700">
                <table className="w-full text-sm text-left text-slate-300">
                  <thead className="text-xs uppercase bg-slate-900 text-slate-400">
                    <tr>
                      <th className="px-4 py-3">Modul</th>
                      <th className="px-4 py-3">{profile.role === 'praktikan' ? 'Kode Asisten' : 'Mahasiswa'}</th>
                      <th className="px-4 py-3 text-center">Komponen Nilai</th>
                      <th className="px-4 py-3 text-center">Total</th>
                      {profile.role === 'asisten' && <th className="px-4 py-3 text-center">Aksi</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-700 bg-slate-800">
                    {filteredSessions.length === 0 ? (
                      <tr><td colSpan={5} className="text-center py-10 italic text-slate-500">Data tidak ditemukan.</td></tr>
                    ) : filteredSessions.map((sess) => (
                      <tr key={sess.id} className="hover:bg-slate-700/50 transition-colors">
                        <td className="px-4 py-3">
                            <div className="font-bold text-white">{sess.modul}</div>
                            <div className="text-xs text-slate-500">{sess.tanggal} <span className="bg-slate-700 px-1 rounded ml-1 text-[10px] text-blue-300">Shift {sess.shift || '-'}</span></div>
                        </td>
                        <td className="px-4 py-3">
                          {profile.role === 'asisten' ? (
                              <div><div className="font-medium text-white">{sess.student?.nama_lengkap}</div><div className="text-xs text-blue-500 font-mono">{sess.student?.nim}</div></div>
                          ) : <div className="font-bold text-blue-400">[{sess.assistant?.kode_asisten || '??'}]</div>}
                        </td>
                        {editingId === sess.id ? (
                           <td colSpan={3} className="px-4 py-2 bg-slate-900 border-l-2 border-blue-500">
                             {sess.modul === 'Sosialisasi' ? (
                                 <div className="text-center py-4">
                                     <p className="text-xs text-green-400 mb-2">Konfirmasi Kehadiran Sosialisasi?</p>
                                     <div className="flex justify-center gap-2">
                                        <button onClick={()=>setEditingId(null)} className="text-xs text-slate-500 mr-2">Batal</button>
                                        <button onClick={()=>saveGrade(sess.id)} className="bg-green-600 text-white px-4 py-1 rounded text-xs font-bold">Oke</button>
                                     </div>
                                 </div>
                             ) : (
                                <>
                                 <div className="grid grid-cols-4 gap-2 mb-3">
                                    {['tp','tl','pd','la'].map(k => (
                                        <div key={k}><label className="text-[9px] uppercase font-bold text-slate-500 mb-1 block">{k}</label><input type="number" value={(gradeForm as any)[k]} onChange={e=>setGradeForm({...gradeForm, [k]: +e.target.value})} className="w-full bg-slate-800 border border-slate-600 rounded p-1 text-center text-xs focus:border-blue-500 outline-none text-white"/></div>
                                    ))}
                                 </div>
                                 <div className="flex justify-end gap-3 border-t border-slate-700 pt-2"><button onClick={()=>setEditingId(null)} className="text-xs font-medium text-slate-500 hover:text-white">Batal</button><button onClick={()=>saveGrade(sess.id)} className="bg-blue-600 text-white text-xs px-3 py-1 rounded font-bold hover:bg-blue-700 shadow-md">Simpan</button></div>
                                </>
                             )}
                           </td>
                        ) : (
                          <>
                            <td className="px-4 py-3 text-center">
                                {sess.modul === 'Sosialisasi' ? <span className="text-xs text-slate-500 italic">Hanya status kehadiran</span> : (
                                    <div className="inline-flex gap-1">{['tp','tl','pd','la'].map(k => (<div key={k} className="bg-slate-900 border border-slate-600 px-1.5 py-0.5 rounded text-[10px] min-w-[30px]"><span className="text-slate-500 uppercase mr-1">{k}</span><span className="font-bold text-slate-200">{(sess as any)[`nilai_${k}`]}</span></div>))}</div>
                                )}
                            </td>
                            <td className="px-4 py-3 text-center">{sess.status === 'graded' ? <div className={`text-lg font-bold ${sess.grade==='A'?'text-emerald-400':'text-blue-400'}`}>{sess.nilai_akhir}</div> : <span className="text-xs text-slate-500 italic">Pending</span>}</td>
                            {profile.role === 'asisten' && <td className="px-4 py-3 text-center"><button onClick={() => startGrading(sess)} className={`px-3 py-1 rounded text-xs font-medium transition-all ${sess.status==='pending' ? 'bg-yellow-900/30 text-yellow-500 border border-yellow-700/50 hover:bg-yellow-900/50' : 'bg-slate-700 text-slate-300 border border-slate-600 hover:bg-slate-600'}`}>{sess.status==='pending' ? (sess.modul === 'Sosialisasi' ? '⚡ Acc' : '⚡ Input') : '✏️ Edit'}</button></td>}
                          </>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
        )}

        {/* TAB 4: FILES */}
        {activeTab === 'files' && (
             <div className="animate-fade-in grid grid-cols-1 lg:grid-cols-3 gap-6">
                {profile.role === 'asisten' && (
                    <section className="lg:col-span-1">
                        <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 shadow-sm sticky top-24">
                        <h2 className="font-bold text-blue-400 mb-4 pb-2 border-b border-slate-700 flex items-center gap-2">{Icons.File} Upload Dokumen</h2>
                        <form onSubmit={handleUploadFile} className="space-y-4">
                            <div><label className="text-xs font-bold text-slate-400 uppercase">Judul File</label><input required type="text" placeholder="Contoh: Modul 1" className="w-full bg-slate-900 border border-slate-600 rounded-lg p-2.5 text-sm text-white mt-1 focus:ring-2 focus:ring-blue-500 outline-none" value={fileForm.judul} onChange={e => setFileForm({...fileForm, judul: e.target.value})} /></div>
                            <div><label className="text-xs font-bold text-slate-400 uppercase">Kategori</label><select className="w-full bg-slate-900 border border-slate-600 rounded-lg p-2.5 text-sm text-white mt-1 focus:ring-2 focus:ring-blue-500 outline-none" value={fileForm.kategori} onChange={e => setFileForm({...fileForm, kategori: e.target.value})}>{KATEGORI_FILE.map(k => <option key={k} value={k}>{k}</option>)}</select></div>
                            <div>
                                <label className="text-xs font-bold text-slate-400 uppercase">Pilih File</label>
                                <input required type="file" accept=".pdf,.doc,.docx,.jpg,.jpeg,.png" className="w-full bg-slate-900 border border-slate-600 rounded-lg p-2 text-xs text-slate-400 mt-1 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-blue-900/30 file:text-blue-400 hover:file:bg-blue-900/50" onChange={e => setFileForm({...fileForm, file: e.target.files ? e.target.files[0] : null})} />
                            </div>
                            <button disabled={uploading} className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-lg text-sm font-bold shadow-md transition-all">{uploading ? 'Mengupload...' : 'Upload File'}</button>
                        </form>
                        </div>
                    </section>
                )}
                <section className={profile.role === 'asisten' ? "lg:col-span-2" : "lg:col-span-3"}>
                    <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 shadow-sm min-h-[500px]">
                        <h2 className="font-bold text-xl text-white mb-6 flex items-center gap-2">📂 File Praktikan</h2>
                        {resources.length === 0 ? (
                            <div className="text-center py-12 text-slate-500 border-2 border-dashed border-slate-700 rounded-lg">Belum ada file yang diupload.</div>
                        ) : (
                            <div className="grid grid-cols-1 gap-3">
                                {resources.map((res) => (
                                <div key={res.id} className="flex flex-col md:flex-row items-start md:items-center justify-between bg-slate-700/30 border border-slate-700 p-4 rounded-lg hover:border-blue-500 transition-all group">
                                    <div className="flex items-start gap-4 mb-3 md:mb-0">
                                        <div className="bg-blue-900/30 text-blue-400 p-3 rounded-lg group-hover:scale-110 transition-transform">{Icons.File}</div>
                                        <div>
                                            <h3 className="font-bold text-white text-base">{res.judul}</h3>
                                            <div className="flex items-center gap-2 mt-1"><span className="text-xs bg-slate-600 px-2 py-0.5 rounded text-slate-300 font-medium">{res.kategori}</span><span className="text-xs text-slate-400">• By {res.uploader?.nama_lengkap}</span></div>
                                        </div>
                                    </div>
                                    <div className="flex gap-2 w-full md:w-auto">
                                        <a href={res.file_url} target="_blank" rel="noopener noreferrer" className="flex-1 md:flex-none text-center bg-slate-800 hover:bg-blue-600 hover:text-white border border-slate-600 text-slate-300 px-4 py-2 rounded-md text-sm font-medium transition-all flex items-center justify-center gap-2 shadow-sm"><span>Download</span>{Icons.Download}</a>
                                        {profile.role === 'asisten' && (
                                            <button onClick={() => handleDeleteFile(res.id, res.file_url)} className="bg-slate-800 hover:bg-red-900/30 text-red-400 border border-slate-600 px-3 py-2 rounded-md transition-colors shadow-sm" title="Hapus File">{Icons.Trash}</button>
                                        )}
                                    </div>
                                </div>
                                ))}
                            </div>
                        )}
                    </div>
                </section>
             </div>
        )}
      </main>
    </div>
  )
}