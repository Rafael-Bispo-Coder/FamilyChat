import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase, type Group, type Profile } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

export default function Home() {
  const { user, profile, signOut } = useAuth()
  const navigate = useNavigate()
  const [groups, setGroups] = useState<Group[]>([])
  const [familyMembers, setFamilyMembers] = useState<Profile[]>([])
  const [newGroupName, setNewGroupName] = useState('')
  const [showNewGroup, setShowNewGroup] = useState(false)
  const [loadingGroups, setLoadingGroups] = useState(true)

  useEffect(() => {
    if (!user || !profile) return
    loadGroups()
    loadFamilyMembers()
  }, [user, profile])

  const loadGroups = async () => {
    setLoadingGroups(true)
    const { data } = await supabase
      .from('group_members')
      .select('group_id, groups(*)')
      .eq('user_id', user!.id)
    if (data) {
      const gs = data.map((row: { group_id: string; groups: unknown }) => row.groups as Group).filter(Boolean)
      setGroups(gs)
    }
    setLoadingGroups(false)
  }

  const loadFamilyMembers = async () => {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('family_code', profile!.family_code)
      .neq('id', user!.id)
    if (data) setFamilyMembers(data as Profile[])
  }

  const createGroup = async () => {
    if (!newGroupName.trim() || !profile) return
    const { data, error } = await supabase
      .from('groups')
      .insert({ name: newGroupName.trim(), family_code: profile.family_code, created_by: user!.id })
      .select()
      .single()
    if (!error && data) {
      await supabase.from('group_members').insert({ group_id: data.id, user_id: user!.id })
      setNewGroupName('')
      setShowNewGroup(false)
      loadGroups()
    }
  }

  const avatarUrl = profile?.avatar_url
    ? supabase.storage.from('avatars').getPublicUrl(profile.avatar_url).data.publicUrl
    : null

  return (
    <div className="flex flex-col h-screen bg-amber-50">
      {/* Header */}
      <header className="bg-amber-500 text-white px-6 py-3 flex items-center gap-4 shadow-md">
        <div className="text-2xl">🏠</div>
        <h1 className="text-xl font-bold flex-1">FamilyChat</h1>
        <div className="flex items-center gap-3">
          {avatarUrl ? (
            <img src={avatarUrl} alt="avatar" className="w-9 h-9 rounded-full object-cover border-2 border-amber-200" />
          ) : (
            <div className="w-9 h-9 rounded-full bg-amber-300 flex items-center justify-center text-amber-800 font-bold text-sm">
              {profile?.name?.[0]?.toUpperCase() ?? '?'}
            </div>
          )}
          <div className="hidden sm:block">
            <p className="font-semibold text-sm leading-tight">{profile?.name}</p>
            <p className="text-amber-100 text-xs">{profile?.role} · 👪 {profile?.family_code}</p>
          </div>
          <button
            onClick={() => navigate('/profile')}
            className="ml-2 bg-amber-400 hover:bg-amber-300 text-amber-900 text-xs font-semibold px-3 py-1.5 rounded-full transition"
          >
            Perfil
          </button>
          <button
            onClick={signOut}
            className="bg-amber-700 hover:bg-amber-800 text-white text-xs font-semibold px-3 py-1.5 rounded-full transition"
          >
            Sair
          </button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside className="w-72 bg-white border-r border-amber-100 flex flex-col overflow-y-auto shadow-sm">
          {/* Groups */}
          <div className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-amber-700 font-bold text-sm uppercase tracking-wider flex items-center gap-1">
                💬 Grupos
              </h2>
              <button
                onClick={() => setShowNewGroup(!showNewGroup)}
                className="text-amber-500 hover:text-amber-700 text-lg leading-none font-bold"
                title="Novo grupo"
              >
                +
              </button>
            </div>

            {showNewGroup && (
              <div className="mb-3 flex gap-2">
                <input
                  type="text"
                  value={newGroupName}
                  onChange={e => setNewGroupName(e.target.value)}
                  placeholder="Nome do grupo"
                  className="flex-1 border border-amber-300 rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                  onKeyDown={e => e.key === 'Enter' && createGroup()}
                />
                <button
                  onClick={createGroup}
                  className="bg-amber-500 hover:bg-amber-600 text-white text-xs px-3 py-1 rounded-lg"
                >
                  ✓
                </button>
              </div>
            )}

            {loadingGroups ? (
              <p className="text-gray-400 text-sm">Carregando…</p>
            ) : groups.length === 0 ? (
              <p className="text-gray-400 text-sm">Nenhum grupo ainda</p>
            ) : (
              <ul className="space-y-1">
                {groups.map(g => (
                  <li key={g.id}>
                    <button
                      onClick={() => navigate(`/group/${g.id}`)}
                      className="w-full text-left px-3 py-2 rounded-xl hover:bg-amber-50 text-gray-700 text-sm font-medium flex items-center gap-2 transition"
                    >
                      <span className="text-amber-400">💬</span>
                      {g.name}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <hr className="border-amber-100 mx-4" />

          {/* DMs */}
          <div className="p-4">
            <h2 className="text-amber-700 font-bold text-sm uppercase tracking-wider flex items-center gap-1 mb-3">
              💌 Família
            </h2>
            {familyMembers.length === 0 ? (
              <p className="text-gray-400 text-sm">Nenhum membro ainda</p>
            ) : (
              <ul className="space-y-1">
                {familyMembers.map(member => {
                  const memberAvatar = member.avatar_url
                    ? supabase.storage.from('avatars').getPublicUrl(member.avatar_url).data.publicUrl
                    : null
                  return (
                    <li key={member.id}>
                      <button
                        onClick={() => navigate(`/dm/${member.id}`)}
                        className="w-full text-left px-3 py-2 rounded-xl hover:bg-amber-50 flex items-center gap-2 transition"
                      >
                        {memberAvatar ? (
                          <img src={memberAvatar} alt="" className="w-7 h-7 rounded-full object-cover" />
                        ) : (
                          <div className="w-7 h-7 rounded-full bg-amber-200 flex items-center justify-center text-amber-700 text-xs font-bold">
                            {member.name[0]?.toUpperCase()}
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-gray-700 text-sm font-medium truncate">{member.name}</p>
                          <p className="text-gray-400 text-xs truncate">{member.role}</p>
                        </div>
                      </button>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        </aside>

        {/* Center welcome area */}
        <main className="flex-1 flex items-center justify-center bg-gradient-to-br from-amber-50 to-orange-50">
          <div className="text-center px-8">
            <div className="text-7xl mb-4">🏠</div>
            <h2 className="text-2xl font-bold text-amber-700 mb-2">
              Olá, {profile?.name?.split(' ')[0]}! 👋
            </h2>
            <p className="text-gray-500 max-w-sm">
              Selecione um grupo ou membro da família para começar a conversar. 💛
            </p>
          </div>
        </main>
      </div>
    </div>
  )
}
