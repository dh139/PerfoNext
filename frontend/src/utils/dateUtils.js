/**
 * Utility to format dates strictly as DD/MM/YYYY across PerfoNext
 */
export const formatDateDDMMYYYY = (dateInput) => {
  if (!dateInput) return 'N/A';
  
  // Handle YYYY-MM-DD string from input type="date"
  if (typeof dateInput === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateInput)) {
    const [y, m, d] = dateInput.split('-');
    return `${d}/${m}/${y}`;
  }

  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return 'N/A';
  
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
};

export default formatDateDDMMYYYY;
