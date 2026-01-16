'use server'

import { createClient } from '@supabase/supabase-js'

// Inisialisasi Supabase Admin (Bypass RLS)
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)

// --- FETCH DATA ---
export async function getAdminData() {
  try {
    const { data: users, error } = await supabaseAdmin
      .from('profiles')
      .select(`
        *,
        practicum_sessions:practicum_sessions!student_id (
          modul,
          nilai_akhir,
          status
        ),
        assistant_attendance (count)
      `)
      .order('nama_lengkap', { ascending: true })

    if (error) {
      console.error("❌ Admin Fetch Error:", error)
      return { success: false, error: error.message }
    }

    const formattedUsers = users.map((u: any) => {
      const sessions = u.practicum_sessions || [];
      
      // Filter & Hitung Nilai
      const praktikumModules = sessions.filter((s: any) => {
        const status = s.status ? s.status.toLowerCase() : '';
        return s.modul !== 'Sosialisasi' && (status === 'graded' || status === 'selesai');
      });
      
      const totalScore = praktikumModules.reduce((acc: number, curr: any) => acc + (Number(curr.nilai_akhir) || 0), 0);
      
      const hasBonus = sessions.some((s: any) => {
        const status = s.status ? s.status.toLowerCase() : '';
        return s.modul === 'Sosialisasi' && (status === 'graded' || status === 'selesai');
      });
      
      let finalScore = (totalScore / 7) + (hasBonus ? 10 : 0);
      if (finalScore > 100) finalScore = 100;

      return {
        ...u,
        stats: {
          logs_count: u.assistant_attendance?.[0]?.count || 0,
          final_score: finalScore > 0 ? finalScore.toFixed(2) : "0.00"
        }
      }
    })

    return { success: true, data: formattedUsers }

  } catch (err: any) {
    return { success: false, error: err.message }
  }
}

// --- UPDATE ACTIONS ---

export async function updateAssistantCode(userId: string, newCode: string) {
  const { error } = await supabaseAdmin
    .from('profiles')
    .update({ kode_asisten: newCode.toUpperCase() })
    .eq('id', userId)

  if (error) return { success: false, message: error.message }
  return { success: true, message: `Kode Asisten berhasil diubah.` }
}

export async function updateUserRole(userId: string, newRole: string) {
  const { error } = await supabaseAdmin.from('profiles').update({ role: newRole }).eq('id', userId)
  if (error) return { success: false, message: error.message }
  return { success: true, message: `Role berhasil diubah menjadi ${newRole}` }
}

export async function resetUserPassword(userId: string, newPassword: string) {
  const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, { password: newPassword })
  if (error) return { success: false, message: error.message }
  return { success: true, message: 'Password berhasil direset!' }
}

// --- DELETE USER (FIXED MANUAL METHOD) ---
export async function deleteUser(userId: string) {
  try {
    // LANGKAH 1: Hapus Profil Publik DULUAN
    // Ini akan memicu CASCADE database untuk menghapus: Sesi, Absen, dan File milik user ini.
    // Jika profil hilang, tidak ada lagi yang mengunci Auth User.
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .delete()
      .eq('id', userId)

    if (profileError) {
      console.error("Gagal hapus profil:", profileError)
      // Kita lanjutkan saja ke Auth, siapa tahu profilnya emang udah hilang duluan
    }

    // LANGKAH 2: Hapus Akun Login (Auth)
    // Sekarang aman karena 'pengikat' (Profil) sudah dilepas.
    const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(userId)
    
    if (authError) {
      console.error("Gagal hapus Auth:", authError)
      return { success: false, message: authError.message }
    }

    return { success: true, message: 'User berhasil dihapus permanen.' }

  } catch (err: any) {
    return { success: false, message: err.message }
  }
}