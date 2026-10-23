import * as WebBrowser from 'expo-web-browser'
import * as Linking from 'expo-linking'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { createClient, AsyncStorageAdapter } from '@blinkdotnew/sdk'

export const blink = createClient({
  projectId: process.env.EXPO_PUBLIC_BLINK_PROJECT_ID || 'orient-ai-mobile-ouq1gugr',
  publishableKey: process.env.EXPO_PUBLIC_BLINK_PUBLISHABLE_KEY || 'blnk_pk_CqZ4oilghEPupwa-Hlm4q9JFX39SHHeQ',
  authRequired: false,
  auth: { mode: 'headless', webBrowser: WebBrowser, linking: Linking },
  storage: new AsyncStorageAdapter(AsyncStorage),
})
