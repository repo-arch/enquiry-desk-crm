import { useCallback, useEffect, useState } from 'react';
import { api } from '../api';

const MASTER_KEYS = ['internal-companies', 'categories', 'dosage-forms', 'divisions', 'sources', 'qty-units'];

export function useMasters() {
  const [data, setData] = useState({
    internalCompanies: [],
    categories: [],
    dosageForms: [],
    divisions: [],
    sources: [],
    qtyUnits: [],
    sfCodes: [],
  });
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    setLoading(true);
    const [ic, cat, df, div, src, qu, sf] = await Promise.all([
      api.get('/masters/internal-companies'),
      api.get('/masters/categories'),
      api.get('/masters/dosage-forms'),
      api.get('/masters/divisions'),
      api.get('/masters/sources'),
      api.get('/masters/qty-units'),
      api.get('/masters/sf/list'),
    ]);
    setData({
      internalCompanies: ic,
      categories: cat,
      dosageForms: df,
      divisions: div,
      sources: src,
      qtyUnits: qu,
      sfCodes: sf,
    });
    setLoading(false);
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  return { ...data, loading, reload };
}

export { MASTER_KEYS };
