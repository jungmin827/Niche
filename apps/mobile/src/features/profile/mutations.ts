import { useMutation } from '@tanstack/react-query';
import { updateMyProfile, UpdateProfileInput } from '../../api/profile';

export function useUpdateProfileMutation() {
  return useMutation({
    mutationFn: (input: UpdateProfileInput) => updateMyProfile(input),
  });
}
