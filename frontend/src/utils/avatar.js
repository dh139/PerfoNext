export const DEFAULT_MALE_AVATAR = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128"><rect width="128" height="128" rx="64" fill="%232563EB"/><circle cx="64" cy="48" r="22" fill="%23FED7AA"/><path d="M42 38c0-12 10-20 22-20s22 8 22 20c0 3-3 5-6 4s-6-5-16-5-13 4-16 5-6-1-6-4z" fill="%231E293B"/><path d="M56 68h16v10H56z" fill="%23FDBA74"/><path d="M26 112c3-24 18-38 38-38s35 14 38 38" fill="%231E3A8A"/><path d="M54 78l10 18 10-18" fill="%23FFFFFF"/></svg>`;

export const DEFAULT_FEMALE_AVATAR = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128"><rect width="128" height="128" rx="64" fill="%23DB2777"/><path d="M38 52c-4-16 6-32 26-32s30 16 26 32c-3 2-4 0-4-3 0-11-9-19-22-19s-22 8-22 19c0 3-1 5-4 3z" fill="%23334155"/><path d="M38 50c-5 13-8 28-5 38 1 5 5 2 6-3 2-8 3-20 7-26" fill="%23334155"/><path d="M90 50c5 13 8 28 5 38-1 5-5 2-6-3-2-8-3-20-7-26" fill="%23334155"/><circle cx="64" cy="50" r="22" fill="%23FED7AA"/><path d="M56 70h16v10H56z" fill="%23FDBA74"/><path d="M28 114c3-22 18-34 36-34s33 12 36 34" fill="%23831843"/></svg>`;

export const getUserAvatarUrl = (u) => {
  if (u?.profilePhoto) {
    if (u.profilePhoto.startsWith('http://') || u.profilePhoto.startsWith('https://') || u.profilePhoto.startsWith('data:')) {
      return u.profilePhoto;
    }
    return `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}${u.profilePhoto}`;
  }
  if (u?.gender === 'female') {
    return DEFAULT_FEMALE_AVATAR;
  }
  return DEFAULT_MALE_AVATAR;
};
