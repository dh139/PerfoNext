import React, { useEffect, useState } from 'react';
import api from '../utils/api';
import useAuthStore from '../store/authStore';
import { User, Mail, Phone, Briefcase, Layers, Shield, Calendar, Lock, CheckCircle2, AlertCircle, Camera } from 'lucide-react';
import { getUserAvatarUrl } from '../utils/avatar';

const Profile = () => {
  const { updateProfile } = useAuthStore();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [mobile, setMobile] = useState('');
  const [gender, setGender] = useState('male');

  const [showPasswordFields, setShowPasswordFields] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const res = await api.get('/api/users/me');
      setProfile(res.data);
      setFirstName(res.data.firstName || '');
      setLastName(res.data.lastName || '');
      setMobile(res.data.mobile || '');
      setGender(res.data.gender || 'male');
    } catch (err) {
      console.error(err);
      setError('Failed to load profile.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (showPasswordFields && newPassword) {
      if (newPassword.length < 6) {
        setError('New password must be at least 6 characters long.');
        return;
      }
      if (newPassword !== confirmPassword) {
        setError('New password and confirmation do not match.');
        return;
      }
      if (!currentPassword) {
        setError('Please enter your current password to set a new one.');
        return;
      }
    }

    const payload = { firstName, lastName, mobile, gender };
    if (showPasswordFields && newPassword) {
      payload.currentPassword = currentPassword;
      payload.newPassword = newPassword;
    }

    try {
      setSaving(true);
      const res = await api.patch('/api/users/me', payload);
      setProfile(res.data);
      updateProfile({
        firstName: res.data.firstName,
        lastName: res.data.lastName,
        gender: res.data.gender,
        profilePhoto: res.data.profilePhoto
      });
      setSuccess('Profile updated successfully.');
      setShowPasswordFields(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update profile.');
    } finally {
      setSaving(false);
    }
  };

  const handleProfilePhotoUpload = async (e) => {
    const selectedFile = e.target.files[0];
    if (!selectedFile) return;

    const formData = new FormData();
    formData.append('file', selectedFile);

    try {
      setSaving(true);
      setError('');
      setSuccess('');
      const res = await api.patch('/api/users/me/profile-photo', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      setProfile(res.data);
      updateProfile({ profilePhoto: res.data.profilePhoto });
      setSuccess('Profile photo uploaded successfully!');
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || 'Failed to upload profile photo.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-[50vh]">
        <div className="w-8 h-8 border-4 border-sky-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
        <div className="flex items-center gap-4 mb-6">
          <div className="relative group">
            <img
              src={getUserAvatarUrl(profile)}
              alt="Avatar"
              className="w-16 h-16 rounded-full object-cover ring-2 ring-slate-100 bg-slate-50"
            />
            <label className="absolute inset-0 bg-black/40 rounded-full opacity-0 group-hover:opacity-100 flex items-center justify-center cursor-pointer transition-opacity text-white">
              <Camera size={16} />
              <input
                type="file"
                accept="image/*"
                onChange={handleProfilePhotoUpload}
                className="hidden"
              />
            </label>
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-800">{profile?.firstName} {profile?.lastName}</h3>
            <p className="text-xs text-slate-500 font-mono">{profile?.employeeCode}</p>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-center gap-2">
            <AlertCircle size={16} className="text-rose-500 shrink-0" />
            <span>{error}</span>
          </div>
        )}
        {success && (
          <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-700 text-xs flex items-center gap-2">
            <CheckCircle2 size={16} className="text-emerald-500 shrink-0" />
            <span>{success}</span>
          </div>
        )}

        {/* Read-only organizational info */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8 pb-8 border-b border-slate-100">
          <div className="flex items-center gap-2 text-xs text-slate-600">
            <Mail size={14} className="text-slate-400" />
            <span>{profile?.email}</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-600">
            <Briefcase size={14} className="text-slate-400" />
            <span>{profile?.departmentId?.departmentName || '—'}</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-600">
            <Layers size={14} className="text-slate-400" />
            <span>{profile?.designationId?.designationName || '—'}</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-600">
            <Shield size={14} className="text-slate-400" />
            <span className="capitalize">{profile?.role}</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-600">
            <Calendar size={14} className="text-slate-400" />
            <span>Joined {profile?.joiningDate ? new Date(profile.joiningDate).toLocaleDateString() : '—'}</span>
          </div>
          {profile?.managerId && (
            <div className="flex items-center gap-2 text-xs text-slate-600">
              <User size={14} className="text-slate-400" />
              <span>Reports to {profile.managerId.firstName} {profile.managerId.lastName}</span>
            </div>
          )}
        </div>

        <form onSubmit={handleSave} className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-semibold text-slate-500 tracking-wide uppercase">First Name</label>
              <input
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 focus:border-sky-500 text-slate-800 px-3.5 py-2.5 rounded-xl text-xs outline-none transition-all"
                required
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-semibold text-slate-500 tracking-wide uppercase">Last Name</label>
              <input
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 focus:border-sky-500 text-slate-800 px-3.5 py-2.5 rounded-xl text-xs outline-none transition-all"
                required
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-semibold text-slate-500 tracking-wide uppercase">Mobile Number</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400">
                  <Phone size={14} />
                </span>
                <input
                  type="text"
                  value={mobile}
                  onChange={(e) => setMobile(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 focus:border-sky-500 text-slate-800 pl-10 pr-4 py-2.5 rounded-xl text-xs outline-none transition-all"
                  required
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-semibold text-slate-500 tracking-wide uppercase">Gender (Avatar Preference)</label>
              <select
                value={gender}
                onChange={(e) => setGender(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 focus:border-sky-500 text-slate-800 px-3.5 py-2.5 rounded-xl text-xs outline-none transition-all cursor-pointer font-medium"
                required
              >
                <option value="male">Male</option>
                <option value="female">Female</option>
              </select>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100">
            {!showPasswordFields ? (
              <button
                type="button"
                onClick={() => setShowPasswordFields(true)}
                className="flex items-center gap-2 text-xs font-semibold text-sky-700 hover:text-sky-800 cursor-pointer"
              >
                <Lock size={14} />
                Change Password
              </button>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-700 flex items-center gap-2">
                    <Lock size={14} />
                    Change Password
                  </h4>
                  <button
                    type="button"
                    onClick={() => {
                      setShowPasswordFields(false);
                      setCurrentPassword('');
                      setNewPassword('');
                      setConfirmPassword('');
                    }}
                    className="text-[11px] text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-semibold text-slate-500 tracking-wide uppercase">Current Password</label>
                    <input
                      type="password"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 focus:border-sky-500 text-slate-800 px-3.5 py-2.5 rounded-xl text-xs outline-none transition-all"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-semibold text-slate-500 tracking-wide uppercase">New Password</label>
                    <input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Min 6 characters"
                      className="w-full bg-slate-50 border border-slate-200 focus:border-sky-500 text-slate-800 px-3.5 py-2.5 rounded-xl text-xs outline-none transition-all"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-semibold text-slate-500 tracking-wide uppercase">Confirm New Password</label>
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 focus:border-sky-500 text-slate-800 px-3.5 py-2.5 rounded-xl text-xs outline-none transition-all"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={saving}
            className="bg-sky-700 hover:bg-sky-600 disabled:bg-slate-300 text-white font-semibold py-2.5 px-6 rounded-xl text-xs transition-all shadow-sm cursor-pointer"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Profile;
