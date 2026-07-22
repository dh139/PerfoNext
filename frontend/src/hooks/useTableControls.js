import { useMemo, useState } from 'react';

// rows: array of source objects
// options:
//   searchFn: (row, term) => boolean — return true to keep row when term is present
//   sortAccessors: { [sortKey]: (row) => comparable } — value extractors for each sortable option
//   defaultSortKey: string
//   pageSize: number (default 10)
export const useTableControls = (rows, { searchFn, sortAccessors = {}, defaultSortKey = '', pageSize = 10 } = {}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortKey, setSortKey] = useState(defaultSortKey);
  const [sortDir, setSortDir] = useState('asc');
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    if (!searchTerm.trim() || !searchFn) return rows;
    const term = searchTerm.trim().toLowerCase();
    return rows.filter(row => searchFn(row, term));
  }, [rows, searchTerm, searchFn]);

  const sorted = useMemo(() => {
    const accessor = sortAccessors[sortKey];
    if (!accessor) return filtered;
    const copy = [...filtered];
    copy.sort((a, b) => {
      const av = accessor(a);
      const bv = accessor(b);
      if (av == null && bv == null) return 0;
      if (av == null) return 1;
      if (bv == null) return -1;
      if (typeof av === 'number' && typeof bv === 'number') {
        return sortDir === 'asc' ? av - bv : bv - av;
      }
      const cmp = String(av).localeCompare(String(bv));
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return copy;
  }, [filtered, sortAccessors, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const paginated = sorted.slice((safePage - 1) * pageSize, safePage * pageSize);

  const toggleSort = (key) => {
    if (sortKey === key) {
      setSortDir(d => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
    setPage(1);
  };

  return {
    searchTerm,
    setSearchTerm: (v) => { setSearchTerm(v); setPage(1); },
    sortKey,
    sortDir,
    toggleSort,
    page: safePage,
    setPage,
    totalPages,
    pageSize,
    totalCount: sorted.length,
    rows: paginated,
    allFilteredRows: sorted
  };
};
