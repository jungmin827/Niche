import { useQuery } from '@tanstack/react-query';
import { getMyInterests, getInterestDetail } from '../../api/interest';
import { queryKeys } from '../../constants/queryKeys';

export function useMyInterestsQuery() {
  return useQuery({
    queryKey: queryKeys.interestList,
    queryFn: () => getMyInterests(),
  });
}

export function useInterestDetailQuery(interestId: string) {
  return useQuery({
    queryKey: queryKeys.interestDetail(interestId),
    queryFn: () => getInterestDetail(interestId),
    enabled: Boolean(interestId),
  });
}
