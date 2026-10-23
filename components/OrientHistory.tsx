import { Pressable } from 'react-native';
import { Clock3, MessageCircle, Plus, Sparkles, YStack, XStack, ScrollView, SizableText, Button } from '@blinkdotnew/mobile-ui';
import type { OrientChat } from '@/lib/orient-chat';

const C = { surface: '#FFFEFA', ink: '#292722', muted: '#77736B', quiet: '#A8A197', line: '#E8E2D8', rust: '#C96D43', rustLight: '#F5E6DC' };

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const today = new Date();
  if (date.toDateString() === today.toDateString()) return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

export function OrientHistory({ chats, loading, error, onOpen, onNew }: {
  chats: OrientChat[]; loading: boolean; error: string; onOpen: (chat: OrientChat) => void; onNew: () => void;
}) {
  return <YStack flex={1} width="100%" maxWidth={820} alignSelf="center" paddingHorizontal="$4" paddingVertical="$5" gap="$4">
    <XStack alignItems="center" justifyContent="space-between">
      <YStack gap="$1"><SizableText color={C.ink} size="$7" fontWeight="700">Your conversations</SizableText><SizableText color={C.muted} size="$3">Pick up where you left off.</SizableText></YStack>
      <Button height={44} borderRadius="$4" backgroundColor={C.rust} color="#FFFFFF" icon={<Plus size={17} color="#FFFFFF" />} onPress={onNew}>New chat</Button>
    </XStack>
    {error ? <SizableText color="#A84232" size="$3">{error}</SizableText> : null}
    {loading ? <SizableText color={C.muted} size="$3">Loading conversations…</SizableText> : chats.length === 0 ? <YStack flex={1} minHeight={260} alignItems="center" justifyContent="center" gap="$3"><XStack width={56} height={56} borderRadius={28} backgroundColor={C.rustLight} alignItems="center" justifyContent="center"><MessageCircle size={24} color={C.rust} /></XStack><SizableText color={C.ink} size="$5" fontWeight="700">No conversations yet</SizableText><SizableText color={C.muted} size="$3" textAlign="center">Your chats will appear here after your first message.</SizableText></YStack> : <ScrollView flex={1} contentContainerStyle={{ gap: 8, paddingBottom: 24 }}>
      {chats.map((chat) => <Pressable key={chat.id} onPress={() => onOpen(chat)} style={({ pressed }) => ({ minHeight: 64, flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 14, borderWidth: 1, borderColor: pressed ? '#E7C5B2' : C.line, paddingHorizontal: 14, paddingVertical: 10, backgroundColor: pressed ? C.rustLight : C.surface })}>
        <XStack width={36} height={36} borderRadius={18} backgroundColor={chat.mode === 'image' ? '#EAF0E6' : C.rustLight} alignItems="center" justifyContent="center">{chat.mode === 'image' ? <Sparkles size={16} color="#60745A" /> : <MessageCircle size={16} color={C.rust} />}</XStack>
        <YStack flex={1} gap="$1"><SizableText color={C.ink} size="$4" fontWeight="600" numberOfLines={1}>{chat.title}</SizableText><SizableText color={C.muted} size="$2">{chat.mode === 'image' ? 'Image studio' : 'Chat'}</SizableText></YStack>
        <XStack alignItems="center" gap="$1"><Clock3 size={13} color={C.quiet} /><SizableText color={C.quiet} size="$2">{formatDate(chat.updatedAt)}</SizableText></XStack>
      </Pressable>)}
    </ScrollView>}
  </YStack>;
}
