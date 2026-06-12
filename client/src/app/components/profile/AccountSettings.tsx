import { useState } from 'react';
import { useNavigate } from 'react-router';
import { Eye, EyeOff, KeyRound, Loader2, Trash2, UserPen } from 'lucide-react';
import { useApp } from '../../contexts/AppContext';
import { authService } from '../../services/authService';

interface AccountSettingsProps {
  isDark: boolean;
}

/** Username, password and account-deletion forms for the /profile page. */
export function AccountSettings({ isDark }: AccountSettingsProps) {
  const { t, user, setUser } = useApp();
  const navigate = useNavigate();

  const [username, setUsername] = useState(user?.username ?? '');
  const [profileMsg, setProfileMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [savingProfile, setSavingProfile] = useState(false);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showPasswords, setShowPasswords] = useState(false);
  const [passwordMsg, setPasswordMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [savingPassword, setSavingPassword] = useState(false);

  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  const saveProfile = async () => {
    setSavingProfile(true);
    setProfileMsg(null);
    const res = await authService.updateProfile(username.trim());
    if (res.success && res.user) {
      setUser(res.user);
      authService.setUser(res.user);
      setProfileMsg({ ok: true, text: t.profileUpdated });
    } else {
      setProfileMsg({ ok: false, text: res.error || 'Update failed' });
    }
    setSavingProfile(false);
  };

  const savePassword = async () => {
    setSavingPassword(true);
    setPasswordMsg(null);
    const res = await authService.changePassword(currentPassword, newPassword);
    if (res.success) {
      setPasswordMsg({ ok: true, text: t.passwordChanged });
      setCurrentPassword('');
      setNewPassword('');
    } else {
      setPasswordMsg({ ok: false, text: res.error || 'Change failed' });
    }
    setSavingPassword(false);
  };

  const deleteAccount = async () => {
    setDeleting(true);
    setDeleteError('');
    const res = await authService.deleteAccount();
    if (res.success) {
      authService.logout();
      setUser(null);
      navigate('/');
    } else {
      setDeleteError(res.error || 'Delete failed');
      setDeleting(false);
    }
  };

  const panel = `rounded-2xl border p-5 ${isDark ? 'bg-slate-900/70 border-slate-800' : 'bg-white border-slate-200'}`;
  const heading = `font-poppins text-sm font-semibold mb-4 flex items-center gap-2 ${isDark ? 'text-slate-200' : 'text-gray-800'}`;
  const inputClass = `w-full px-4 py-2.5 rounded-xl border text-sm transition ${
    isDark
      ? 'bg-slate-800 border-slate-700 text-slate-100 placeholder-slate-500 focus:border-cyan-500'
      : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400 focus:border-cyan-500'
  } focus:outline-none`;
  const labelClass = `block text-xs font-medium mb-1.5 ${isDark ? 'text-slate-400' : 'text-gray-500'}`;
  const primaryBtn =
    'inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-pink-500 text-white text-sm font-semibold hover:from-cyan-600 hover:to-pink-600 transition-all disabled:opacity-50';
  const msgClass = (ok: boolean) => `mt-2 text-xs ${ok ? 'text-emerald-500' : 'text-rose-500'}`;

  return (
    <div className="space-y-4">
      {/* Username */}
      <div className={panel}>
        <h3 className={heading}><UserPen size={14} className="text-cyan-500" />{t.editProfile}</h3>
        <label className={labelClass}>{t.usernameLabel}</label>
        <div className="flex gap-2">
          <input value={username} onChange={(e) => setUsername(e.target.value)} className={inputClass} maxLength={30} />
          <button
            onClick={saveProfile}
            disabled={savingProfile || username.trim().length < 3 || username.trim() === user?.username}
            className={primaryBtn}
          >
            {savingProfile && <Loader2 size={14} className="animate-spin" />}
            {t.saveChanges}
          </button>
        </div>
        {profileMsg && <p className={msgClass(profileMsg.ok)}>{profileMsg.text}</p>}
      </div>

      {/* Password */}
      <div className={panel}>
        <h3 className={heading}><KeyRound size={14} className="text-cyan-500" />{t.changePassword}</h3>
        <div className="space-y-3">
          <div>
            <label className={labelClass}>{t.currentPassword}</label>
            <input
              type={showPasswords ? 'text' : 'password'}
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className={inputClass}
              autoComplete="current-password"
            />
          </div>
          <div>
            <label className={labelClass}>{t.newPassword}</label>
            <div className="relative">
              <input
                type={showPasswords ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className={inputClass}
                autoComplete="new-password"
              />
              <button
                type="button"
                onClick={() => setShowPasswords((p) => !p)}
                aria-label={showPasswords ? t.hidePassword : t.showPassword}
                title={showPasswords ? t.hidePassword : t.showPassword}
                className={`absolute right-3 top-1/2 -translate-y-1/2 ${isDark ? 'text-slate-400 hover:text-slate-200' : 'text-gray-400 hover:text-gray-600'}`}
              >
                {showPasswords ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>
          <button
            onClick={savePassword}
            disabled={savingPassword || !currentPassword || newPassword.length < 8}
            className={primaryBtn}
          >
            {savingPassword && <Loader2 size={14} className="animate-spin" />}
            {t.changePassword}
          </button>
          {passwordMsg && <p className={msgClass(passwordMsg.ok)}>{passwordMsg.text}</p>}
        </div>
      </div>

      {/* Danger zone */}
      <div className={`rounded-2xl border p-5 ${isDark ? 'bg-red-950/20 border-red-900/40' : 'bg-red-50/60 border-red-200'}`}>
        <h3 className={`font-poppins text-sm font-semibold mb-2 flex items-center gap-2 ${isDark ? 'text-red-300' : 'text-red-700'}`}>
          <Trash2 size={14} />{t.deleteAccount}
        </h3>
        <p className={`text-xs mb-3 ${isDark ? 'text-red-300/80' : 'text-red-600/90'}`}>{t.deleteAccountWarning}</p>
        {!confirmingDelete ? (
          <button
            onClick={() => setConfirmingDelete(true)}
            className={`px-4 py-2 rounded-xl text-sm font-semibold border transition-colors ${
              isDark
                ? 'text-red-300 border-red-700/60 hover:bg-red-900/30'
                : 'text-red-700 border-red-300 hover:bg-red-100'
            }`}
          >
            {t.deleteAccount}
          </button>
        ) : (
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={deleteAccount}
              disabled={deleting}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold bg-rose-600 text-white hover:bg-rose-700 transition-colors disabled:opacity-50"
            >
              {deleting && <Loader2 size={14} className="animate-spin" />}
              {t.confirmDelete}
            </button>
            <button
              onClick={() => setConfirmingDelete(false)}
              disabled={deleting}
              className={`px-4 py-2 rounded-xl text-sm font-medium ${isDark ? 'text-slate-300 hover:bg-slate-800' : 'text-gray-600 hover:bg-gray-100'}`}
            >
              {t.cancel}
            </button>
          </div>
        )}
        {deleteError && <p className="mt-2 text-xs text-rose-500">{deleteError}</p>}
      </div>
    </div>
  );
}
