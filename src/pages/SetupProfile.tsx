import { useState, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { useNavigate } from 'react-router-dom'

const ROLES = ['Pai', 'Mãe', 'Filho', 'Filha', 'Vovô', 'Vovó', 'Tio', 'Tia', 'Outro']

export default function SetupProfile() {
  const { user, refreshProfile } = useAuth()
  const navigate = useNavigate()
  const fileRef = useRef<HTMLInputElement>(null)

  const [name, setName] = useState('')
  const [role, setRole] = useState('')
  const [familyCode, setFamilyCode] = useState('')
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setAvatarFile(file)
      setAvatarPreview(URL.createObjectURL(file))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return
    if (!name.trim() || !role || !familyCode.trim()) {
      setError('Por favor, preencha todos os campos.')
      return
    }
    setLoading(true)
    setError('')

    let avatarUrl: string | null = null

    if (avatarFile) {
      const ext = avatarFile.name.split('.').pop()
      const filePath = `${user.id}.${ext}`
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, avatarFile, { upsert: true })
      if (uploadError) {
        setError('Erro ao enviar foto: ' + uploadError.message)
        setLoading(false)
        return
      }
      const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(filePath)
      avatarUrl = urlData.publicUrl
    }

    const { error: upsertError } = await supabase.from('profiles').upsert({
      id: user.id,
      name: name.trim(),
      role,
      family_code: familyCode.trim().toUpperCase(),
      avatar_url: avatarUrl,
    })

    if (upsertError) {
      setError('Erro ao salvar perfil: ' + upsertError.message)
      setLoading(false)
      return
    }

    await refreshProfile()
    navigate('/')
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-amber-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-xl p-8 w-full max-w-md">
        <div className="text-center mb-6">
          <div className="text-5xl mb-3">✨</div>
          <h1 className="text-2xl font-bold text-amber-700">Configure seu Perfil</h1>
          <p className="text-gray-500 mt-1 text-sm">Conte um pouco sobre você na família 💛</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex flex-col items-center gap-2">
            <div
              className="w-20 h-20 rounded-full bg-amber-100 flex items-center justify-center overflow-hidden cursor-pointer border-4 border-amber-300 hover:border-amber-500 transition"
              onClick={() => fileRef.current?.click()}
            >
              {avatarPreview ? (
                <img src={avatarPreview} className="w-full h-full object-cover" alt="Avatar" />
              ) : (
                <span className="text-3xl">😊</span>
              )}
            </div>
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="text-amber-600 text-sm font-medium hover:underline"
            >
              {avatarPreview ? 'Trocar foto' : 'Adicionar foto'}
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              onChange={handleAvatarChange}
              className="hidden"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Seu nome</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              required
              className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-amber-400"
              placeholder="Como você quer ser chamado(a)?"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Papel na família</label>
            <select
              value={role}
              onChange={e => setRole(e.target.value)}
              required
              className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white"
            >
              <option value="">Selecione…</option>
              {ROLES.map(r => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Código familiar</label>
            <input
              type="text"
              value={familyCode}
              onChange={e => setFamilyCode(e.target.value.toUpperCase())}
              required
              className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-amber-400 uppercase"
              placeholder="Ex: SILVA2024"
            />
            <p className="text-xs text-gray-400 mt-1">Peça o código ao administrador da família, ou crie um novo.</p>
          </div>

          {error && (
            <p className="text-red-500 text-sm bg-red-50 rounded-lg p-3">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-amber-500 hover:bg-amber-600 text-white font-semibold py-3 rounded-xl transition disabled:opacity-50"
          >
            {loading ? 'Salvando…' : 'Continuar 🏠'}
          </button>
        </form>
      </div>
    </div>
  )
}
