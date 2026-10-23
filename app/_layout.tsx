import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Platform } from 'react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BlinkProvider, createTamagui, tamaguiDefaultConfig, Theme, BlinkToastProvider } from '@blinkdotnew/mobile-ui';
import { useFrameworkReady } from '@/hooks/useFrameworkReady';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      retry: 1,
    },
  },
});

const config = createTamagui({ ...tamaguiDefaultConfig });

function WebStyleReset() {
  if (Platform.OS !== 'web') return null;
  return (
    <style
      dangerouslySetInnerHTML={{
        __html: 'html,body,button,input,textarea,select{font-family:Inter,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}input:focus,textarea:focus{outline:none!important}',
      }}
    />
  );
}

export default function RootLayout() {
  useFrameworkReady();

  return (
    <BlinkProvider config={config} defaultTheme="light">
      <Theme name="light">
        <QueryClientProvider client={queryClient}>
          <BlinkToastProvider>
            <WebStyleReset />
            <Stack screenOptions={{ headerShown: false }}>
              <Stack.Screen name="index" />
              <Stack.Screen name="+not-found" />
            </Stack>
            <StatusBar style="dark" />
          </BlinkToastProvider>
        </QueryClientProvider>
      </Theme>
    </BlinkProvider>
  );
}
