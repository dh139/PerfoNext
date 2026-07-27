export const getUserAvatarUrl = (u) => {
  if (u?.profilePhoto) {
    return `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}${u.profilePhoto}`;
  }
  if (u?.gender === 'female') {
    return 'https://avatar.iran.liara.run/public/girl';
  }
  return 'https://avatar.iran.liara.run/public/boy';
};
