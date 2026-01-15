'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'
import { 
  Home, 
  ClipboardList, 
  BarChart2, 
  FolderOpen, 
  User, 
  LogOut, 
  UploadCloud, 
  FileText, 
  Trash2, 
  CheckCircle2,
  AlertCircle,
  ChevronRight,
  Plus,
  KeyRound,
  ArrowLeft,
  Megaphone,
  Award,       // Ikon Baru
  Calculator,  // Ikon Baru
  BookOpen,    // Ikon Baru
  Zap,         // Ikon Baru
  LayoutDashboard // Ikon Baru
} from 'lucide-react'

// --- KONFIGURASI ---
const MODUL_LIST = ['Sosialisasi', 'PA', 'MY', 'PJK', 'TP', 'HKM', 'RL', 'CL', 'VF', 'VT']
const SHIFT_LIST = ['1', '2', '3', '4']
const KATEGORI_FILE = ['Modul', 'Jadwal', 'Panduan', 'Kelompok', 'Lainnya']

// Helper: Linkify
const linkify = (text: string) => {
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  return text.split(urlRegex).map((part, i) => {
    if (part.match(urlRegex)) return <a key={i} href={part} target="_blank" rel="noopener noreferrer" className="text-blue-400 font-medium hover:underline break-all">{part}</a>;
    return part;
  });
};

// Helper: Nama Panggilan Pintar
const getNickname = (fullName: string) => {
    if (!fullName) return '';
    const parts = fullName.trim().split(' ');
    const firstWord = parts[0].toLowerCase();
    const prefixes = ['muhammad', 'muhamad', 'mochamad', 'siti', 'mhmd']; 

    if (parts.length > 1 && prefixes.includes(firstWord)) {
        return parts[1].charAt(0).toUpperCase() + parts[1].slice(1).toLowerCase();
    }
    return parts[0].charAt(0).toUpperCase() + parts[0].slice(1).toLowerCase();
}

