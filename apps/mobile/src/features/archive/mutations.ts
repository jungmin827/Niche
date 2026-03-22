import { useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../../constants/queryKeys';
import { updateMyProfile, uploadAvatar, UpdateProfileInput } from '../../api/profile';

export function useUpdateProfileMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateProfileInput) => updateMyProfile(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.archiveMe });
    },
  });
}

export function useUploadAvatarMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (localUri: string) => {
      const path = await uploadAvatar(localUri);
      await updateMyProfile({ avatarPath: path });
      return path;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.archiveMe });
    },
  });
}
