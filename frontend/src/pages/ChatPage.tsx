import React, { useEffect, useState, useRef } from 'react';
import axios from 'axios';
import NProgress from 'nprogress';
import { getChatSocket } from '../api/chatSocket';
import { useAuth } from '../context/AuthContext';
import { Helmet } from 'react-helmet-async';
import '../styles/ChatPage.css';

<Helmet>
  <title>Chat | DevOpsNotes</title>
  <meta name="robots" content="noindex, nofollow" />
</Helmet>

const ChatPage: React.FC = () => {
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [inputValue, setInputValue] = useState('');
  const [activeRoom, setActiveRoom] = useState('Général');
  const [rooms] = useState(['Général', 'Salon DevOps | DevSecOps', 'Relax']);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  const socket = getChatSocket();
  const { user } = useAuth();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const R2_PUBLIC_URL = "https://resources.devopsnotes.org";
  const commonEmojis = ['😊', '😂', '🚀', '🔥', '💻', '👍', '🙌', '🤔', '✅', '❌'];

  useEffect(() => {
    socket.emit('chat:join', activeRoom);

    const fetchHistory = async () => {
      NProgress.start();
      setLoading(true);
      try {
        const res = await axios.get(`/api/chat/messages?room=${activeRoom}`, {
          withCredentials: true
        });
        setMessages(res.data);
      } catch (err) {
        console.error("Erreur historique:", err);
      } finally {
        // Délai de 300ms pour l'onctuosité
        await new Promise(resolve => setTimeout(resolve, 300));
        setLoading(false);
        NProgress.done();
      }
    };
    fetchHistory();

    const handleNewMessage = (msg: any) => {
      if (msg.room === activeRoom) {
        setMessages((prev) => [...prev, msg]);
      }
    };

    socket.on('chat:message', handleNewMessage);
    return () => { socket.off('chat:message', handleNewMessage); };
  }, [activeRoom, socket]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = () => {
    if (!inputValue.trim()) return;
    socket.emit('chat:message', { room: activeRoom, text: inputValue });
    setInputValue('');
    setShowEmojiPicker(false);
  };

  const addEmoji = (emoji: string) => {
    setInputValue(prev => prev + emoji);
    setShowEmojiPicker(false);
  };

  const handleRoomChange = (room: string) => {
    setActiveRoom(room);
    setIsSidebarOpen(false);
  };

  return (
    <div className="chat-page-wrapper page-transition">
      <button className="mobile-room-toggle" onClick={() => setIsSidebarOpen(!isSidebarOpen)}>
        {isSidebarOpen ? '✕ Fermer' : '# Salons'}
      </button>

      <aside className={`chat-sidebar ${isSidebarOpen ? 'open' : ''}`}>
        <button className="back-btn" onClick={() => window.history.back()}>← Retour</button>
        <h3>Salons</h3>
        {rooms.map(room => (
          <button 
            key={room}
            className={`room-item ${activeRoom === room ? 'active' : ''}`}
            onClick={() => handleRoomChange(room)}
          >
            # {room}
          </button>
        ))}
      </aside>

      <main className="chat-main">
        <header className="chat-main-header">
          <h2>#{activeRoom}</h2>
          <span className="message-time-full">Connecté en tant que {user?.pseudo || 'Invité'}</span>
        </header>

        <div className="chat-messages-container">
          {loading ? (
            <div className="chat-empty">Chargement de l'historique...</div>
          ) : (
            <>
              {messages.length === 0 && <div className="chat-empty">Aucun message dans ce salon...</div>}
              {messages.map((m, idx) => {
                const avatarPath = m.fromAvatar;
                const fullAvatarUrl = avatarPath && avatarPath.startsWith('http') 
                  ? avatarPath 
                  : avatarPath 
                    ? `${R2_PUBLIC_URL}/${avatarPath}` 
                    : '/default-avatar.png';

                return (
                  <div key={idx} className={`message-row ${m.fromPseudo === user?.pseudo ? 'is-me' : ''}`}>
                    <img 
                      src={fullAvatarUrl} 
                      alt="avatar" 
                      className="message-avatar-img" 
                      onError={(e) => {(e.target as HTMLImageElement).src = '/default-avatar.png'}}
                    />
                    <div className="message-content">
                      <div className="message-info">
                        <span className="message-author">{m.fromPseudo}</span>
                        <span className="message-time-full">
                          {new Date(m.at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                        </span>
                      </div>
                      <div className="message-text">
                        {m.text.startsWith('http') && m.text.match(/\.(jpeg|jpg|gif|png|webp)$/i) ? (
                          <img src={m.text} alt="upload" className="chat-inline-img" style={{ maxWidth: '100%', borderRadius: '8px', marginTop: '5px' }} />
                        ) : (
                          m.text
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </>
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="chat-input-wrapper">
          {showEmojiPicker && (
            <div className="emoji-picker-popup">
              {commonEmojis.map(emoji => (
                <span key={emoji} onClick={() => addEmoji(emoji)} style={{ cursor: 'pointer' }}>{emoji}</span>
              ))}
            </div>
          )}
          <div className="chat-input-area">
            <input 
              type="text" 
              placeholder={`Envoyer un message dans #${activeRoom}`}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            />
            <button className="send-btn" onClick={handleSend}>Envoyer</button>
          </div>
        </div>
      </main>
    </div>
  );
};

export default ChatPage;