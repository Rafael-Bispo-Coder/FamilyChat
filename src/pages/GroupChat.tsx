import { useEffect, useRef, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase, type Message, type GroupMember, type Group } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

export default function GroupChat() {
  const { groupId } = useParams<{ groupId: string }>()
  const { user, profile } = useAuth()
  const navigate = useNavigate()
  const [group, setGroup] = useState<Group | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [members, setMembers] = useState<GroupMember[]>([])
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set())
  const [input, setInput] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!groupId || !user || !profile) return
    supabase.from('groups').select('*').eq('id', groupId).single().then(({ data }) => setGroup(data))
    supabase.from('group_members').select('*, profiles(*)').eq('group_id', groupId).then(({ data }) => {
      if (data) setMembers(data as GroupMember[])
    })
    supabase.from('messages').select('*, profiles(*)').eq('group_id', groupId).order('created_at').then(({ data }) => {
      if (data) setMessages(data as Message[])
    })

    const channel = supabase.channel('group-' + groupId)
    channel.on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: 'group_id=eq.' + groupId },
      (payload) => {
        const msg = payload.new as Message
        supabase.from('profiles').select('*').eq('id', msg.sender_id).single().then(({ data }) => {
          setMessages(prev => [...prev, { ...msg, profiles: data ?? undefined }])
        })
      }
    )
    channel.on('presence', { event: 'sync' }, () => {
      const state = channel.presenceState<{ user_id: string }>()
      const ids = new Set(Object.values(state).flat().map(p => p.user_id))
      setOnlineUsers(ids)
    })
    channel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        await channel.track({ user_id: user.id })
      }
    })
    return () => { supabase.removeChannel(channel) }
  }, [groupId, user, profile])

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  const send = async () => {
    if (!input.trim() || !groupId || !user) return
    await supabase.from('messages').insert({ group_id: groupId, sender_id: user.id, content: input.trim(), receiver_id: null })
    setInput('')
  }

  const avatarUrl = (url: string | null) => url ? supabase.storage.from('avatars').getPublicUrl(url).data.publicUrl : null

  return (
    <div className="flex h-screen bg-amber-50">
      <div className="flex flex-col flex-1 overflow-hidden">
        <header className="bg-amber-500 text-white px-6 py-3 flex items-center gap-3 shadow">
          <button onClick={() => navigate('/')} className="text-amber-100 hover:text-white mr-1">←</button>
          <span className="text-xl">💬</span>
          <h1 className="font-bold text-lg flex-1">{group?.name ?? 'Grupo'}</h1>
        </header>
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {messages.map(msg => {
            const isMe = msg.sender_id === user?.id
            const av = avatarUrl(msg.profiles?.avatar_url ?? null)
            return (
              <div key={msg.id} className={`flex items-end gap-2 ${isMe ? 'flex-row-reverse' : ''}`}>
                {av ? <img src={av} className="w-8 h-8 rounded-full object-cover flex-shrink-0" /> :
                  <div className="w-8 h-8 rounded-full bg-amber-200 flex items-center justify-center text-xs font-bold text-amber-700 flex-shrink-0">
                    {msg.profiles?.name?.[0]?.toUpperCase() ?? '?'}
                  </div>}
                <div className={`max-w-xs lg:max-w-md ${isMe ? 'items-end' : 'items-start'} flex flex-col`}>
                  {!isMe && <span className="text-xs text-gray-500 mb-1">{msg.profiles?.name} · {msg.profiles?.role}</span>}
                  <div className={`px-4 py-2 rounded-2xl text-sm ${isMe ? 'bg-amber-500 text-white rounded-br-sm' : 'bg-white text-gray-800 rounded-bl-sm shadow-sm'}`}>
                    {msg.content}
                  </div>
                  <span className="text-xs text-gray-400 mt-1">{new Date(msg.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
              </div>
            )
          })}
          <div ref={bottomRef} />
        </div>
        <div className="bg-white border-t border-amber-100 px-4 py-3 flex gap-3">
          <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && send()}
            placeholder="Digite uma mensagem…"
            className="flex-1 border border-amber-200 rounded-full px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400" />
          <button onClick={send} className="bg-amber-500 hover:bg-amber-600 text-white px-5 py-2 rounded-full text-sm font-semibold transition">Enviar</button>
        </div>
      </div>
      <aside className="w-56 bg-white border-l border-amber-100 p-4 overflow-y-auto">
        <h3 className="text-amber-700 font-bold text-xs uppercase tracking-wider mb-3">👥 Membros</h3>
        <ul className="space-y-2">
          {members.map(m => {
            const av = avatarUrl(m.profiles?.avatar_url ?? null)
            const online = onlineUsers.has(m.user_id)
            return (
              <li key={m.id} className="flex items-center gap-2">
                <div className="relative flex-shrink-0">
                  {av ? <img src={av} className="w-8 h-8 rounded-full object-cover" /> :
                    <div className="w-8 h-8 rounded-full bg-amber-200 flex items-center justify-center text-xs font-bold text-amber-700">
                      {m.profiles?.name?.[0]?.toUpperCase() ?? '?'}
                    </div>}
                  <span className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-white ${online ? 'bg-green-400' : 'bg-gray-300'}`} />
                </div>
                <div className="min-w-0">
                  <p className="text-sm text-gray-700 font-medium truncate">{m.profiles?.name}</p>
                  <p className="text-xs text-gray-400 truncate">{online ? '🟢 online' : '⚪ ausente'}</p>
                </div>
              </li>
            )
          })}
        </ul>
      </aside>
    </div>
  )
}
