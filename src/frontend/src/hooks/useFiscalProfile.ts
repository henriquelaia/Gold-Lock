import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fiscalProfileApi } from '../services/api';
import { toast } from '../store/toastStore';

export function useFiscalProfile() {
  return useQuery({
    queryKey: ['fiscal-profile'],
    queryFn: () => fiscalProfileApi.get().then(r => r.data.data),
  });
}

export function useUpsertFiscalProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => fiscalProfileApi.upsert(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['fiscal-profile'] });
      qc.invalidateQueries({ queryKey: ['irs'] });
      toast.success('Perfil fiscal guardado');
    },
    onError: () => toast.error('Erro ao guardar perfil fiscal'),
  });
}
