'use client'
import { useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'
import Image from 'next/image' 

// 👇 MASUKKAN LINK SUPABASE BUCKET KAMU DISINI
const LOGO_URL = "/fister-logo.jpg"

export default function AuthPage() {
  // --- STATE ---
  const [isLogin, setIsLogin] = useState(true)
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  // Form Data
  const [nim, setNim] = useState('')
  const [password, setPassword] = useState('')
  const [nama, setNama] = useState('')
  const [jurusan, setJurusan] = useState('')

  const supabase = createClient()
  const router = useRouter()

  // --- LOGIC AUTH (NIM SYSTEM) ---
  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setErrorMsg('')

    // 1. Bersihkan NIM & Buat Email Palsu
    const cleanNim = nim.trim()
    if (!cleanNim) {
      setErrorMsg('NIM tidak boleh kosong')
      setLoading(false)
      return
    }
    const email = `${cleanNim}@lab.com` // Hack biar NIM bisa masuk sistem Auth Email

    try {
      if (isLogin) {
        // --- LOGIC LOGIN ---
        const { error } = await supabase.auth.signInWithPassword({ 
          email: email, 
          password: password 
        })
        if (error) throw error
        router.push('/dashboard')

      } else {
        // --- LOGIC REGISTER ---
        const { data, error } = await supabase.auth.signUp({
          email: email,
          password: password,
          options: {
            data: { nama_lengkap: nama, jurusan: jurusan, nim: cleanNim } 
          }
        })

        if (error) throw error

        if (data.user) {
          // Masukkan ke tabel profiles manual
          const { error: profileError } = await supabase
            .from('profiles')
            .insert({ 
              id: data.user.id, 
              nim: cleanNim, 
              nama_lengkap: nama, 
              jurusan: jurusan 
            })
          
          if (profileError) throw new Error('Gagal simpan profil: ' + profileError.message)

          alert('Register berhasil! Silakan login.')
          setIsLogin(true) // Balik ke mode login
        }
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Terjadi kesalahan sistem')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col justify-center items-center p-4 relative overflow-hidden font-sans">
      
      {/* Background Effect (Hiasan Blobs) */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0">
        <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-blue-600/20 rounded-full blur-[100px]"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-emerald-600/10 rounded-full blur-[100px]"></div>
      </div>

      {/* Main Card */}
      <div className="bg-slate-800/80 backdrop-blur-md border border-slate-700 p-8 rounded-2xl shadow-2xl w-full max-w-md z-10 transition-all">
        
        {/* LOGO & TITLE SECTION */}
        <div className="flex flex-col items-center mb-6">
            <div className="w-24 h-24 bg-slate-900 rounded-full flex items-center justify-center border-4 border-slate-700 shadow-lg mb-4 overflow-hidden relative">
                <Image 
                    src={LOGO_URL} 
                    alt="Logo Lab" 
                    fill 
                    className="object-cover"
                    sizes="(max-width: 768px) 100vw"
                    priority 
                />
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight">
                {isLogin ? 'Login' : 'Registrasi'}
            </h1>
            <p className="text-slate-400 text-sm mt-1">Sistem Informasi Lab Fisika Terapan</p>
        </div>

        {/* ERROR ALERT */}
        {errorMsg && (
          <div className="bg-red-500/10 border border-red-500/50 text-red-400 p-3 rounded-lg mb-6 text-sm text-center animate-pulse">
            ⚠️ {errorMsg}
          </div>
        )}

        {/* FORM */}
        <form onSubmit={handleAuth} className="space-y-4">
          
          {/* Field Khusus Register */}
          {!isLogin && (
            <div className="grid grid-cols-2 gap-3 animate-fade-in-down">
                <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase mb-1 ml-1">Nama</label>
                    <input required className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2.5 text-sm text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all placeholder:text-slate-600" 
                        placeholder="Nama Lengkap" onChange={e => setNama(e.target.value)} />
                </div>
                <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase mb-1 ml-1">Jurusan</label>
                    <input required className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2.5 text-sm text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all placeholder:text-slate-600" 
                        placeholder="Teknik..." onChange={e => setJurusan(e.target.value)} />
                </div>
            </div>
          )}
          
          {/* Field NIM (Login & Register) */}
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase mb-1 ml-1">NIM</label>
            <input 
              type="text" 
              placeholder="3332XXXXX" 
              className="w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all placeholder:text-slate-600 tracking-wider"
              value={nim}
              onChange={(e) => setNim(e.target.value)}
              required
            />
          </div>

          {/* Field Password */}
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase mb-1 ml-1">Password</label>
            <input 
              type="password" 
              placeholder="••••••••" 
              className="w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all placeholder:text-slate-600"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          {/* Submit Button */}
          <button 
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3.5 rounded-lg shadow-lg shadow-blue-500/20 transition-all transform hover:scale-[1.02] active:scale-[0.98] mt-2"
          >
            {loading ? (
                <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                    Memproses...
                </span>
            ) : (isLogin ? 'Masuk' : 'Daftar')}
          </button>
        </form>

        {/* Toggle Login/Register */}
        <div className="mt-6 text-center pt-4 border-t border-slate-700">
            <p className="text-sm text-slate-400">
                {isLogin ? "Belum punya akun? " : "Sudah punya akun? "}
                <span 
                    onClick={() => { setIsLogin(!isLogin); setErrorMsg('') }} 
                    className="text-blue-400 hover:text-blue-300 cursor-pointer font-bold select-none hover:underline"
                >
                    {isLogin ? 'Daftar disini' : 'Login disini'}
                </span>
            </p>
        </div>

      </div>
    </div>
  )
}