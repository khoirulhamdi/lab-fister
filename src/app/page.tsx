'use client'
import { useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'
import Cookies from 'js-cookie' 
import { 
  Eye, 
  EyeOff, 
  Loader2, 
  LogIn, 
  UserPlus, 
  User, 
  Lock, 
  GraduationCap, 
  AlertCircle 
} from 'lucide-react'

const JURUSAN_LIST = ['TEKNIK ELEKTRO', 'TEKNIK MESIN', 'TEKNIK INDUSTRI', 'TEKNIK KIMIA', 'TEKNIK SIPIL', 'TEKNIK METALURGI']

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true)
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  // Form Data
  const [nim, setNim] = useState('')
  const [password, setPassword] = useState('')
  const [nama, setNama] = useState('')
  const [jurusan, setJurusan] = useState(JURUSAN_LIST[0])

  const supabase = createClient()
  const router = useRouter()

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setErrorMsg('')

    const cleanNim = nim.trim().toUpperCase()
    const cleanNama = nama.toUpperCase()
    
    if (!cleanNim) {
      setErrorMsg('NIM tidak boleh kosong')
      setLoading(false)
      return
    }
    const email = `${cleanNim}@lab.com`

    try {
      if (isLogin) {
        // PROSES LOGIN
        const { data, error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error

        if (data.session) {
            // Simpan Acces Token
            Cookies.set('fister-token', data.session.access_token, { 
                expires: 30,
                path: '/',
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'lax'
            })

            Cookies.set('fister-refresh-token', data.session.refresh_token, { 
                expires: 30,
                path: '/',
                secure: process.env.NODE_ENV === 'production'
            })
        }

        window.location.href = '/dashboard'

      } else {
        // PROSES REGISTER
        const { data, error } = await supabase.auth.signUp({
          email, password,
          options: { data: { nama_lengkap: cleanNama, jurusan, nim: cleanNim } }
        })
        if (error) throw error
        if (data.user) {
          const { error: profileError } = await supabase.from('profiles').insert({ 
              id: data.user.id, nim: cleanNim, nama_lengkap: cleanNama, jurusan 
            })
          if (profileError) throw new Error(profileError.message)
          alert('Registrasi Berhasil! Silakan Login.')
          setIsLogin(true)
        }
      }
    } catch (err: any) {
      setErrorMsg(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col justify-center items-center p-4 font-sans text-slate-800 dark:text-slate-100 transition-colors">
       {/* Container Card */}
       <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-xl shadow-slate-200/50 dark:shadow-none p-8 animate-fade-in">
        
        {/* Header Section */}
        <div className="flex flex-col items-center text-center mb-8">
            <div className="w-20 h-20 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center mb-6 shadow-sm border border-slate-100 dark:border-slate-700">
                <img src="/logo-fister.png" alt="Lab Logo" className="w-19 h-19  object-contain" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
                {isLogin ? 'Selamat Datang' : 'Buat Akun Baru'}
            </h1>
            <p className="text-slate-500 dark:text-slate-400 text-sm mt-2">
                {isLogin ? 'Sistem Informasi Lab. Fisika Terapan' : ''}
            </p>
        </div>

        {/* Error Alert */}
        {errorMsg && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900/50 text-red-600 dark:text-red-400 p-4 rounded-2xl mb-6 text-sm font-medium flex items-center gap-2 animate-pulse">
            <AlertCircle size={18} /> {errorMsg}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleAuth} className="space-y-4">
          
          {/* Register Fields */}
          {!isLogin && (
            <div className="space-y-4 animate-in slide-in-from-top-2 duration-300">
                <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase ml-1 mb-1 block">Nama Lengkap</label>
                    <div className="relative">
                        <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input required className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl pl-12 pr-4 py-3.5 text-sm font-medium focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all dark:text-white placeholder-slate-400 uppercase" 
                            placeholder="NAMA LENGKAP" onChange={e => setNama(e.target.value)} />
                    </div>
                </div>
                <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase ml-1 mb-1 block">Jurusan</label>
                    <div className="relative">
                        <GraduationCap className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <select className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl pl-12 pr-8 py-3.5 text-sm font-medium appearance-none focus:outline-none focus:border-blue-500 dark:text-white"
                            onChange={e => setJurusan(e.target.value)}>
                            {JURUSAN_LIST.map(j => <option key={j} value={j}>{j}</option>)}
                        </select>
                        <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">▼</div>
                    </div>
                </div>
            </div>
          )}
          
          {/* Common Fields */}
          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase ml-1 mb-1 block">NIM (Nomor Induk Mahasiswa)</label>
            <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input required type="text" 
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl pl-12 pr-4 py-3.5 text-sm font-medium focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all dark:text-white placeholder-slate-400 uppercase tracking-wider"
                    value={nim} onChange={(e) => setNim(e.target.value)} placeholder="333..." />
            </div>
          </div>

          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase ml-1 mb-1 block">Password</label>
            <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input required type={showPassword ? "text" : "password"} 
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl pl-12 pr-12 py-3.5 text-sm font-medium focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all dark:text-white placeholder-slate-400"
                    value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors">
                    {showPassword ? <EyeOff size={18}/> : <Eye size={18}/>}
                </button>
            </div>
          </div>

          <button disabled={loading} className="w-full bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600 text-white font-bold py-3.5 rounded-full shadow-lg shadow-blue-900/20 transition-all active:scale-95 mt-6 flex justify-center items-center gap-2 text-sm">
            {loading ? <Loader2 className="animate-spin" size={20} /> : (isLogin ? <><LogIn size={20} /> Masuk</> : <><UserPlus size={20} /> Daftar Akun</>)}
          </button>
        </form>

        {/* Footer Toggle */}
        <div className="mt-8 text-center">
            <p className="text-slate-400 text-sm">
                {isLogin ? "Belum memiliki akun?" : "Sudah punya akun?"}
                <button onClick={() => { setIsLogin(!isLogin); setErrorMsg('') }} className="ml-2 font-bold text-blue-600 dark:text-blue-400 hover:underline">
                    {isLogin ? "Daftar Sekarang" : "Login Disini"}
                </button>
            </p>
        </div>
       </div>
       
       <p className="mt-8 text-xs text-slate-400 font-medium">© {new Date().getFullYear()} Lab Fister. All rights reserved.</p>
    </div>
  )
}