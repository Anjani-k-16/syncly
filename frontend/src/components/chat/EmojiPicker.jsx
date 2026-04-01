import React, { useState, useRef, useEffect } from 'react';

const CATEGORIES = [
  { id: 'recent',   label: '🕐', name: 'Recently Used' },
  { id: 'smileys',  label: '😀', name: 'Smileys & People' },
  { id: 'gestures', label: '👋', name: 'Gestures & Body' },
  { id: 'animals',  label: '🐶', name: 'Animals & Nature' },
  { id: 'food',     label: '🍎', name: 'Food & Drink' },
  { id: 'travel',   label: '✈️', name: 'Travel & Places' },
  { id: 'objects',  label: '💡', name: 'Objects' },
  { id: 'symbols',  label: '❤️', name: 'Symbols' },
  { id: 'stickers', label: '🎭', name: 'Stickers' },
];

const EMOJIS = {
  smileys: [
    '😀','😃','😄','😁','😆','😅','🤣','😂','🙂','🙃','😉','😊','😇',
    '🥰','😍','🤩','😘','😗','😚','😙','🥲','😋','😛','😜','🤪','😝',
    '🤑','🤗','🤭','🤫','🤔','🤐','🤨','😐','😑','😶','😏','😒','🙄',
    '😬','🤥','😌','😔','😪','🤤','😴','😷','🤒','🤕','🤢','🤮','🤧',
    '🥵','🥶','🥴','😵','💫','🤯','🤠','🥳','🥸','😎','🤓','🧐','😕',
    '😟','🙁','☹️','😮','😯','😲','😳','🥺','😦','😧','😨','😰','😥',
    '😢','😭','😱','😖','😣','😞','😓','😩','😫','🥱','😤','😡','😠',
    '🤬','😈','👿','💀','☠️','💩','🤡','👹','👺','👻','👽','👾','🤖',
    '😺','😸','😹','😻','😼','😽','🙀','😿','😾',
  ],
  gestures: [
    '👋','🤚','🖐️','✋','🖖','👌','🤌','🤏','✌️','🤞','🤟','🤘','🤙',
    '👈','👉','👆','🖕','👇','☝️','👍','👎','✊','👊','🤛','🤜','👏',
    '🙌','👐','🤲','🤝','🙏','✍️','💅','🤳','💪','🦾','🦿','🦵','🦶',
    '👂','🦻','👃','🫀','🫁','🧠','🦷','🦴','👀','👁️','👅','👄','💋',
    '🫦','👶','🧒','👦','👧','🧑','👱','👨','🧔','👩','🧓','👴','👵',
    '🙍','🙎','🙅','🙆','💁','🙋','🧏','🙇','🤦','🤷',
  ],
  animals: [
    '🐶','🐱','🐭','🐹','🐰','🦊','🐻','🐼','🐨','🐯','🦁','🐮','🐷',
    '🐸','🐵','🙈','🙉','🙊','🐒','🐔','🐧','🐦','🐤','🦆','🦅','🦉',
    '🦇','🐺','🐗','🐴','🦄','🐝','🐛','🦋','🐌','🐞','🐜','🦟','🦗',
    '🕷️','🦂','🐢','🐍','🦎','🐙','🦑','🦐','🦀','🐡','🐟','🐠','🐬',
    '🐳','🐋','🦈','🦭','🐊','🐅','🐆','🦓','🦍','🐘','🦛','🦏','🐪',
    '🐫','🦒','🦘','🐃','🐂','🐄','🐎','🐖','🐏','🐑','🦙','🐐','🦌',
    '🐕','🐩','🐈','🐓','🦃','🦚','🦜','🦢','🕊️','🐇','🦝','🦨','🦡',
    '🦦','🦥','🐁','🐀','🐿️','🦔','🌵','🎄','🌲','🌳','🌴','🌱','🌿',
    '☘️','🍀','🍃','🍂','🍁','🍄','🌾','💐','🌷','🌹','🥀','🌺','🌸',
    '🌼','🌻',
  ],
  food: [
    '🍎','🍐','🍊','🍋','🍌','🍉','🍇','🍓','🫐','🍈','🍒','🍑','🥭',
    '🍍','🥥','🥝','🍅','🍆','🥑','🥦','🥬','🥒','🌶️','🫑','🧄','🧅',
    '🥔','🍠','🌰','🥜','🍞','🥐','🥖','🫓','🥨','🥯','🧀','🥚','🍳',
    '🧈','🥞','🧇','🥓','🥩','🍗','🍖','🌭','🍔','🍟','🍕','🫔','🌮',
    '🌯','🥙','🧆','🍜','🍝','🍛','🍣','🍱','🥟','🍤','🍙','🍚','🍘',
    '🍥','🥮','🍢','🧁','🍰','🎂','🍮','🍭','🍬','🍫','🍿','🍩','🍪',
    '🍯','🧃','🥤','🧋','☕','🍵','🫖','🍺','🍻','🥂','🍷','🥃','🍸',
    '🍹','🧉','🍾','🧊',
  ],
  travel: [
    '🚗','🚕','🚙','🚌','🚎','🏎️','🚓','🚑','🚒','🚐','🛻','🚚','🚛',
    '🚜','🏍️','🛵','🚲','🛴','🛹','🛼','⛽','🚧','🚨','🚥','🚦','🛑',
    '⚓','🚢','✈️','🛩️','🛫','🛬','🪂','💺','🚁','🚀','🛸','🌍','🌎',
    '🌏','🌐','🗺️','🧭','🏔️','⛰️','🌋','🗻','🏕️','🏖️','🏜️','🏝️','🏞️',
    '🏟️','🏛️','🏗️','🛖','🏘️','🏠','🏡','🏢','🏣','🏤','🏥','🏦','🏨',
    '🏩','🏪','🏫','🏬','🏭','🏯','🏰','💒','🗼','🗽','⛪','🕌','🛕',
    '🕍','⛩️','🕋','⛲','⛺','🌁','🌃','🏙️','🌄','🌅','🌆','🌇','🌉',
    '🎠','🎡','🎢','🎪',
  ],
  objects: [
    '⌚','📱','📲','💻','⌨️','🖥️','🖨️','🖱️','💽','💾','💿','📀','🧮',
    '📷','📸','📹','🎥','📽️','🎞️','📞','☎️','📟','📠','📺','📻','🧭',
    '⏱️','⏲️','⏰','🕰️','⌛','⏳','📡','🔋','🔌','💡','🔦','🕯️','🪔',
    '🧯','💰','💵','💴','💶','💷','💸','💳','🪙','💹','📈','📉','📊',
    '📋','🗒️','🗓️','📆','📅','📇','🗃️','🗄️','🗑️','📁','📂','🗂️','📓',
    '📔','📒','📕','📗','📘','📙','📚','📖','🔖','🏷️','💉','🩸','💊',
    '🩹','🩺','🔬','🔭','🪄','🎩','🎭','🎨','🎰','🎲','🧩','♟️','🎯',
    '🎳','🏹','🎣','🥊','🥋','🎽','🛹','🛷','⛸️','🥅','⛳','🎾','🥏',
  ],
  symbols: [
    '❤️','🧡','💛','💚','💙','💜','🖤','🤍','🤎','💔','❤️‍🔥','❤️‍🩹',
    '❣️','💕','💞','💓','💗','💖','💘','💝','💟','☮️','✝️','☪️','🕉️',
    '☸️','✡️','🔯','🕎','☯️','☦️','⛎','♈','♉','♊','♋','♌','♍','♎',
    '♏','♐','♑','♒','♓','🆔','⚛️','☢️','☣️','📴','📳','✴️','🆚','💮',
    '🉐','㊙️','㊗️','🈴','🈵','🈹','🈲','🅰️','🅱️','🆎','🆑','🅾️','🆘',
    '❌','⭕','🛑','⛔','📛','🚫','💯','💢','♨️','🚷','🚯','🚳','🚱',
    '🔞','📵','🔕','🔇','🔈','🔉','🔊','📢','📣','📯','🔔','🔕','🎵',
    '🎶','⚠️','🚸','🔱','⚜️','🔰','♻️','✅','❇️','✳️','❎','🌐','💠',
    '🌀','💤','🏧','♿','🅿️','🈳','🚺','🚹','🚼','🚻','🚮','🎦','📶',
    'ℹ️','🔤','🔡','🔠','🆖','🆗','🆙','🆒','🆕','🆓',
    '▶️','⏸️','⏏️','⏭️','⏮️','⏩','⏪','⏫','⏬','◀️','🔼','🔽',
    '➡️','⬅️','⬆️','⬇️','↗️','↘️','↙️','↖️','↕️','↔️','↩️','↪️',
    '⤴️','⤵️','🔀','🔁','🔂','🔃','🔄','🔙','🔚','🔛','🔜','🔝',
  ],
  stickers: [
    // Combo stickers
    '🎉🎊','✨💫','🔥💯','👑🌟','💪🏆','🙏❤️','😭💀','🤝✅',
    '🥳🎂','😴💤','🤔💭','😤⚡','🥰💕','😎🕶️','🤯💥','🎯🏹',
    '🚀⭐','🌈☀️','💎👸','🎵🎶','🏖️🌊','🍕🍔','☕📚','🎮🕹️',
    '😂💀','🫶🏼','🤌✨','💅👑','😩🙏','🥺👉👈','😤💢','🎊🥂',
    '🌸🦋','⚡🔥','🎸🎵','🏆🥇','🌙⭐','🍀🌈','🦋🌸','💫🌟',
    // Big expressive singles
    '🫶','🥹','😮‍💨','😶‍🌫️','❤️‍🔥','🫠','🥷','🫡','🤌','🫵',
    '🦋','🌸','🌺','✨','💫','⭐','🌟','💥','🎆','🎇',
    '🎈','🎁','🎀','🎗️','🏅','🥇','🏆','👑','💍','💎',
    '🌊','🔥','❄️','🌪️','⚡','🌈','🌙','☀️','🌟','💧',
    '🎭','🎨','🎬','🎤','🎧','🎹','🎸','🥁','🎺','🎻',
  ],
};

