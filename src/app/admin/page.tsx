'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import Cookies from 'js-cookie'
import { useRouter } from 'next/navigation'
import { getAdminData, updateUserRole, resetUserPassword, deleteUser, updateAssistantCode, updateUserGroup, toggleTransparency, updateTelegram } from '../actions/adminActions' 
import { 
  ShieldAlert, Users, Search, KeyRound, Crown, CalendarCheck,
  Trash2, UserCog, LayoutDashboard, LogOut, Download, Briefcase,
  Filter, ArrowUpDown, Tag, CheckCircle, CheckCircle2, AlertCircle,
  Users2, Eye, EyeOff, SortAsc, SortDesc, Send // Tambah Icon Send
} from 'lucide-react'

export default function AdminPage() {
  const supabase = createClient()
  const router = useRouter()

  // Data State
  const [users, setUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' })
  const [transparency, setTransparency] = useState(false) 
  
  // Filter & Sort State
  const [search, setSearch] = useState('')
  const [filterJurusan, setFilterJurusan] = useState('')
  const [filterKelompok, setFilterKelompok] = useState('')
  
  const [sortConfig, setSortConfig] = useState({ key: 'kelompok', direction: 'asc' })
  const [activeTab, setActiveTab] = useState<'praktikan' | 'staff'>('praktikan')
  
  // Modal State (Tambah tipe 'telegram')
  const [modalType, setModalType] = useState<'password' | 'role' | 'code' | 'group' | 'telegram' | null>(null)
  const [selectedUser, setSelectedUser] = useState<any>(null)
  const [inputVal, setInputVal] = useState('') 
  const [newRole, setNewRole] = useState('')
  const [processing, setProcessing] = useState(false)

  // Helper Functions
  const getGradeChar = (score: number) => {
    if (score > 85) return 'A'; if (score > 80) return 'A-'; if (score > 75) return 'B+';
    if (score > 70) return 'B'; if (score > 65) return 'B-'; if (score > 60) return 'C+';
    if (score > 55) return 'C'; if (score > 50) return 'D'; return 'E';
  }

  const showNotification = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ show: true, message, type })
    setTimeout(() => setToast((prev) => ({ ...prev, show: false })), 3000)
  }

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    Cookies.remove('fister-token', { path: '/' }) 
    Cookies.remove('fister-refresh-token', { path: '/' })
    window.location.href = '/login'
  }
  
  const jurusanList = Array.from(new Set(users.map(u => u.jurusan).filter(Boolean))).sort();
  const kelompokList = Array.from(new Set(users.map(u => u.kelompok).filter(Boolean))).sort((a:any, b:any) => a.localeCompare(b, undefined, {numeric: true}));

  useEffect(() => { checkAdminAndFetch() }, [])

  const checkAdminAndFetch = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return router.push('/')
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
    if (profile?.role !== 'admin') return router.push('/dashboard')
    fetchUsers()
  }

  const fetchUsers = async () => {
    setLoading(true)
    const res = await getAdminData()
    if (res.success) {
        setUsers(res.data || [])
        setTransparency(res.transparency ?? false) 
    } else {
        showNotification("Gagal memuat data: " + res.error, 'error')
    }
    setLoading(false)
  }

  const handleSort = (key: string) => {
      setSortConfig(current => ({
          key,
          direction: current.key === key && current.direction === 'asc' ? 'desc' : 'asc'
      }))
  }

  const filteredUsers = users
    .filter(u => {
        const isStaff = ['asisten', 'admin'].includes(u.role);
        if (activeTab === 'praktikan' && isStaff) return false;
        if (activeTab === 'staff' && !isStaff) return false;

        const q = search.toLowerCase();
        const matchSearch = u.nama_lengkap?.toLowerCase().includes(q) || 
                            u.nim?.includes(q) || 
                            u.kode_asisten?.toLowerCase().includes(q) ||
                            u.kelompok?.toLowerCase().includes(q);
        if (!matchSearch) return false;
        if (filterJurusan && u.jurusan !== filterJurusan) return false;
        if (filterKelompok && u.kelompok !== filterKelompok) return false;
        return true;
    })
    .sort((a, b) => {
        const dir = sortConfig.direction === 'asc' ? 1 : -1;
        if (sortConfig.key === 'kelompok') {
             const groupA = a.kelompok || '';
             const groupB = b.kelompok || '';
             return dir * groupA.localeCompare(groupB, undefined, {numeric: true});
        }
        if (sortConfig.key === 'jurusan') {
             const jurA = a.jurusan || '';
             const jurB = b.jurusan || '';
             return dir * jurA.localeCompare(jurB);
        }
        return (a.nama_lengkap || '').localeCompare(b.nama_lengkap || '');
    });

  // --- HANDLERS ---
  const handleToggleTransparency = async () => {
    setProcessing(true)
    const newVal = !transparency
    const res = await toggleTransparency(newVal)
    setProcessing(false)
    if(res.success) { setTransparency(newVal); showNotification(res.message) } else { showNotification(res.message, 'error') }
  }

  const handleUpdateGroup = async () => {
    setProcessing(true)
    const res = await updateUserGroup(selectedUser.id, inputVal)
    setProcessing(false)
    if(res.success) { showNotification(res.message); setModalType(null); setInputVal(''); fetchUsers(); } else { showNotification(res.message, 'error') }
  }

  const handleResetPassword = async () => {
    if(inputVal.length < 6) return showNotification("Min 6 karakter", 'error')
    setProcessing(true)
    const res = await resetUserPassword(selectedUser.id, inputVal)
    setProcessing(false)
    if(res.success) { showNotification(res.message); setModalType(null); setInputVal('') } else { showNotification(res.message, 'error') }
  }

  const handleUpdateRole = async () => {
    setProcessing(true)
    const res = await updateUserRole(selectedUser.id, newRole)
    setProcessing(false)
    if(res.success) { showNotification(res.message); setModalType(null); fetchUsers(); } else { showNotification(res.message, 'error') }
  }

  const handleUpdateCode = async () => {
    if(inputVal.length > 2) return showNotification("Kode maksimal 2 karakter", 'error')
    setProcessing(true)
    const res = await updateAssistantCode(selectedUser.id, inputVal)
    setProcessing(false)
    if(res.success) { showNotification(res.message); setModalType(null); setInputVal(''); fetchUsers(); } else { showNotification(res.message, 'error') }
  }

  // [BARU] Handler Update Telegram
  const handleUpdateTelegram = async () => {
    setProcessing(true)
    const res = await updateTelegram(selectedUser.id, inputVal)
    setProcessing(false)
    if(res.success) { showNotification(res.message); setModalType(null); setInputVal(''); fetchUsers(); } else { showNotification(res.message, 'error') }
  }

  const handleDelete = async (user: any) => {
    if(!confirm(`YAKIN HAPUS ${user.nama_lengkap}? Data tidak bisa kembali!`)) return
    const loadingToast = showNotification("Menghapus user...", 'success') 
    const res = await deleteUser(user.id)
    if(res.success) { showNotification(res.message); fetchUsers() } else { showNotification(res.message, 'error') }
  }

  const handleExportCSV = () => {
    if (filteredUsers.length === 0) return showNotification("Tidak ada data.", 'error');
    let headers: string[] = [];
    if (activeTab === 'praktikan') { headers = ["Nama", "NIM", "Kelompok", "Jurusan", "Nilai Akhir", "Predikat"]; } else { headers = ["Nama", "NIM", "Kode Asisten", "Role", "Total Shift"]; }
    const rows = filteredUsers.map(u => {
        if (activeTab === 'praktikan') { return [`"${u.nama_lengkap}"`, `"${u.nim}"`, `"${u.kelompok || '-'}"`, `"${u.jurusan}"`, u.stats.final_score, getGradeChar(parseFloat(u.stats.final_score))]; } else { return [`"${u.nama_lengkap}"`, `"${u.nim}"`, `"${u.kode_asisten || '--'}"`, `"${u.role}"`, u.stats.logs_count]; }
    });
    const csvContent = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a"); link.href = url; link.download = `Data_${activeTab}_${new Date().toISOString().slice(0,10)}.csv`; link.click();
  }

  if (loading) return <div className="h-screen bg-slate-950 flex flex-col items-center justify-center gap-4"><div className="animate-spin rounded-full h-12 w-12 border-t-4 border-amber-500 border-slate-800"></div></div>

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans p-4 md:p-10">
      
      {toast.show && ( <div className={`fixed top-4 left-1/2 -translate-x-1/2 px-6 py-3 rounded-full shadow-lg z-[100] flex items-center gap-3 animate-bounce-in ${toast.type === 'error' ? 'bg-red-900/80 text-red-100' : 'bg-green-900/80 text-green-100'}`}> {toast.type === 'error' ? <AlertCircle size={18}/> : <CheckCircle2 size={18}/>} <span className="font-medium text-sm">{toast.message}</span> </div> )}

      {/* HEADER ... (Sama) */}
      <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
        <div className="flex items-center gap-4">
            <div className="p-4 bg-amber-500/10 text-amber-400 rounded-3xl border border-amber-500/20 shadow-[0_0_30px_rgba(245,158,11,0.1)]">
                <Crown size={32} strokeWidth={1.5} />
            </div>
            <div>
                <h1 className="text-2xl font-bold text-white tracking-tight">Administrator</h1>
                <p className="text-amber-500/60 text-xs font-mono uppercase tracking-widest mt-1">Dashboard Admin</p>
            </div>
        </div>
        <div className="flex flex-wrap gap-3 w-full md:w-auto justify-center">
             <button onClick={handleToggleTransparency} disabled={processing} className={`px-5 py-2.5 rounded-xl flex items-center gap-2 text-sm font-bold transition-all border ${transparency ? 'bg-emerald-900/20 text-emerald-400 border-emerald-500/30' : 'bg-red-900/10 text-red-400 border-red-900/30'}`}>
                {transparency ? <Eye size={18}/> : <EyeOff size={18}/>}
                Nilai: {transparency ? 'ON' : 'OFF'}
             </button>
             <button onClick={() => router.push('/dashboard')} className="flex-1 md:flex-none justify-center px-5 py-2.5 bg-slate-900 border border-slate-800 hover:bg-slate-800 rounded-xl flex items-center gap-2 text-sm font-bold transition-all"><LayoutDashboard size={18}/> Dashboard</button>
             <button onClick={handleLogout} className="flex-1 md:flex-none justify-center px-5 py-2.5 bg-red-900/10 text-red-400 hover:bg-red-900/20 border border-red-900/20 rounded-xl flex items-center gap-2 text-sm font-bold transition-all"><LogOut size={18}/> Logout</button>
        </div>
      </div>

      {/* TABS SWITCHER */}
      <div className="flex justify-center mb-8">
          <div className="bg-slate-900 p-1.5 rounded-2xl border border-slate-800 flex shadow-inner w-full md:w-auto">
              <button onClick={() => setActiveTab('praktikan')} className={`flex-1 md:flex-none justify-center px-4 md:px-8 py-3 rounded-xl text-xs md:text-sm font-bold transition-all flex items-center gap-2 ${activeTab === 'praktikan' ? 'bg-slate-800 text-white shadow border border-slate-700' : 'text-slate-500 hover:text-slate-300'}`}><Users size={18}/> Praktikan</button>
              <button onClick={() => setActiveTab('staff')} className={`flex-1 md:flex-none justify-center px-4 md:px-8 py-3 rounded-xl text-xs md:text-sm font-bold transition-all flex items-center gap-2 ${activeTab === 'staff' ? 'bg-slate-800 text-amber-400 shadow border border-amber-500/20' : 'text-slate-500 hover:text-slate-300'}`}><Briefcase size={18}/> Asisten</button>
          </div>
      </div>

      {/* FILTER & SORT BAR */}
      <div className="flex flex-col gap-3 mb-6">
          <div className="relative w-full">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={20}/>
              <input type="text" placeholder="Cari Nama / NIM / Kelompok..." className="w-full bg-slate-900 border border-slate-800 rounded-2xl pl-12 pr-4 py-4 focus:outline-none focus:border-amber-500/50 transition-all text-white placeholder-slate-600 shadow-sm" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 md:flex md:flex-row gap-2">
              <select value={filterJurusan} onChange={e => setFilterJurusan(e.target.value)} className="bg-slate-900 border border-slate-800 text-slate-300 pl-4 pr-6 py-3 rounded-2xl font-bold focus:outline-none text-xs md:text-sm w-full"><option value="">Semua Jurusan</option>{jurusanList.map(j => <option key={j} value={j}>{j}</option>)}</select>
              {activeTab === 'praktikan' && (
                  <select value={filterKelompok} onChange={e => setFilterKelompok(e.target.value)} className="bg-slate-900 border border-slate-800 text-slate-300 pl-4 pr-6 py-3 rounded-2xl font-bold focus:outline-none text-xs md:text-sm w-full"><option value="">Semua Kelompok</option>{kelompokList.map(k => <option key={k} value={k}>{k}</option>)}</select>
              )}
          </div>
          <div className="grid grid-cols-2 md:flex md:flex-row gap-2">
              {activeTab === 'praktikan' && (
                  <button onClick={() => handleSort('kelompok')} className={`px-4 py-3 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all border text-xs md:text-sm ${sortConfig.key === 'kelompok' ? 'bg-amber-900/20 border-amber-500/30 text-amber-400' : 'bg-slate-900 border-slate-800 text-slate-400'}`}>Grup {sortConfig.key === 'kelompok' && (sortConfig.direction === 'asc' ? <SortAsc size={16}/> : <SortDesc size={16}/>)}</button>
              )}
              <button onClick={() => handleSort('jurusan')} className={`px-4 py-3 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all border text-xs md:text-sm ${sortConfig.key === 'jurusan' ? 'bg-blue-900/20 border-blue-500/30 text-blue-400' : 'bg-slate-900 border-slate-800 text-slate-400'}`}>Jurusan {sortConfig.key === 'jurusan' && (sortConfig.direction === 'asc' ? <SortAsc size={16}/> : <SortDesc size={16}/>)}</button>
              <button onClick={handleExportCSV} className="col-span-2 md:col-span-1 bg-emerald-900/20 border border-emerald-900/50 text-emerald-400 hover:bg-emerald-900/40 px-4 py-3 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all shadow-sm text-xs md:text-sm"><Download size={18}/> <span className="md:hidden">Export CSV</span></button>
          </div>
      </div>

      {/* TABLE */}
      <div className="bg-slate-900 rounded-3xl border border-slate-800 shadow-2xl overflow-hidden">
          <div className="overflow-x-auto no-scrollbar">
              <table className="w-full text-sm text-left text-slate-400">
                  <thead className="text-xs text-slate-500 uppercase bg-slate-950/50 font-bold border-b border-slate-800">
                      <tr>
                          <th className="px-6 md:px-8 py-5">Identitas</th>
                          {activeTab === 'praktikan' && <th className="px-6 py-5 text-center">Kelompok</th>}
                          <th className="px-4 md:px-6 py-5 text-center">Status</th>
                          <th className="px-6 py-5 text-center">{activeTab === 'praktikan' ? 'Nilai Akhir' : 'Total Shift'}</th>
                          <th className="px-6 md:px-8 py-5 text-center">Aksi</th>
                      </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/50">
                      {filteredUsers.length === 0 ? (
                          <tr><td colSpan={5} className="text-center py-12 text-slate-600 italic">Data tidak ditemukan.</td></tr>
                      ) : filteredUsers.map(user => (
                          <tr key={user.id} className="hover:bg-slate-800/30 transition-colors group">
                              <td className="px-6 md:px-8 py-5">
                                  <div className="font-bold text-white text-sm md:text-base group-hover:text-amber-400 transition-colors line-clamp-1">{user.nama_lengkap}</div>
                                  <div className="flex flex-col md:flex-row md:items-center gap-1 md:gap-3 mt-1.5">
                                    <div className="flex gap-2 items-center">
                                        <span className="bg-slate-800 border border-slate-700 px-2 py-0.5 rounded text-[10px] md:text-xs font-mono text-slate-300">{user.nim}</span>
                                        {activeTab === 'staff' && <span className="bg-slate-800 border border-slate-700 px-2 py-0.5 rounded text-[10px] md:text-xs font-mono text-amber-400">{user.kode_asisten || 'NO-TAG'}</span>}
                                    </div>
                                    <span className="text-[10px] md:text-xs text-slate-500 uppercase truncate max-w-[150px] md:max-w-none">{user.jurusan}</span>
                                  </div>
                              </td>

                              {activeTab === 'praktikan' && (
                                <td className="px-6 py-5 text-center">
                                    <span className="font-mono font-bold text-white bg-slate-800 px-3 py-1 rounded border border-slate-700">{user.kelompok || '-'}</span>
                                </td>
                              )}

                              <td className="px-4 md:px-6 py-5 text-center">
                                  <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide border ${user.role === 'admin' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' : user.role === 'asisten' ? 'bg-purple-500/10 text-purple-400 border-purple-500/20' : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'}`}>{user.role}</span>
                              </td>

                              <td className="px-6 py-5 text-center">
                                  {activeTab === 'praktikan' ? (
                                      <div className="flex flex-col items-center justify-center">
                                          <span className={`font-black text-lg tracking-tight ${parseFloat(user.stats.final_score) >= 75 ? 'text-emerald-400' : 'text-yellow-400'}`}>{user.stats.final_score}</span>
                                          <span className="text-[10px] bg-white/10 border border-white/10 px-2 py-0.5 rounded text-slate-300 mt-1 font-mono">{getGradeChar(parseFloat(user.stats.final_score))}</span>
                                      </div>
                                  ) : (
                                      <span className="bg-slate-800 border border-slate-700 text-slate-300 px-3 py-1 rounded-full font-bold text-xs inline-flex items-center gap-1.5 whitespace-nowrap"><CalendarCheck size={12} className="text-blue-400"/> {user.stats.logs_count}</span>
                                  )}
                              </td>

                              <td className="px-6 md:px-8 py-5">
                                  <div className="flex justify-center gap-2">
                                      {activeTab === 'praktikan' && (
                                          <button onClick={() => { setSelectedUser(user); setModalType('group'); setInputVal(user.kelompok || '') }} className="p-2 bg-slate-800 hover:bg-emerald-500/20 hover:text-emerald-400 hover:border-emerald-500/30 border border-transparent rounded-xl transition-all" title="Edit Kelompok"><Users2 size={16}/></button>
                                      )}
                                      
                                      {activeTab === 'staff' && (
                                          <>
                                            <button onClick={() => { setSelectedUser(user); setModalType('code'); setInputVal(user.kode_asisten || '') }} className="p-2 bg-slate-800 hover:bg-blue-500/20 hover:text-blue-400 hover:border-blue-500/30 border border-transparent rounded-xl transition-all" title="Edit Kode Asisten"><Tag size={16}/></button>
                                            <button onClick={() => { setSelectedUser(user); setModalType('telegram'); setInputVal(user.telegram || '') }} className="p-2 bg-slate-800 hover:bg-blue-500/20 hover:text-blue-400 hover:border-blue-500/30 border border-transparent rounded-xl transition-all" title="Edit Telegram"><Send size={16}/></button>
                                          </>
                                      )}
                                      <button onClick={() => { setSelectedUser(user); setModalType('role'); setNewRole(user.role) }} className="p-2 bg-slate-800 hover:bg-purple-500/20 hover:text-purple-400 hover:border-purple-500/30 border border-transparent rounded-xl transition-all" title="Ganti Role"><UserCog size={16}/></button>
                                      <button onClick={() => { setSelectedUser(user); setModalType('password'); setInputVal('') }} className="p-2 bg-slate-800 hover:bg-amber-500/20 hover:text-amber-400 hover:border-amber-500/30 border border-transparent rounded-xl transition-all" title="Reset Password"><KeyRound size={16}/></button>
                                      <button onClick={() => handleDelete(user)} className="p-2 bg-slate-800 hover:bg-red-500/20 hover:text-red-400 hover:border-red-500/30 border border-transparent rounded-xl transition-all" title="Hapus User"><Trash2 size={16}/></button>
                                  </div>
                              </td>
                          </tr>
                      ))}
                  </tbody>
              </table>
          </div>
      </div>

      {/* --- MODALS --- */}
      {modalType && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[99] flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-slate-700 p-8 rounded-3xl w-full max-w-md shadow-2xl animate-fade-in-up">
                
                {modalType === 'group' && (
                    <>
                        <h2 className="text-xl font-bold text-white mb-2 flex items-center gap-2"><Users2 className="text-emerald-400"/> Set Kelompok</h2>
                        <p className="text-slate-400 text-sm mb-6">User: <span className="text-white font-bold">{selectedUser.nama_lengkap}</span></p>
                        <input type="text" value={inputVal} onChange={e=>setInputVal(e.target.value.toUpperCase())} placeholder="Contoh: A1-1" className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 text-white mb-4 focus:outline-none focus:border-emerald-500 uppercase font-mono tracking-widest text-center text-xl"/>
                        <div className="flex gap-3">
                            <button onClick={()=>setModalType(null)} className="flex-1 py-3 bg-slate-800 rounded-xl font-bold text-slate-400 hover:bg-slate-700">Batal</button>
                            <button onClick={handleUpdateGroup} disabled={processing} className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-500 rounded-xl font-bold text-white shadow-lg shadow-emerald-900/20">{processing ? '...' : 'Simpan'}</button>
                        </div>
                    </>
                )}

                {modalType === 'password' && (
                    <>
                        <h2 className="text-xl font-bold text-white mb-2 flex items-center gap-2"><KeyRound className="text-amber-400"/> Reset Password</h2>
                        <input type="text" value={inputVal} onChange={e=>setInputVal(e.target.value)} placeholder="Password Baru..." className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 text-white mb-4 focus:outline-none focus:border-amber-500"/>
                        <div className="flex gap-3">
                            <button onClick={()=>setModalType(null)} className="flex-1 py-3 bg-slate-800 rounded-xl font-bold text-slate-400 hover:bg-slate-700">Batal</button>
                            <button onClick={handleResetPassword} disabled={processing} className="flex-1 py-3 bg-amber-600 hover:bg-amber-500 rounded-xl font-bold text-white shadow-lg shadow-amber-900/20">{processing ? '...' : 'Reset'}</button>
                        </div>
                    </>
                )}

                {modalType === 'code' && (
                    <>
                        <h2 className="text-xl font-bold text-white mb-2 flex items-center gap-2"><Tag className="text-blue-400"/> Kode Asisten</h2>
                        <input type="text" value={inputVal} onChange={e=>setInputVal(e.target.value.toUpperCase())} placeholder="Contoh: AB" maxLength={5} className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 text-white mb-4 focus:outline-none focus:border-blue-500 uppercase font-mono tracking-widest text-center text-xl"/>
                        <div className="flex gap-3">
                            <button onClick={()=>setModalType(null)} className="flex-1 py-3 bg-slate-800 rounded-xl font-bold text-slate-400 hover:bg-slate-700">Batal</button>
                            <button onClick={handleUpdateCode} disabled={processing} className="flex-1 py-3 bg-blue-600 hover:bg-blue-500 rounded-xl font-bold text-white shadow-lg shadow-blue-900/20">{processing ? '...' : 'Simpan'}</button>
                        </div>
                    </>
                )}

                {/* MODAL TELEGRAM */}
                {modalType === 'telegram' && (
                    <>
                        <h2 className="text-xl font-bold text-white mb-2 flex items-center gap-2"><Send className="text-blue-400"/> Username Telegram</h2>
                        <p className="text-slate-400 text-sm mb-6">User: <span className="text-white font-bold">{selectedUser.nama_lengkap}</span></p>
                        <div className="relative mb-4">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 font-medium">t.me/</span>
                            <input type="text" value={inputVal} onChange={e=>setInputVal(e.target.value)} placeholder="username" className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 pl-16 text-white focus:outline-none focus:border-blue-500"/>
                        </div>
                        <div className="flex gap-3">
                            <button onClick={()=>setModalType(null)} className="flex-1 py-3 bg-slate-800 rounded-xl font-bold text-slate-400 hover:bg-slate-700">Batal</button>
                            <button onClick={handleUpdateTelegram} disabled={processing} className="flex-1 py-3 bg-blue-600 hover:bg-blue-500 rounded-xl font-bold text-white shadow-lg shadow-blue-900/20">{processing ? '...' : 'Simpan'}</button>
                        </div>
                    </>
                )}

                {modalType === 'role' && (
                    <>
                        <h2 className="text-xl font-bold text-white mb-2 flex items-center gap-2"><UserCog className="text-purple-400"/> Ganti Role</h2>
                        <div className="space-y-3 mb-6">
                            {['praktikan', 'asisten', 'admin'].map(role => (
                                <button key={role} onClick={()=>setNewRole(role)} className={`w-full p-4 rounded-xl border text-left font-bold uppercase transition-all flex justify-between ${newRole === role ? 'bg-purple-900/20 border-purple-500 text-purple-400' : 'bg-slate-950 border-slate-800 text-slate-500 hover:bg-slate-800'}`}>
                                    {role} {newRole === role && <CheckCircle size={20}/>}
                                </button>
                            ))}
                        </div>
                        <div className="flex gap-3">
                            <button onClick={()=>setModalType(null)} className="flex-1 py-3 bg-slate-800 rounded-xl font-bold text-slate-400 hover:bg-slate-700">Batal</button>
                            <button onClick={handleUpdateRole} disabled={processing} className="flex-1 py-3 bg-purple-600 hover:bg-purple-500 rounded-xl font-bold text-white shadow-lg shadow-purple-900/20">{processing ? '...' : 'Simpan'}</button>
                        </div>
                    </>
                )}
            </div>
        </div>
      )}

    </div>
  )
}