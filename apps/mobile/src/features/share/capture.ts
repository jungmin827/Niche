import { RefObject } from 'react';
import { captureRef } from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';

export async function captureTemplate(ref: RefObject<unknown>) {
  return captureRef(ref, {
    format: 'png',
    quality: 1,
  });
}

export async function shareCapturedTemplate(ref: RefObject<unknown>) {
  const uri = await captureTemplate(ref);
  const isAvailable = await Sharing.isAvailableAsync();

  if (isAvailable) {
    await Sharing.shareAsync(uri);
  }

  return uri;
}
