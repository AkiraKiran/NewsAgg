import { useRef, useState } from 'react';
import { Camera, Loader2 } from 'lucide-react';
import { useApp } from '../../contexts/AppContext';
import { authService } from '../../services/authService';

interface AvatarEditorProps {
  isDark: boolean;
}

/** Avatar upload: downscale to a 96×96 cover-cropped webp data-URL (a few KB,
 * well under the server's 100k-char cap) and persist it server-side so the
 * photo follows the account across browsers. */
export function AvatarEditor({ isDark }: AvatarEditorProps) {
  const { t, user, setUser, avatarSrc } = useApp();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  const upload = async (dataUrl: string) => {
    setSaving(true);
    setError('');
    setSaved(false);
    const res = await authService.updateAvatar(dataUrl);
    if (res.success) {
      if (user) {
        const next = { ...user, avatar: res.avatar ?? dataUrl };
        setUser(next);
        authService.setUser(next);
      }
      setSaved(true);
    } else {
      setError(res.error || 'Upload failed');
    }
    setSaving(false);
  };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError('');
    const file = e.target.files?.[0];
    e.target.value = ''; // allow re-selecting the same file later
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setError(t.avatarInvalid);
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const size = 96;
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        const scale = Math.max(size / img.width, size / img.height);
        const w = img.width * scale;
        const h = img.height * scale;
        ctx.drawImage(img, (size - w) / 2, (size - h) / 2, w, h);
        upload(canvas.toDataURL('image/webp', 0.85));
      };
      img.onerror = () => setError(t.avatarInvalid);
      img.src = String(reader.result);
    };
    reader.onerror = () => setError(t.avatarInvalid);
    reader.readAsDataURL(file);
  };

  return (
    <div>
      <div className="relative w-24 h-24">
        <div className={`w-full h-full rounded-2xl overflow-hidden ring-4 ${isDark ? 'ring-slate-900' : 'ring-white'}`}>
          <img src={avatarSrc} alt={user?.username || ''} className="w-full h-full object-cover bg-gradient-to-br from-cyan-400 to-pink-400" />
        </div>
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={saving}
          aria-label={t.changePhoto}
          title={t.changePhoto}
          className={`absolute -bottom-1 -right-1 w-8 h-8 rounded-full flex items-center justify-center shadow-md ring-2 transition-colors disabled:opacity-60 ${
            isDark ? 'bg-cyan-500 text-white ring-slate-900 hover:bg-cyan-400' : 'bg-cyan-500 text-white ring-white hover:bg-cyan-600'
          }`}
        >
          {saving ? <Loader2 size={14} className="animate-spin" /> : <Camera size={14} />}
        </button>
        <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFile} className="hidden" />
      </div>
      {error && <p className="mt-2 text-xs text-rose-500">{error}</p>}
      {saved && !error && <p className="mt-2 text-xs text-emerald-500">{t.avatarUpdated}</p>}
    </div>
  );
}
