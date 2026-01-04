'use client'
import { useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'

export default function AuthPage() {
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

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setErrorMsg('')

    // FIX LOGIC EMAIL:
    // 1. Hapus spasi jika ada (trim)
    // 2. Gunakan domain yang lebih umum (.com) agar lolos validasi regex Supabase
    const cleanNim = nim.trim()
    if (!cleanNim) {
      setErrorMsg('NIM tidak boleh kosong')
      setLoading(false)
      return
    }
    
    const email = `${cleanNim}@lab.com` 

    try {
      if (isLogin) {
        // --- LOGIKA LOGIN ---
        const { error } = await supabase.auth.signInWithPassword({ 
          email: email, 
          password: password 
        })
        if (error) throw error
        router.push('/dashboard')

      } else {
        // --- LOGIKA REGISTER ---
        const { data, error } = await supabase.auth.signUp({
          email: email,
          password: password,
          options: {
            // Data metadata ini opsional tapi bagus disimpan di auth user juga
            data: { nama_lengkap: nama, jurusan: jurusan, nim: cleanNim } 
          }
        })

        if (error) throw error

        if (data.user) {
          // Manual Insert ke tabel profiles
          const { error: profileError } = await supabase
            .from('profiles')
            .insert({ 
              id: data.user.id, 
              nim: cleanNim, 
              nama_lengkap: nama, 
              jurusan: jurusan 
            })
          
          if (profileError) {
             // Jika gagal buat profile, tampilkan error spesifik
             throw new Error('Gagal menyimpan data diri: ' + profileError.message)
          }

          alert('Register berhasil! Silakan login.')
          setIsLogin(true)
        }
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Terjadi kesalahan')
    } finally {
      setLoading(false)
    }
  }

  return (
    // CONTAINER UTAMA: Background Gelap (Slate-900)
    <div className="min-h-screen flex items-center justify-center bg-slate-900 p-4">
      
      {/* CARD: Background Sedikit Lebih Terang (Slate-800) + Border */}
      <div className="bg-slate-800 border border-slate-700 p-8 rounded-lg shadow-xl w-full max-w-md text-white">
        
        <h1 className="text-2xl font-bold mb-2 text-center text-blue-400">
          {isLogin ? 'Login Lab' : 'Daftar Praktikan'}
        </h1>
        <p className="text-center text-slate-400 text-sm mb-6">
          Sistem Informasi Laboratorium
        </p>

        {/* Tampilkan Error jika ada */}
        {errorMsg && (
          <div className="bg-red-500/10 border border-red-500 text-red-400 p-3 rounded mb-4 text-sm text-center">
            {errorMsg}
          </div>
        )}
        
        <form onSubmit={handleAuth} className="space-y-4">
          {!isLogin && (
            <>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Nama Lengkap</label>
                <input required 
                  className="w-full bg-slate-700 border border-slate-600 rounded p-2 text-white focus:outline-none focus:border-blue-500" 
                  placeholder="Contoh: Hamdi"
                  onChange={e => setNama(e.target.value)} />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Jurusan</label>
                <input required 
                  className="w-full bg-slate-700 border border-slate-600 rounded p-2 text-white focus:outline-none focus:border-blue-500" 
                  placeholder="Contoh: Teknik Elektro"
                  onChange={e => setJurusan(e.target.value)} />
              </div>
            </>
          )}
          
          <div>
            <label className="block text-xs text-slate-400 mb-1">NIM</label>
            <input required 
              type="text"
              className="w-full bg-slate-700 border border-slate-600 rounded p-2 text-white focus:outline-none focus:border-blue-500" 
              placeholder="Masukkan NIM"
              value={nim}
              onChange={e => setNim(e.target.value)} />
          </div>

          <div>
            <label className="block text-xs text-slate-400 mb-1">Password</label>
            <input required 
              type="password" 
              className="w-full bg-slate-700 border border-slate-600 rounded p-2 text-white focus:outline-none focus:border-blue-500" 
              placeholder="••••••••"
              onChange={e => setPassword(e.target.value)} />
          </div>

          <button disabled={loading} 
            className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-2 rounded transition-all disabled:opacity-50">
            {loading ? 'Memproses...' : (isLogin ? 'Masuk' : 'Daftar')}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-400">
          {isLogin ? "Belum punya akun? " : "Sudah punya akun? "}
          <span onClick={() => { setIsLogin(!isLogin); setErrorMsg('') }} 
            className="text-blue-400 hover:text-blue-300 cursor-pointer font-semibold select-none">
            {isLogin ? 'Daftar disini' : 'Login disini'}
          </span>
        </p>
      </div>
    </div>
  )
}