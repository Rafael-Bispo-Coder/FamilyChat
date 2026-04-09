import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

export default function ProfileEdit() {
  const { user, profile, refreshProfile } = useAuth()
  const navigate = useNavigate()
  const [name, setName] = useState(profile?.name ?? '')
  const [role, setRole] = useState(profile?.role ?? '')
  const [familyCode, setFamilyCode] = useState(profile?.family_code ?? '')
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (profile) {
      setName(profile.name)
      setRole(profile.role)
      setFamilyCode(profile.family_code)
    }
  }, [profile])

  const currentAvatarUrl = profile?.avatar_url
    ? supabase.storage.from('avatars').getPublicUrl(profile.avatar_url).data.publicUrl
    : null

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null
    setAvatarFile(file)
    if (file) setAvatarPreview(URL.createObjectURL(file))
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return
    setSaving(true)
    setMessage('')
    let avatar_url = profile?.avatar_url ?? null

    if (avatarFile) {
      const ext = avatarFile.name.split('.').pop()
      const path = `${user.id}.${ext}`
      const { error: upErr } = await supabase.storage.from('avatars').upload(path, avatarFile, { upsert: true })
      if (!upErr) avatar_url = path
    }

    const { error } = await supabase.from('profiles').upsert({ id: user.id, name, role, family_code: familyCode, avatar_url })
    if (error) {
      setMessage('Erro ao salvar: ' + error.message)
    } else {
      await refreshProfile()
      setMessage('Perfil atualizado com sucesso! ✅')
    }
    setSaving(false)
  }

  const displayAvatar = avatarPreview ?? currentAvatarUrl

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-amber-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-xl p-8 w-full max-w-md">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => navigate('/')} className="text-amber-500 hover:text-amber-700 text-sm">← Voltar</button>
          <h1 className="text-2xl font-bold text-amber-700 flex-1 text-center">Editar Perfil 👤</h1>
        </div>

        <div className="flex flex-col items-center mb-6">
          <div className="relative cursor-pointer" onClick={() => fileRef.current?.click()}>
            {displayAvatar ? (
              <img src={displayAvatar} alt="avatar" className="w-24 h-24 rounded-full object-cover border-4 border-amber-200" />
            ) : (
              <div className="w-24 h-24 rounded-full bg-amber-100 flex items-center justify-center text-3xl border-4 border-amber-200">
                {name?.[0]?.toUpperCase() ?? '👤'}
              </div>
            )}
            <div className="absolute bottom-0 right-0 bg-amber-500 text-white rounded-full w-7 h-7 flex items-center justify-center text-sm shadow">✏️</div>
          </div>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
          <p className="text-xs text-gray-400 mt-2">Clique para alterar foto</p>
        </div>

        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nome</label>
            <input type="text" value={name} onChange={e => setName(e.target.value)} required
              className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-amber-400" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Papel na família</label>
            <input type="text" value={role} onChange={e => setRole(e.target.value)} placeholder="Ex: Mãe, Pai, Filho…"
              className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-amber-400" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Código da família 👪</label>
            <input type="text" value={familyCode} onChange={e => setFamilyCode(e.target.value)} required
              className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-amber-400" />
          </div>

          {message && (
            <p className={`text-sm rounded-lg p-3 ${message.startsWith('Erro') ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-700'}`}>{message}</p>
          )}

          <button type="submit" disabled={saving}
            className="w-full bg-amber-500 hover:bg-amber-600 text-white font-semibold py-3 rounded-xl transition disabled:opacity-50">
            {saving ? 'Salvando…' : 'Salvar alterações'}
          </button>
        </form>
      </div>
    </div>
  )
}