// Helper: Grade
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
   
  // --- STATE ---
  const [activeTab, setActiveTab] = useState('home') 
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' }) 

  // Data
  const [profile, setProfile] = useState<any>(null)
  const [sessions, setSessions] = useState<any[]>([]) 
  const [assistants, setAssistants] = useState<any[]>([]) 
  const [assistantLogs, setAssistantLogs] = useState<any[]>([])
  const [announcements, setAnnouncements] = useState<any[]>([])
  const [resources, setResources] = useState<any[]>([])
   
  // Forms & UI
  const [filter, setFilter] = useState({ nama: '', modul: '', tanggal: '', shift: '' })
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [uploading, setUploading] = useState(false)
   
  // Input States
  const [absenPraktikanForm, setAbsenPraktikanForm] = useState({ modul: MODUL_LIST[1], assistant_id: '', tanggal: new Date().toISOString().split('T')[0], shift: '1' })
  const [absenAsistenForm, setAbsenAsistenForm] = useState({ modul: MODUL_LIST[1], tanggal: new Date().toISOString().split('T')[0], shift: '1' })
  const [editingId, setEditingId] = useState<string | null>(null)
  const [gradeForm, setGradeForm] = useState({ tp: 0, tl: 0, pd: 0, la: 0 })
  const [fileForm, setFileForm] = useState({ judul: '', kategori: KATEGORI_FILE[0], file: null as File | null })
  const [passForm, setPassForm] = useState({ new: '', confirm: '' })

  useEffect(() => {
    fetchData()
  }, [])

  const showNotification = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ show: true, message, type })
    setTimeout(() => setToast((prev) => ({ ...prev, show: false })), 3000)
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

  // --- LOGIC FUNCTIONS ---
  const handleLogout = async () => { await supabase.auth.signOut(); router.push('/') }
   
  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault()
    if(passForm.new !== passForm.confirm) return showNotification("Password tidak sama!", 'error')
    if(passForm.new.length < 6) return showNotification("Minimal 6 karakter!", 'error')
    setSubmitting(true)
    const { error } = await supabase.auth.updateUser({ password: passForm.new })
    if(error) showNotification(error.message, 'error')
    else { showNotification("Password berhasil diubah!"); setPassForm({ new: '', confirm: '' }); setActiveTab('profile') }
    setSubmitting(false)
  }

  const handleAbsenPraktikan = async (e: React.FormEvent) => {
    e.preventDefault(); setSubmitting(true);
    const { error } = await supabase.from('practicum_sessions').insert({ student_id: profile.id, assistant_id: absenPraktikanForm.assistant_id, modul: absenPraktikanForm.modul, tanggal: absenPraktikanForm.tanggal, shift: absenPraktikanForm.shift })
    if (error) error.code === '23505' ? showNotification('Sudah absen!', 'error') : showNotification(error.message, 'error');
    else { showNotification('Absensi Berhasil!'); fetchData(); setActiveTab('nilai'); } 
    setSubmitting(false)
  }

  const handleAbsenAsisten = async (e: React.FormEvent) => {
    e.preventDefault(); setSubmitting(true);
    const { error } = await supabase.from('assistant_attendance').insert({ assistant_id: profile.id, modul: absenAsistenForm.modul, tanggal: absenAsistenForm.tanggal, shift: absenAsistenForm.shift })
    if (error) error.code === '23505' ? showNotification('Sudah absen!', 'error') : showNotification(error.message, 'error');
    else { showNotification('Tersimpan!'); fetchData(); } 
    setSubmitting(false)
  }

  const saveGrade = async (id: string) => {
    setSubmitting(true)
    const totalScore = gradeForm.tp + gradeForm.tl + gradeForm.pd + gradeForm.la
    let gradeChar = getGradeChar(totalScore)
    const { error } = await supabase.from('practicum_sessions').update({ nilai_tp: gradeForm.tp, nilai_tl: gradeForm.tl, nilai_pd: gradeForm.pd, nilai_la: gradeForm.la, grade: gradeChar, status: 'graded' }).eq('id', id)
    if (error) showNotification(error.message, 'error'); else { showNotification('Nilai Disimpan!'); setEditingId(null); fetchData(); }
    setSubmitting(false)
  }

  const handlePostAnnouncement = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault(); setSubmitting(true)
    const form = e.currentTarget; const judul = (form.elements.namedItem('judul') as HTMLInputElement).value; const isi = (form.elements.namedItem('isi') as HTMLTextAreaElement).value
    const { error } = await supabase.from('announcements').insert({ judul, isi })
    if (!error) { form.reset(); fetchData(); showNotification('Pengumuman diposting!'); setActiveTab('home'); } else { showNotification(error.message, 'error'); }
    setSubmitting(false)
  }

  const handleDeleteAnnouncement = async (id: string) => { if(confirm('Hapus?')) { await supabase.from('announcements').delete().eq('id', id); setAnnouncements(prev => prev.filter(a => a.id !== id)); showNotification('Dihapus.') } }

  const handleUploadFile = async (e: React.FormEvent) => {
    e.preventDefault(); if (!fileForm.file) return showNotification('Pilih file!', 'error'); setUploading(true)
    try {
      const fileName = `${Date.now()}.${fileForm.file.name.split('.').pop()}`
      await supabase.storage.from('lab-files').upload(fileName, fileForm.file)
      const { data: { publicUrl } } = supabase.storage.from('lab-files').getPublicUrl(fileName)
      await supabase.from('resources').insert({ judul: fileForm.judul, kategori: fileForm.kategori, file_url: publicUrl, uploaded_by: profile.id })
      showNotification('File diupload!'); setFileForm({ judul: '', kategori: KATEGORI_FILE[0], file: null }); fetchData() 
    } catch (err: any) { showNotification(err.message, 'error') } finally { setUploading(false) }
  }

  const handleDeleteFile = async (id: string, fileUrl: string) => {
    if(!confirm('Hapus file?')) return
    await supabase.from('resources').delete().eq('id', id); const fileName = fileUrl.split('/').pop();
    if(fileName) await supabase.storage.from('lab-files').remove([fileName])
    setResources((prev) => prev.filter((item) => item.id !== id)); showNotification('File dihapus.')
  }

  const calculateFinalScore = () => {
    const praktikumModules = sessions.filter(s => s.modul !== 'Sosialisasi' && s.status === 'graded');
    const total = praktikumModules.reduce((acc, curr) => acc + (curr.nilai_akhir || 0), 0);
    const bonus = sessions.find(s => s.modul === 'Sosialisasi' && s.status === 'graded') ? 10 : 0;
    let final = (total > 0 ? total / 7 : 0) + bonus; if (final > 100) final = 100;
    return { average: (total/7).toFixed(2), bonus, final: final.toFixed(2), finalGrade: getGradeChar(final), moduleCount: praktikumModules.length };
  }

  // --- COMPONENT HELPERS ---
  const Card = ({ children, className = '' }: any) => (
    <div className={`bg-slate-900 rounded-3xl p-6 border border-slate-800 ${className}`}>{children}</div>
  )
   
  const Button = ({ children, variant = 'primary', className='', ...props }: any) => {
    const base = "px-6 py-3 rounded-full font-medium text-sm transition-all active:scale-95 flex items-center justify-center gap-2"
    const variants = {
        primary: "bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-900/50",
        secondary: "bg-slate-800 text-slate-300 hover:bg-slate-700",
        outline: "border border-slate-700 text-slate-300 hover:bg-slate-800",
        danger: "bg-red-900/30 text-red-400 hover:bg-red-900/50"
    }
    return <button {...props} className={`${base} ${variants[variant as keyof typeof variants]} ${className}`}>{children}</button>
  }

  const Input = (props: any) => <input {...props} className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500 text-slate-200 placeholder-slate-600" />
   
  const Select = (props: any) => (
    <div className="relative">
        <select {...props} className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-4 py-3 text-sm appearance-none focus:outline-none focus:border-blue-500 text-slate-200">{props.children}</select>
        <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500">▼</div>
    </div>
  )

  const SummaryCardSmall = ({ icon: Icon, title, value, color }: any) => {
      const colorClasses = {
        blue: "bg-blue-900/20 text-blue-400",
        emerald: "bg-emerald-900/20 text-emerald-400",
        purple: "bg-purple-900/20 text-purple-400"
      }[color as 'blue' | 'emerald' | 'purple'] || "bg-slate-800 text-slate-400";

      return (
        <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800 flex flex-col items-center justify-center gap-2">
            <div className={`p-2 rounded-xl ${colorClasses}`}>
                <Icon size={20} />
            </div>
            <div className="text-center">
                <span className="block text-xl font-bold text-white">{value}</span>
                <span className="text-[10px] uppercase font-bold text-slate-500">{title}</span>
            </div>
        </div>
      )
  }

  // --- RENDER ---
  if (loading) return (
    <div className="flex justify-center items-center h-screen bg-slate-950">
        <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-blue-600 border-slate-800"></div>
    </div>
  )

  const filteredSessions = sessions.filter(s => {
      if(profile.role === 'praktikan') return true;
      return s.student?.nama_lengkap.toLowerCase().includes(filter.nama.toLowerCase()) &&
             (filter.modul ? s.modul === filter.modul : true) &&
             (filter.shift ? s.shift === filter.shift : true) &&
             (filter.tanggal ? s.tanggal === filter.tanggal : true);
  });
   
  const scoreData = profile.role === 'praktikan' ? calculateFinalScore() : null;

  // Title Logic
  const getMobileHeaderTitle = () => {
      if(activeTab === 'absen') return 'Presensi Lab';
      if(activeTab === 'nilai') return 'Rekap Nilai';
      if(activeTab === 'files') return 'Repository';
      if(activeTab === 'profile') return 'Profil Saya';
      if(activeTab === 'create-announcement') return 'Buat Info';
      if(activeTab === 'password') return 'Ganti Password';
      return 'Lab Fister';
  }

  const displayName = getNickname(profile.nama_lengkap);

  return (
    <div className="min-h-screen bg-slate-950 font-sans text-slate-100 flex flex-col md:flex-row">
       
      {/* Toast */}
      {toast.show && (
        <div className={`fixed top-4 left-1/2 -translate-x-1/2 px-6 py-3 rounded-full shadow-lg z-[100] flex items-center gap-3 animate-bounce-in ${toast.type === 'error' ? 'bg-red-900/80 text-red-100' : 'bg-green-900/80 text-green-100'}`}>
            {toast.type === 'error' ? <AlertCircle size={18}/> : <CheckCircle2 size={18}/>}
            <span className="font-medium text-sm">{toast.message}</span>
        </div>
      )}

      {/* --- SIDEBAR MENU (DESKTOP) --- */}
      <aside className="hidden md:flex flex-col w-72 h-screen fixed left-0 top-0 bg-slate-900 border-r border-slate-800 p-6 z-50">
           <div className="flex items-center gap-4 mb-10 pl-2">
               <img src="/logo-fister.png" alt="Lab Logo" className="w-10 h-10 object-contain" onError={(e) => {e.currentTarget.style.display='none'}} />
               <div>
                   <span className="font-bold text-xl tracking-tight block text-white">Lab Fister</span>
                   <span className="text-[10px] text-slate-500 uppercase tracking-widest">Dashboard</span>
               </div>
           </div>

           <nav className="space-y-2 flex-1">
               <NavButton active={activeTab==='home'} onClick={()=>setActiveTab('home')} icon={Home} label="Dashboard" />
               <NavButton active={activeTab==='absen'} onClick={()=>setActiveTab('absen')} icon={ClipboardList} label="Absensi" />
               <NavButton active={activeTab==='nilai'} onClick={()=>setActiveTab('nilai')} icon={BarChart2} label="Data Nilai" />
               <NavButton active={activeTab==='files'} onClick={()=>setActiveTab('files')} icon={FolderOpen} label="Repository" />
           </nav>

            <div className="space-y-4 pt-4 border-t border-slate-800">
               <button onClick={()=>setActiveTab('profile')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl transition-all ${activeTab==='profile' ? 'bg-slate-800' : 'hover:bg-slate-800/50'}`}>
                   <div className="w-10 h-10 bg-slate-700 rounded-full flex items-center justify-center text-slate-300 font-bold border-2 border-slate-600">{profile.nama_lengkap.charAt(0)}</div>
                   <div className="text-left">
                       <p className="text-sm font-bold line-clamp-1 text-slate-200">{displayName}</p>
                       <p className="text-xs text-slate-500">{profile.role}</p>
                   </div>
               </button>
           </div>
      </aside>

      {/* --- MAIN CONTENT --- */}
      <main className="flex-1 pb-24 md:pb-8 md:pl-72 relative">
        
        {/* MOBILE HEADER (Fixed) */}
        <div className="md:hidden fixed top-0 left-0 right-0 bg-slate-950/80 backdrop-blur-md z-40 px-6 py-4 border-b border-slate-900 flex items-center justify-between">
             <div className="flex items-center gap-3">
                 {/* Back Button Logic */}
                 {['create-announcement', 'password'].includes(activeTab) ? (
                     <button onClick={() => setActiveTab(activeTab === 'password' ? 'profile' : 'home')} className="p-1 -ml-1 text-slate-200"><ArrowLeft size={24}/></button>
                 ) : (
                    /* LOGO & LAB FISTER TEXT (ONLY ON HOME) */
                    activeTab === 'home' ? (
                        <div className="flex items-center gap-3 animate-fade-in">
                             <img src="/logo-fister.png" alt="Logo" className="w-8 h-8 object-contain" />
                             <span className="font-bold text-lg text-white tracking-tight">Lab Fister</span>
                        </div>
                    ) : (
                        /* TAB NAME ON OTHER TABS */
                        <h1 className="font-bold text-lg text-white animate-fade-in">{getMobileHeaderTitle()}</h1>
                    )
                 )}
             </div>
        </div>

        {/* DESKTOP HEADER */}
        <div className="hidden md:flex px-8 py-8 justify-between items-center">
             <div>
                 <h1 className="text-3xl font-bold text-white">Halo, {displayName} 👋</h1>
                 <p className="text-slate-400 mt-1">Selamat datang kembali di Dashboard Lab.</p>
             </div>
        </div>

        {/* CONTENT CONTAINER */}
        <div className="px-5 md:px-8 max-w-6xl mx-auto space-y-6 pt-24 md:pt-2">

            {/* TAB: HOME */}
            {activeTab === 'home' && (
                <div className="space-y-6 animate-fade-in">

                    {/* MOBILE GREETING CARD */}
                    <div className="md:hidden bg-gradient-to-r from-blue-900 to-indigo-900 rounded-3xl p-6 text-white shadow-lg border border-blue-800/50 relative overflow-hidden">
                         <div className="absolute top-0 right-0 -mr-6 -mt-6 w-32 h-32 bg-white/10 rounded-full blur-2xl"></div>
                         
                         <h2 className="text-2xl font-bold relative z-10">Halo, {displayName} 👋</h2>
                         <p className="text-blue-200 text-sm mt-1 mb-3 relative z-10">
                           Selamat datang kembali di dashboard Lab. Fisika Terapan
                         </p>
                         <div className="inline-block bg-slate-950/30 backdrop-blur-sm px-3 py-1 rounded-full text-xs font-medium border border-white/10 relative z-10">
                            {profile.role === 'asisten' ? 'Asisten Laboratorium' : 'Praktikan'}
                         </div>
                    </div>

                    {/* ANNOUNCEMENTS (Hidden Scrollbar) */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between px-1">
                             <div className="flex items-center gap-2">
                                <div className="p-2 bg-orange-900/20 text-orange-400 rounded-lg"><Megaphone size={18}/></div>
                                <h2 className="font-bold text-lg text-slate-100">Pengumuman</h2>
                             </div>
                             {profile.role === 'asisten' && <button onClick={()=>setActiveTab('create-announcement')} className="text-xs font-bold text-blue-400 hover:text-blue-300">+ Tulis Info</button>}
                        </div>

                        <div className="relative">
                            {/* Tambahan class no-scrollbar */}
                            <div className="max-h-72 overflow-y-auto no-scrollbar pr-1 space-y-3">
                                {announcements.length === 0 ? (
                                    <div className="text-center py-10 bg-slate-900 rounded-3xl border border-dashed border-slate-800">
                                        <p className="text-slate-600 text-sm">Belum ada informasi terbaru.</p>
                                    </div>
                                ) : announcements.map((ann) => (
                                    <div key={ann.id} className="bg-slate-900 p-5 rounded-2xl border border-slate-800 shadow-sm hover:border-blue-900 transition-colors group">
                                        <div className="flex justify-between items-start mb-2">
                                            <h3 className="font-bold text-slate-100 flex-1">{ann.judul}</h3>
                                            {profile.role === 'asisten' && <button onClick={()=>handleDeleteAnnouncement(ann.id)} className="text-slate-600 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 size={16}/></button>}
                                        </div>
                                        <p className="text-slate-400 text-sm whitespace-pre-wrap leading-relaxed mb-3">{linkify(ann.isi)}</p>
                                        <div className="flex items-center gap-2">
                                            <span className="text-[10px] text-slate-500 font-medium bg-slate-950 px-2 py-1 rounded-md">{new Date(ann.created_at).toLocaleDateString('id-ID', {day:'numeric', month:'short'})}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <div className="absolute bottom-0 left-0 right-0 h-6 bg-gradient-to-t from-slate-950 to-transparent pointer-events-none"></div>
                        </div>
                    </div>

                    <hr className="border-slate-800" />
                    
                    {/* OVERVIEW GRID */}
                    {profile.role === 'asisten' && (
                        <div className="grid grid-cols-2 gap-4">
                            <div onClick={() => setActiveTab('create-announcement')} className="bg-blue-900/30 border border-blue-900/50 hover:bg-blue-900/50 cursor-pointer p-6 rounded-3xl text-blue-200 flex flex-col items-center text-center gap-2 transition-all active:scale-95">
                                <div className="bg-blue-600 p-3 rounded-full mb-1 text-white"><Megaphone size={24}/></div>
                                <h3 className="font-bold text-sm">Buat Info</h3>
                            </div>
                            <div onClick={() => setActiveTab('files')} className="bg-slate-900 border border-slate-800 cursor-pointer p-6 rounded-3xl flex flex-col items-center text-center gap-2 hover:border-slate-700 transition-all active:scale-95">
                                <div className="bg-indigo-900/30 text-indigo-400 p-3 rounded-full mb-1"><UploadCloud size={24}/></div>
                                <h3 className="font-bold text-slate-300 text-sm">Upload File</h3>
                            </div>
                        </div>
                    )}

                    {profile.role === 'praktikan' && scoreData && (
                        <div>
                            {/* HOME: Header Ringkasan */}
                            <div className="flex items-center gap-2 mb-4 px-1">
                                <div className="p-2 bg-emerald-900/20 text-emerald-400 rounded-lg"><LayoutDashboard size={18}/></div>
                                <h2 className="font-bold text-lg text-slate-100">Ringkasan Akademik</h2>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                 <Card className="flex flex-col items-center justify-center !p-6 bg-slate-900 border-slate-800">
                                     <span className="text-3xl font-black text-blue-400">{scoreData.moduleCount}<span className="text-sm text-slate-600 font-normal">/7</span></span>
                                     <span className="text-[10px] text-slate-500 font-bold uppercase mt-2 tracking-wider flex items-center gap-1"><BookOpen size={10}/> Modul Selesai</span>
                                 </Card>
                                 <Card className="flex flex-col items-center justify-center !p-6 bg-slate-900 border-slate-800">
                                     <span className="text-3xl font-black text-emerald-400">{scoreData.finalGrade}</span>
                                     <span className="text-[10px] text-slate-500 font-bold uppercase mt-2 tracking-wider flex items-center gap-1"><Award size={10}/> Predikat</span>
                                 </Card>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* TAB: ABSENSI */}
            {activeTab === 'absen' && (
                <div className="space-y-6 animate-fade-in">
                    {/* Hero Section Absensi (Mobile) */}
                    <div className="md:hidden flex flex-col items-center justify-center py-6 space-y-3">
                         <div className="p-5 bg-blue-600/10 rounded-full text-blue-400 ring-1 ring-blue-500/50 shadow-[0_0_30px_rgba(37,99,235,0.15)]">
                             <Zap size={40} className="fill-blue-600/20" />
                         </div>
                         <div className="text-center">
                             <h2 className="text-2xl font-bold text-white tracking-tight">Presensi Lab</h2>
                             <p className="text-slate-400 text-xs mt-1">Isi formulir kehadiran praktikum di bawah ini.</p>
                         </div>
                    </div>

                    {profile.role === 'praktikan' ? (
                        <Card>
                            <h2 className="font-bold text-lg mb-6 flex items-center gap-2 text-white"><ClipboardList className="text-blue-500"/> Form Presensi</h2>
                            <form onSubmit={handleAbsenPraktikan} className="space-y-4">
                                <Select value={absenPraktikanForm.modul} onChange={(e:any) => setAbsenPraktikanForm({...absenPraktikanForm, modul: e.target.value})}>{MODUL_LIST.map(m => <option key={m} value={m}>{m}</option>)}</Select>
                                <Select onChange={(e:any) => setAbsenPraktikanForm({...absenPraktikanForm, shift: e.target.value})}>{SHIFT_LIST.map(s => <option key={s} value={s}>Shift {s}</option>)}</Select>
                                <Select required onChange={(e:any) => setAbsenPraktikanForm({...absenPraktikanForm, assistant_id: e.target.value})}><option value="">-- Pilih Asisten --</option>{assistants.map(a => <option key={a.id} value={a.id}>{a.nama_lengkap}</option>)}</Select>
                                <Input type="date" value={absenPraktikanForm.tanggal} onChange={(e:any) => setAbsenPraktikanForm({...absenPraktikanForm, tanggal: e.target.value})} />
                                <Button disabled={submitting} className="w-full mt-4">Kirim Kehadiran</Button>
                            </form>
                        </Card>
                    ) : (
                        <>
                            <Card>
                                <h2 className="font-bold text-lg mb-4 text-white">Absen Asisten</h2>
                                <form onSubmit={handleAbsenAsisten} className="grid grid-cols-2 gap-3">
                                    <Select value={absenAsistenForm.modul} onChange={(e:any) => setAbsenAsistenForm({...absenAsistenForm, modul: e.target.value})}>{MODUL_LIST.map(m => <option key={m} value={m}>{m}</option>)}</Select>
                                    <Select onChange={(e:any) => setAbsenAsistenForm({...absenAsistenForm, shift: e.target.value})}>{SHIFT_LIST.map(s => <option key={s} value={s}>Shift {s}</option>)}</Select>
                                    <div className="col-span-2"><Input type="date" value={absenAsistenForm.tanggal} onChange={(e:any) => setAbsenAsistenForm({...absenAsistenForm, tanggal: e.target.value})} /></div>
                                    <div className="col-span-2 mt-2"><Button disabled={submitting} className="w-full">Simpan</Button></div>
                                </form>
                            </Card>
                            <div className="bg-slate-900 rounded-3xl border border-slate-800 overflow-hidden">
                                <div className="bg-slate-950 px-6 py-3 border-b border-slate-800 font-bold text-sm text-slate-500">RIWAYAT SHIFT</div>
                                {/* Tambahan class no-scrollbar */}
                                <div className="max-h-64 overflow-y-auto no-scrollbar">
                                    {assistantLogs.map(log => (
                                        <div key={log.id} className="px-6 py-4 border-b border-slate-800 flex justify-between items-center last:border-0">
                                            <div><p className="font-bold text-slate-200">{log.modul}</p><p className="text-xs text-slate-500">{log.tanggal}</p></div>
                                            <span className="bg-blue-900/40 text-blue-300 text-xs px-3 py-1 rounded-full font-bold">Shift {log.shift}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </>
                    )}
                </div>
            )}

            {/* TAB: NILAI */}
            {activeTab === 'nilai' && (
                <div className="space-y-4 animate-fade-in">
                    
                    {/* Ringkasan Nilai Praktikan (3 Kolom) */}
                    {profile.role === 'praktikan' && scoreData && (
                        <div className="space-y-3 mb-6">
                            <div className="flex items-center gap-2 px-1">
                                <div className="p-2 bg-purple-900/20 text-purple-400 rounded-lg"><BarChart2 size={18}/></div>
                                <h2 className="font-bold text-lg text-slate-100">Statistik Nilai</h2>
                            </div>
                            <div className="grid grid-cols-3 gap-3">
                                <SummaryCardSmall icon={BookOpen} title="Modul" value={`${scoreData.moduleCount}/7`} color="blue" />
                                <SummaryCardSmall icon={Calculator} title="Nilai Akhir" value={scoreData.final} color="emerald" />
                                <SummaryCardSmall icon={Award} title="Predikat" value={scoreData.finalGrade} color="purple" />
                            </div>
                        </div>
                    )}

                    {profile.role === 'asisten' && (
                        <div className="grid grid-cols-2 gap-2 mb-2">
                             <Input placeholder="Cari Nama..." value={filter.nama} onChange={(e:any) => setFilter({...filter, nama: e.target.value})} />
                             <Select value={filter.modul} onChange={(e:any) => setFilter({...filter, modul: e.target.value})}><option value="">Semua Modul</option>{MODUL_LIST.map(m => <option key={m} value={m}>{m}</option>)}</Select>
                        </div>
                    )}

                    <div className="bg-slate-900 rounded-3xl border border-slate-800 overflow-hidden shadow-sm">
                        {/* Tambahan class no-scrollbar */}
                        <div className="overflow-x-auto no-scrollbar">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-slate-950 text-slate-400 text-xs uppercase font-bold">
                                    <tr>
                                        <th className="px-6 py-4">Modul</th>
                                        <th className="px-6 py-4">{profile.role === 'asisten' ? 'Praktikan' : 'Status'}</th>
                                        <th className="px-6 py-4 text-center">Nilai</th>
                                        <th className="px-6 py-4 text-center">Akhir</th>
                                        {profile.role === 'asisten' && <th className="px-6 py-4"></th>}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-800">
                                    {filteredSessions.length === 0 ? <tr><td colSpan={5} className="px-6 py-8 text-center text-slate-500">Data kosong.</td></tr> : 
                                    filteredSessions.map(sess => (
                                        <tr key={sess.id} className="hover:bg-slate-800/50 transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="font-bold text-slate-100">{sess.modul}</div>
                                                <div className="text-xs text-slate-500">{sess.tanggal}</div>
                                            </td>
                                            <td className="px-6 py-4">
                                                {profile.role === 'asisten' ? (
                                                    <div><div className="font-medium text-slate-200">{sess.student?.nama_lengkap}</div><div className="text-xs text-slate-500">{sess.student?.nim}</div></div>
                                                ) : <span className={`px-2 py-1 rounded text-xs font-bold ${sess.status==='graded'?'bg-emerald-900/30 text-emerald-400':'bg-yellow-900/30 text-yellow-400'}`}>{sess.status==='graded'?'Selesai':'Pending'}</span>}
                                            </td>
                                            
                                            {/* Editing Mode */}
                                            {editingId === sess.id ? (
                                                <td colSpan={3} className="px-6 py-4 bg-blue-900/10">
                                                    {sess.modul === 'Sosialisasi' ? (
                                                        <div className="flex gap-2 justify-center">
                                                            <Button onClick={()=>saveGrade(sess.id)} className="py-1 px-4 text-xs">Konfirmasi Hadir</Button>
                                                            <button onClick={()=>setEditingId(null)} className="text-xs text-slate-500 underline">Batal</button>
                                                        </div>
                                                    ) : (
                                                        <div className="flex flex-col gap-3">
                                                            <div className="flex gap-2 justify-center">
                                                                {['tp','tl','pd','la'].map(k => (
                                                                    <div key={k} className="text-center w-12">
                                                                        <label className="text-[10px] uppercase font-bold text-slate-400">{k}</label>
                                                                        <input type="number" value={(gradeForm as any)[k]} onChange={e=>setGradeForm({...gradeForm, [k]: +e.target.value})} className="w-full text-center border rounded py-1 text-sm bg-slate-800 border-slate-700 text-white"/>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                            <div className="flex justify-end gap-2">
                                                                <button onClick={()=>setEditingId(null)} className="text-xs text-slate-500">Batal</button>
                                                                <button onClick={()=>saveGrade(sess.id)} className="text-xs bg-blue-600 text-white px-3 py-1 rounded-full font-bold">Simpan</button>
                                                            </div>
                                                        </div>
                                                    )}
                                                </td>
                                            ) : (
                                                <>
                                                    <td className="px-6 py-4 text-center">
                                                        {sess.modul === 'Sosialisasi' ? '-' : (
                                                            <div className="flex justify-center gap-1">
                                                                {['tp','tl','pd','la'].map(k => (
                                                                    <div key={k} className="flex flex-col items-center w-8 p-1 bg-slate-800 rounded">
                                                                        <span className="text-[8px] text-slate-400 uppercase">{k}</span>
                                                                        <span className="text-xs font-bold text-slate-300">{(sess as any)[`nilai_${k}`]}</span>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </td>
                                                    <td className="px-6 py-4 text-center">
                                                        {sess.status === 'graded' ? <span className="font-bold text-lg text-emerald-400">{sess.nilai_akhir}</span> : '-'}
                                                    </td>
                                                    {profile.role === 'asisten' && (
                                                        <td className="px-6 py-4 text-right">
                                                            <button onClick={()=> { setEditingId(sess.id); setGradeForm({tp: sess.nilai_tp||0, tl: sess.nilai_tl||0, pd: sess.nilai_pd||0, la: sess.nilai_la||0}) }} className="bg-slate-800 hover:bg-blue-900/30 p-2 rounded-full text-slate-400 hover:text-blue-400 transition-colors"><FileText size={16}/></button>
                                                        </td>
                                                    )}
                                                </>
                                            )}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* TAB: FILES */}
            {activeTab === 'files' && (
                <div className="space-y-6 animate-fade-in">
                    {profile.role === 'asisten' && (
                        <Card className="border-l-4 border-l-indigo-500">
                             <h3 className="font-bold text-lg mb-4 flex items-center gap-2 text-white"><UploadCloud className="text-indigo-400"/> Upload Repository</h3>
                             <form onSubmit={handleUploadFile} className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                 <Input value={fileForm.judul} onChange={(e:any) => setFileForm({...fileForm, judul: e.target.value})} placeholder="Judul..." />
                                 <Select value={fileForm.kategori} onChange={(e:any) => setFileForm({...fileForm, kategori: e.target.value})}>{KATEGORI_FILE.map(k => <option key={k} value={k}>{k}</option>)}</Select>
                                 <div className="relative">
                                     <input type="file" onChange={(e:any) => setFileForm({...fileForm, file: e.target.files ? e.target.files[0] : null})} className="absolute inset-0 opacity-0 cursor-pointer w-full h-full" />
                                     <div className="bg-slate-950 border border-slate-800 rounded-2xl px-4 py-3 text-sm text-slate-500 flex items-center gap-2 truncate hover:bg-slate-900">
                                         {fileForm.file ? <span className="text-slate-200">{fileForm.file.name}</span> : <><Plus size={16}/> Pilih File</>}
                                     </div>
                                 </div>
                                 <div className="md:col-span-3"><Button disabled={uploading} variant="secondary" className="w-full bg-indigo-900/30 text-indigo-300 hover:bg-indigo-900/50">{uploading?'Mengupload...':'Upload Sekarang'}</Button></div>
                             </form>
                        </Card>
                    )}
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                         {resources.length === 0 ? <p className="col-span-full text-center py-10 text-slate-500">Repository kosong.</p> : 
                         resources.map(res => (
                             <div key={res.id} className="bg-slate-900 p-4 rounded-3xl border border-slate-800 hover:border-blue-700 hover:shadow-md transition-all group">
                                 {/* Tampilan Baru: Horizontal (Ikon di samping) */}
                                 <div className="flex items-start gap-4 mb-4">
                                      <div className="bg-blue-900/20 p-3 rounded-2xl text-blue-400 shrink-0">
                                          <FileText size={24}/>
                                      </div>
                                      <div className="flex-1 min-w-0">
                                          <span className="text-[10px] uppercase font-bold text-slate-400 bg-slate-800 px-2 py-0.5 rounded-md mb-1 inline-block">{res.kategori}</span>
                                          <h4 className="font-bold text-slate-100 line-clamp-2 leading-tight">{res.judul}</h4>
                                      </div>
                                 </div>
                                 
                                 <div className="flex gap-2">
                                     <a href={res.file_url} target="_blank" rel="noopener noreferrer" className="flex-1 bg-slate-800 hover:bg-blue-900/30 text-slate-300 hover:text-blue-400 transition-colors py-2 rounded-xl text-xs font-bold flex justify-center items-center gap-2">Download</a>
                                     {profile.role === 'asisten' && <button onClick={()=>handleDeleteFile(res.id, res.file_url)} className="p-2 bg-red-900/20 text-red-400 rounded-xl hover:bg-red-900/40"><Trash2 size={16}/></button>}
                                 </div>
                             </div>
                          ))}
                    </div>
                </div>
            )}

            {/* TAB: PROFILE & GANTI PASSWORD (Sama seperti sebelumnya) */}
            {activeTab === 'create-announcement' && (
                <Card>
                    <h2 className="font-bold text-xl mb-4 text-white">Tulis Pengumuman Baru</h2>
                    <form onSubmit={handlePostAnnouncement} className="space-y-4">
                        <div>
                            <label className="text-xs font-bold text-slate-500 uppercase ml-1">Judul</label>
                            <Input name="judul" required placeholder="Contoh: Jadwal Praktikum Berubah" />
                        </div>
                        <div>
                            <label className="text-xs font-bold text-slate-500 uppercase ml-1">Isi Pesan</label>
                            <textarea name="isi" required rows={5} className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500 transition-all resize-none text-slate-200 placeholder-slate-600"></textarea>
                        </div>
                        <div className="flex gap-2 pt-2">
                            <Button type="button" variant="outline" onClick={()=>setActiveTab('home')} className="flex-1">Batal</Button>
                            <Button disabled={submitting} className="flex-1">{submitting ? 'Memposting...' : 'Kirim'}</Button>
                        </div>
                    </form>
                </Card>
            )}

            {activeTab === 'profile' && (
                <div className="space-y-6 animate-fade-in max-w-2xl mx-auto">
                    <Card className="text-center py-8">
                         <div className="w-24 h-24 bg-slate-700 rounded-full mx-auto mb-4 flex items-center justify-center text-slate-300 text-3xl font-bold">
                             {profile.role === 'praktikan' ? profile.nama_lengkap.charAt(0) : (profile.kode_asisten || 'XX')}
                         </div>
                         <h2 className="text-2xl font-bold text-white">{profile.nama_lengkap}</h2>
                         <div className="flex justify-center gap-2 mt-2 text-sm text-slate-400">
                             <span className="bg-slate-800 px-3 py-1 rounded-full">{profile.role === 'praktikan' ? profile.nim : (profile.kode_asisten || 'ASISTEN')}</span>
                             <span className="bg-slate-800 px-3 py-1 rounded-full">{profile.jurusan || '-'}</span>
                         </div>
                    </Card>

                    <div className="bg-slate-900 rounded-3xl border border-slate-800 overflow-hidden">
                        <button onClick={()=>setActiveTab('password')} className="w-full px-6 py-4 flex items-center justify-between hover:bg-slate-800 transition-colors border-b border-slate-800">
                             <div className="flex items-center gap-3">
                                 <div className="p-2 bg-orange-900/30 text-orange-400 rounded-xl"><KeyRound size={20}/></div>
                                 <span className="font-medium text-slate-200">Ganti Password</span>
                             </div>
                             <ChevronRight size={20} className="text-slate-500"/>
                        </button>
                        <button onClick={handleLogout} className="w-full px-6 py-4 flex items-center justify-between hover:bg-red-900/20 transition-colors group">
                             <div className="flex items-center gap-3">
                                 <div className="p-2 bg-red-900/30 text-red-400 rounded-xl"><LogOut size={20}/></div>
                                 <span className="font-medium text-red-400">Logout</span>
                             </div>
                        </button>
                    </div>
                </div>
            )}

            {activeTab === 'password' && (
                <div className="max-w-xl mx-auto animate-fade-in">
                    <Card>
                        <h2 className="font-bold text-xl mb-6 text-white">Buat Password Baru</h2>
                        <form onSubmit={handlePasswordChange} className="space-y-4">
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase ml-1">Password Baru</label>
                                <Input type="password" value={passForm.new} onChange={(e:any)=>setPassForm({...passForm, new: e.target.value})} placeholder="Minimal 6 karakter" />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase ml-1">Konfirmasi</label>
                                <Input type="password" value={passForm.confirm} onChange={(e:any)=>setPassForm({...passForm, confirm: e.target.value})} placeholder="Ulangi password" />
                            </div>
                            <div className="pt-4 flex gap-3">
                                <Button type="button" variant="outline" onClick={()=>setActiveTab('profile')} className="flex-1">Batal</Button>
                                <Button disabled={submitting} className="flex-1">Simpan</Button>
                            </div>
                        </form>
                    </Card>
                </div>
            )}

        </div>
      </main>

      {/* --- MOBILE NAVIGATION --- */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-slate-950 border-t border-slate-800 py-3 px-6 flex justify-between z-50">
          <MobileNavBtn active={['home','create-announcement'].includes(activeTab)} onClick={()=>setActiveTab('home')} icon={Home} />
          <MobileNavBtn active={activeTab==='absen'} onClick={()=>setActiveTab('absen')} icon={ClipboardList} />
          <MobileNavBtn active={activeTab==='nilai'} onClick={()=>setActiveTab('nilai')} icon={BarChart2} />
          <MobileNavBtn active={activeTab==='files'} onClick={()=>setActiveTab('files')} icon={FolderOpen} />
          <MobileNavBtn active={['profile','password'].includes(activeTab)} onClick={()=>setActiveTab('profile')} icon={User} />
      </nav>

    </div>
  )
}

// Navigasi Desktop
const NavButton = ({ active, onClick, icon: Icon, label }: any) => (
    <button onClick={onClick} className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl transition-all duration-300 font-medium ${active ? 'bg-blue-900/30 text-blue-300' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'}`}>
        <Icon size={24} className={active ? "fill-blue-900 text-blue-300" : "text-slate-500"} />
        <span>{label}</span>
    </button>
)

// Navigasi Mobile
const MobileNavBtn = ({ active, onClick, icon: Icon }: any) => (
    <button onClick={onClick} className="flex items-center justify-center w-14 h-12 rounded-2xl transition-all active:scale-90">
        <div className={`p-3 rounded-full transition-all ${active ? 'bg-blue-900/50' : 'bg-transparent'}`}>
            <Icon size={24} className={active ? "text-blue-300 fill-blue-900" : "text-slate-500"} />
        </div>
    </button>
)