const STORAGE_KEY = 'syncly_recent_emojis';

export default function EmojiPicker({ onSelect, onClose }) {
  const [activeCategory, setActiveCategory] = useState('smileys');
  const [searchQuery, setSearchQuery] = useState('');
  const [recentEmojis, setRecentEmojis] = useState(() => {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); }
    catch { return []; }
  });
  const pickerRef = useRef(null);

  useEffect(() => {
    const handleClick = (e) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target)) onClose();
    };
    setTimeout(() => document.addEventListener('mousedown', handleClick), 100);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [onClose]);

  const handleSelect = (emoji) => {
    onSelect(emoji);
    const updated = [emoji, ...recentEmojis.filter(e => e !== emoji)].slice(0, 32);
    setRecentEmojis(updated);
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(updated)); } catch {}
  };

  const getDisplayEmojis = () => {
    if (searchQuery.trim()) {
      const all = Object.values(EMOJIS).flat();
      return [...new Set(all)];
    }
    if (activeCategory === 'recent') {
      return recentEmojis.length ? recentEmojis : EMOJIS.smileys.slice(0, 32);
    }
    return EMOJIS[activeCategory] || [];
  };

  const emojis = getDisplayEmojis();
  const isStickers = activeCategory === 'stickers' && !searchQuery;

  return (
    <div ref={pickerRef}
      className="absolute bottom-14 right-0 w-80 bg-panel border border-border rounded-2xl shadow-2xl z-50 overflow-hidden animate-fade-up"
      style={{ boxShadow: '0 20px 60px rgba(0,0,0,0.5)' }}>

      {/* Search */}
      <div className="p-3 border-b border-border">
        <input
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          placeholder="Search emojis…"
          className="w-full bg-surface border border-border rounded-xl px-3 py-2 text-sm font-body
            text-text placeholder:text-muted focus:outline-none focus:border-accent/50 transition-all"
          autoFocus
        />
      </div>

      {/* Category tabs */}
      {!searchQuery && (
        <div className="flex border-b border-border overflow-x-auto">
          {CATEGORIES.map(cat => (
            <button key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              title={cat.name}
              className={`flex-shrink-0 px-3 py-2.5 text-lg transition-all hover:bg-surface
                ${activeCategory === cat.id
                  ? 'border-b-2 border-accent bg-surface/50'
                  : 'opacity-60 hover:opacity-100'}`}>
              {cat.label}
            </button>
          ))}
        </div>
      )}

      {/* Category name */}
      {!searchQuery && (
        <div className="px-3 py-1.5 border-b border-border/50">
          <p className="text-[10px] font-display font-700 text-dim uppercase tracking-widest">
            {CATEGORIES.find(c => c.id === activeCategory)?.name}
            {activeCategory === 'stickers' && ' — Click to send combo!'}
          </p>
        </div>
      )}

      {/* Emoji / Sticker grid */}
      <div className="overflow-y-auto" style={{ height: '240px' }}>
        {emojis.length === 0 ? (
          <div className="flex items-center justify-center h-full text-dim text-sm font-body">
            No emojis found
          </div>
        ) : (
          <div className={`p-2 grid ${isStickers ? 'grid-cols-4 gap-2' : 'grid-cols-8 gap-0.5'}`}>
            {emojis.map((emoji, i) => (
              <button key={i}
                onClick={() => handleSelect(emoji)}
                className={`flex items-center justify-center rounded-xl hover:bg-surface
                  transition-all hover:scale-110 active:scale-95
                  ${isStickers
                    ? 'text-2xl p-3 aspect-square bg-surface/50 border border-border/50 hover:border-accent/30'
                    : 'text-xl p-1.5 aspect-square'}`}>
                {emoji}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-3 py-2 border-t border-border flex items-center justify-between">
        <p className="text-[10px] text-muted font-mono">{emojis.length} items</p>
        <p className="text-[10px] text-dim font-body">
          {isStickers ? '🎭 Sticker combos' : 'Click to insert'}
        </p>
      </div>
    </div>
  );
}