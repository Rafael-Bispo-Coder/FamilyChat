import { useEffect, useRef, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase, type Message, type Profile } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

export default function DirectMessage() {
  const { userId } = useParams<{ userId: string }>()
  const { user, profile } = useAuth()
  const navigate = useNavigate()
  const [otherUser, setOtherUser] = useState<Profile | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!userId || !user || !profile) return
    supabase.from('profiles').select('*').eq('id', userId).single().then(({ data }) => setOtherUser(data))
    supabase.from('messages')
      .select('*, profiles(*)')
      .is('group_id', null)
      .or(`and(sender_id.eq.${user.id},receiver_id.eq.${userId}),and(sender_id.eq.${userId},receiver_id.eq.${user.id})`)
      .order('created_at')
      .then(({ data }) => { if (data) setMessages(data as Message[]) })

    const channel = supabase.channel('dm-' + [user.id, userId].sort().join('-'))
    channel.on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' },
      (payload) => {
        const msg = payload.new as Message
        if (msg.group_id !== null) return
        const mine = msg.sender_id === user.id && msg.receiver_id === userId
        const theirs = msg.sender_id === userId && msg.receiver_id === user.id
        if (!mine && !theirs) return
        supabase.from('profiles').select('*').eq('id', msg.sender_id).single().then(({ data }) => {
          setMessages(prev => [...prev, { ...msg, profiles: data ?? undefined }])
        })
      }
    ).subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [userId, user, profile])

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  const send = async () => {
    if (!input.trim() || !user || !userId) return
    await supabase.from('messages').insert({ group_id: null, sender_id: user.id, receiver_id: userId, content: input.trim() })
    setInput('')
  }

  const avatarUrl = (url: string | null) => url ? supabase.storage.from('avatars').getPublicUrl(url).data.publicUrl : null
  const otherAvatar = avatarUrl(otherUser?.avatar_url ?? null)

  return (
    <div className="flex flex-col h-screen bg-amber-50">
      <header className="bg-amber-500 text-white px-6 py-3 flex items-center gap-3 shadow">
        <button onClick={() => navigate('/')} className="text-amber-100 hover:text-white mr-1">←</button>
        {otherAvatar ? <img src={otherAvatar} className="w-9 h-9 rounded-full object-cover" /> :
          <div className="w-9 h-9 rounded-full bg-amber-300 flex items-center justify-center text-amber-800 font-bold">
            {otherUser?.name?.[0]?.toUpperCase() ?? '?'}
          </div>}
        <div>
          <p className="font-bold leading-tight">{otherUser?.name ?? '…'}</p>
          <p className="text-amber-100 text-xs">{otherUser?.role}</p>
        </div>
      </header>
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.map(msg => {
          const isMe = msg.sender_id === user?.id
          return (
            <div key={msg.id} className={`flex items-end gap-2 ${isMe ? 'flex-row-reverse' : ''}`}>
              <div className={`max-w-xs lg:max-w-md flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
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
  )
}
