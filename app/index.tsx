import { useEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, TextInput } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { Image as ExpoImage } from 'expo-image';
import * as Haptics from 'expo-haptics';
import {
  ArrowUp, FileText, History, ImagePlus, Loader2, LogOut,
  MessageCircle, Plus, Sparkles, X, YStack, XStack, ScrollView, SizableText, Button,
} from '@blinkdotnew/mobile-ui';
import { blink } from '@/lib/blink';
import { OrientHistory } from '@/components/OrientHistory';
import { createChat, listChats, loadChatMessages, saveChatMessage, type OrientChat } from '@/lib/orient-chat';

const C = {
  paper: '#F7F4EE', surface: '#FFFEFA', ink: '#292722', muted: '#77736B',
  quiet: '#A8A197', line: '#E8E2D8', rust: '#C96D43', rustLight: '#F5E6DC',
  moss: '#60745A', error: '#A84232', white: '#FFFFFF',
};
const SYSTEM_PROMPT = `You are Orient Âî, a thoughtful multimodal AI companion created by Hassnain Akhtar. Help users think, write, learn, plan, code, and understand images or documents. Be clear, warm, precise, and honest about uncertainty. Use headings and concise lists when they improve readability. Never claim to have performed actions outside this conversation.`;
type ChatMessage = { id: string; role: 'user' | 'assistant'; text: string; imageUrl?: string; generatedUrl?: string; fileName?: string };
type Attachment = { uri: string; name: string; mimeType?: string; kind: 'image' | 'file'; url?: string };

function ActionButton({ label, onPress, children }: { label: string; onPress: () => void; children: React.ReactNode }) {
  return <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={({ pressed }) => ({ width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center', backgroundColor: pressed ? C.rustLight : C.surface, borderWidth: 1, borderColor: C.line, opacity: pressed ? 0.78 : 1 })}>{children}</Pressable>;
}

function errorText(error: unknown) {
  return error instanceof Error ? error.message : 'Something went wrong. Please try again.';
}

async function uploadAttachment(file: Attachment) {
  const response = await fetch(file.uri);
  const blob = await response.blob();
  const mimeType = file.mimeType || blob.type || 'application/octet-stream';
  const uploadable = new File([blob], file.name, { type: mimeType });
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const folder = file.kind === 'image' ? 'orient-images' : 'orient-files';
  const result = await blink.storage.upload(uploadable, `${folder}/${Date.now()}-${safeName}`);
  return result.publicUrl;
}

export default function Home() {
  const [user, setUser] = useState<{ id: string; email?: string } | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [signUp, setSignUp] = useState(false);
  const [authError, setAuthError] = useState('');
  const [authBusy, setAuthBusy] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [attachment, setAttachment] = useState<Attachment | null>(null);
  const [showAttachmentMenu, setShowAttachmentMenu] = useState(false);
  const [mode, setMode] = useState<'chat' | 'image'>('chat');
  const [busy, setBusy] = useState(false);
  const [liveText, setLiveText] = useState('');
  const [error, setError] = useState('');
  const [chats, setChats] = useState<OrientChat[]>([]);
  const [historyVisible, setHistoryVisible] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState('');
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [answerSize, setAnswerSize] = useState<'concise' | 'balanced' | 'detailed'>('balanced');
  const scrollRef = useRef<any>(null);

  useEffect(() => blink.auth.onAuthStateChanged((state) => {
    setUser(state.user ? { id: state.user.id, email: state.user.email } : null);
    if (!state.isLoading) setAuthLoading(false);
  }), []);

  useEffect(() => {
    if (!user?.id) { setChats([]); return; }
    setHistoryLoading(true);
    listChats(user.id).then(setChats).catch((e) => setHistoryError(errorText(e))).finally(() => setHistoryLoading(false));
  }, [user?.id]);

  const signIn = async () => {
    setAuthError(''); setAuthBusy(true);
    try {
      if (signUp) await blink.auth.signUp({ email: email.trim(), password });
      else await blink.auth.signInWithEmail(email.trim(), password);
    } catch (e) { setAuthError(errorText(e)); }
    finally { setAuthBusy(false); }
  };

  const pickPhoto = async () => {
    setShowAttachmentMenu(false);
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.9 });
    if (result.canceled || !result.assets[0]) return;
    const asset = result.assets[0];
    try {
      setBusy(true); setError('');
      const next: Attachment = { uri: asset.uri, name: asset.fileName || `photo-${Date.now()}.${asset.mimeType?.split('/')[1] || 'jpg'}`, mimeType: asset.mimeType || 'image/jpeg', kind: 'image' };
      next.url = await uploadAttachment(next);
      setAttachment(next);
    } catch (e) { setError(errorText(e)); }
    finally { setBusy(false); }
  };

  const pickFile = async () => {
    setShowAttachmentMenu(false);
    const result = await DocumentPicker.getDocumentAsync({ type: '*/*', copyToCacheDirectory: true, multiple: false });
    if (result.canceled || !result.assets[0]) return;
    const asset = result.assets[0];
    try {
      setBusy(true); setError('');
      const next: Attachment = { uri: asset.uri, name: asset.name, mimeType: asset.mimeType, kind: 'file' };
      next.url = await uploadAttachment(next);
      setAttachment(next);
    } catch (e) { setError(errorText(e)); }
    finally { setBusy(false); }
  };

  const send = async (suggestion?: string, requestedMode?: 'chat' | 'image') => {
    const text = (suggestion ?? draft).trim();
    if ((!text && !attachment) || busy) return;
    const file = attachment;
    const account = user;
    if (!account) return;
    const activeMode = requestedMode || mode;
    if (requestedMode) setMode(requestedMode);
    setDraft(''); setAttachment(null); setBusy(true); setError(''); setLiveText('');
    const userText = text || (file?.kind === 'image' ? 'Please analyze this image and tell me what you notice.' : `Please read and analyze the attached file: ${file?.name}`);
    let prompt = userText;
    try {
      if (file?.kind === 'file' && file.url) {
        const extracted = await blink.data.extractFromUrl(file.url);
        prompt += `\n\nDocument: ${file.name}\n\nExtracted content:\n${Array.isArray(extracted) ? extracted.join('\n') : extracted}`;
      }
      const userMessage: ChatMessage = { id: `${Date.now()}-u`, role: 'user', text: userText, imageUrl: file?.kind === 'image' ? file.url : undefined, fileName: file?.kind === 'file' ? file.name : undefined };
      let chatId = activeChatId;
      if (!chatId) {
        const created = await createChat(account.id, userText, activeMode);
        chatId = created.id;
        setActiveChatId(chatId);
        setChats((prev) => [created, ...prev.filter((chat) => chat.id !== created.id)]);
      }
      await saveChatMessage(account.id, chatId, { role: 'user', content: userText, imageUrl: userMessage.imageUrl || null, generatedUrl: null, fileName: userMessage.fileName || null }, activeMode);
      setMessages((prev) => [...prev, userMessage]);
      if (activeMode === 'image') {
        const result = file?.kind === 'image' && file.url
          ? await blink.ai.modifyImage({ images: [file.url], prompt: prompt || 'Create a refined variation of this image.' })
          : await blink.ai.generateImage({ prompt: `${prompt}. Create a polished, high-quality image with thoughtful composition and clean detail.` });
        const generatedUrl = result.data?.[0]?.url;
        if (!generatedUrl) throw new Error('The image service returned no image. Please try another prompt.');
        const assistantText = file?.kind === 'image' ? 'Here is your edited image.' : 'Here is the image you asked for.';
        await saveChatMessage(account.id, chatId, { role: 'assistant', content: assistantText, imageUrl: null, generatedUrl, fileName: null }, activeMode);
        setMessages((prev) => [...prev, { id: `${Date.now()}-a`, role: 'assistant', text: assistantText, generatedUrl }]);
      } else {
        const history = messages.map((item) => item.role === 'user' && item.imageUrl
          ? { role: 'user' as const, content: [{ type: 'text' as const, text: item.text }, { type: 'image' as const, image: item.imageUrl }] }
          : { role: item.role, content: item.text });
        const currentContent = file?.kind === 'image' && file.url
          ? [{ type: 'text' as const, text: prompt }, { type: 'image' as const, image: file.url }]
          : prompt;
        let responseText = '';
        const lengthInstruction = answerSize === 'concise' ? 'Keep answers short and direct, usually a few sentences.' : answerSize === 'detailed' ? 'Give a thorough, well-structured answer with useful examples and clear sections when appropriate.' : 'Give a balanced answer: explain the key points clearly without unnecessary length.';
        await blink.ai.streamText(
          { messages: [{ role: 'system', content: `${SYSTEM_PROMPT}\n\nResponse length preference: ${lengthInstruction}` }, ...history, { role: 'user', content: currentContent }] },
          (chunk) => { responseText += chunk; setLiveText(responseText); },
        );
        const answer = responseText || 'I could not generate a response. Please try again.';
        await saveChatMessage(account.id, chatId, { role: 'assistant', content: answer, imageUrl: null, generatedUrl: null, fileName: null }, activeMode);
        setMessages((prev) => [...prev, { id: `${Date.now()}-a`, role: 'assistant', text: answer }]);
      }
      const refreshedChats = await listChats(account.id);
      setChats(refreshedChats);
      if (Platform.OS !== 'web') await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e) {
      setError(errorText(e));
      if (Platform.OS !== 'web') await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally { setBusy(false); setLiveText(''); }
  };

  const newChat = () => { setActiveChatId(null); setMessages([]); setError(''); setDraft(''); setAttachment(null); setMode('chat'); setHistoryVisible(false); };

  const openChat = async (chat: OrientChat) => {
    if (!user) return;
    setHistoryLoading(true); setHistoryError('');
    try {
      const rows = await loadChatMessages(user.id, chat.id);
      setActiveChatId(chat.id);
      setMode(chat.mode === 'image' ? 'image' : 'chat');
      setMessages(rows.map((row) => ({ id: row.id, role: row.role === 'assistant' ? 'assistant' as const : 'user' as const, text: row.content, imageUrl: row.imageUrl || undefined, generatedUrl: row.generatedUrl || undefined, fileName: row.fileName || undefined })));
      setHistoryVisible(false);
    } catch (e) { setHistoryError(errorText(e)); }
    finally { setHistoryLoading(false); }
  };

  if (authLoading) return <YStack flex={1} backgroundColor={C.paper} alignItems="center" justifyContent="center"><SizableText color={C.muted}>Opening your workspace…</SizableText></YStack>;

  if (!user) return (
    <YStack flex={1} backgroundColor={C.paper} alignItems="center" justifyContent="center" padding="$5">
      <YStack width="100%" maxWidth={420} backgroundColor={C.surface} borderRadius="$6" padding="$6" gap="$4" borderWidth={1} borderColor={C.line}>
        <XStack width={48} height={48} borderRadius={24} backgroundColor={C.rustLight} alignItems="center" justifyContent="center"><Sparkles size={22} color={C.rust} /></XStack>
        <YStack gap="$2"><SizableText color={C.ink} size="$8" fontWeight="700" letterSpacing={-1}>Orient Âî</SizableText><SizableText color={C.muted} size="$4">A thoughtful space for ideas, images, and the questions in between.</SizableText></YStack>
        <YStack gap="$3">
          <TextInput value={email} onChangeText={setEmail} placeholder="Email address" placeholderTextColor={C.quiet} keyboardType="email-address" autoCapitalize="none" style={{ minHeight: 52, borderRadius: 14, borderWidth: 1, borderColor: C.line, backgroundColor: C.surface, paddingHorizontal: 16, color: C.ink, fontSize: 16, outlineStyle: 'none' as any }} />
          <TextInput value={password} onChangeText={setPassword} placeholder="Password" placeholderTextColor={C.quiet} secureTextEntry style={{ minHeight: 52, borderRadius: 14, borderWidth: 1, borderColor: C.line, backgroundColor: C.surface, paddingHorizontal: 16, color: C.ink, fontSize: 16, outlineStyle: 'none' as any }} />
          {authError ? <SizableText color={C.error} size="$3">{authError}</SizableText> : null}
          <Button height={52} borderRadius="$4" backgroundColor={C.rust} color={C.white} onPress={signIn} disabled={authBusy || !email || !password}>{authBusy ? 'Please wait…' : signUp ? 'Create account' : 'Sign in'}</Button>
          <Pressable onPress={() => { setSignUp(!signUp); setAuthError(''); }} style={{ minHeight: 44, alignItems: 'center', justifyContent: 'center' }}><SizableText color={C.muted}>{signUp ? 'Already have an account? ' : 'New to Orient Âî? '}<SizableText color={C.rust} fontWeight="700">{signUp ? 'Sign in' : 'Create an account'}</SizableText></SizableText></Pressable>
        </YStack>
        <SizableText color={C.quiet} size="$2" textAlign="center">Your account keeps access to the AI workspace secure.</SizableText>
      </YStack>
    </YStack>
  );

  return (
    <YStack flex={1} backgroundColor={C.paper}>
      <XStack height={66} paddingHorizontal="$4" alignItems="center" justifyContent="space-between" borderBottomWidth={1} borderBottomColor={C.line} backgroundColor={C.surface}>
        <XStack alignItems="center" gap="$3"><XStack width={34} height={34} borderRadius={17} backgroundColor={C.rustLight} alignItems="center" justifyContent="center"><Sparkles size={17} color={C.rust} /></XStack><YStack><SizableText color={C.ink} fontWeight="700" size="$5">Orient Âî</SizableText><SizableText color={C.muted} size="$2">by Hassnain Akhtar</SizableText></YStack></XStack>
        <XStack alignItems="center" gap="$2"><Pressable accessibilityRole="button" accessibilityLabel="Chat history" onPress={() => { setHistoryVisible(!historyVisible); setHistoryError(''); }} style={({ pressed }) => ({ width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: pressed || historyVisible ? C.rustLight : C.surface })}><History size={19} color={historyVisible ? C.rust : C.muted} /></Pressable><Button size="$3" height={42} borderRadius="$4" backgroundColor={C.surface} borderColor={C.line} borderWidth={1} color={C.ink} icon={<Plus size={16} color={C.ink} />} onPress={newChat}>New chat</Button><Pressable accessibilityLabel="Sign out" onPress={() => blink.auth.signOut()} style={{ width: 42, height: 42, alignItems: 'center', justifyContent: 'center' }}><LogOut size={18} color={C.muted} /></Pressable></XStack>
      </XStack>
      {historyVisible ? <OrientHistory chats={chats} loading={historyLoading} error={historyError} onOpen={openChat} onNew={newChat} /> : <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView ref={scrollRef} flex={1} contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 20, paddingVertical: 26 }} onContentSizeChange={() => scrollRef.current?.scrollToEnd?.({ animated: true })}>
          <YStack width="100%" maxWidth={760} alignSelf="center" flex={1} gap="$5">
            {messages.length === 0 ? <YStack flex={1} minHeight={340} justifyContent="center" gap="$5">
              <YStack gap="$2"><SizableText color={C.rust} size="$3" fontWeight="700" letterSpacing={1.2}>YOUR CREATIVE THINKING PARTNER</SizableText><SizableText color={C.ink} size="$9" fontWeight="700" letterSpacing={-1.5} lineHeight={48}>What would you like{ '\n' }to explore today?</SizableText><SizableText color={C.muted} size="$4" maxWidth={460}>Ask a question, bring a document, or turn an idea into an image.</SizableText></YStack>
              <XStack flexWrap="wrap" gap="$2">{['Help me find a fresh perspective', 'Explain a complex idea simply', 'Create a calm, cinematic landscape'].map((item) => <Pressable key={item} onPress={() => { const isImagePrompt = item.startsWith('Create'); send(item, isImagePrompt ? 'image' : 'chat'); }} style={({ pressed }) => ({ borderWidth: 1, borderColor: C.line, borderRadius: 16, backgroundColor: pressed ? C.rustLight : C.surface, paddingHorizontal: 15, paddingVertical: 12 })}><SizableText color={C.ink} size="$3">{item}</SizableText></Pressable>)}</XStack>
            </YStack> : messages.map((item) => <XStack key={item.id} alignSelf={item.role === 'user' ? 'flex-end' : 'flex-start'} maxWidth="92%" gap="$3" alignItems="flex-start">
              {item.role === 'assistant' ? <XStack width={32} height={32} borderRadius={16} backgroundColor={C.rustLight} alignItems="center" justifyContent="center" marginTop="$1"><Sparkles size={15} color={C.rust} /></XStack> : null}
              <YStack gap="$2" backgroundColor={item.role === 'user' ? C.rustLight : C.surface} borderWidth={item.role === 'assistant' ? 1 : 0} borderColor={C.line} borderRadius="$5" padding="$4" maxWidth={720}>
                {item.imageUrl ? <ExpoImage source={{ uri: item.imageUrl }} contentFit="cover" style={{ width: 240, height: 170, borderRadius: 12 }} /> : null}
                {item.fileName ? <XStack alignItems="center" gap="$2"><FileText size={15} color={C.moss} /><SizableText color={C.moss} size="$3">{item.fileName}</SizableText></XStack> : null}
                {item.text.trim() ? <SizableText color={C.ink} fontSize={17} lineHeight={28}>{item.text}</SizableText> : null}
                {item.generatedUrl ? <ExpoImage source={{ uri: item.generatedUrl }} contentFit="cover" style={{ width: 300, maxWidth: '100%', height: 300, borderRadius: 14, marginTop: 6 }} /> : null}
              </YStack>
            </XStack>)}
            {liveText ? <XStack alignSelf="flex-start" gap="$3" alignItems="flex-start"><XStack width={32} height={32} borderRadius={16} backgroundColor={C.rustLight} alignItems="center" justifyContent="center"><Sparkles size={15} color={C.rust} /></XStack><YStack backgroundColor={C.surface} borderWidth={1} borderColor={C.line} borderRadius="$5" padding="$4" maxWidth={720}><SizableText color={C.ink} fontSize={17} lineHeight={28}>{liveText}</SizableText></YStack></XStack> : null}
            {busy && !liveText ? <XStack gap="$3" alignItems="center" paddingVertical="$2"><Loader2 size={18} color={C.rust} /><SizableText color={C.muted} size="$3">{(mode === 'image') ? 'Creating your image…' : 'Orient Âî is thinking…'}</SizableText></XStack> : null}
          </YStack>
        </ScrollView>
        <YStack width="100%" maxWidth={800} alignSelf="center" paddingHorizontal="$4" paddingBottom="$4" gap="$2">
          {error ? <XStack backgroundColor="#FCEAE5" borderRadius="$3" padding="$3" justifyContent="space-between" alignItems="center"><SizableText color={C.error} size="$3" flex={1}>{error}</SizableText><Pressable onPress={() => setError('')} accessibilityLabel="Dismiss error"><X size={16} color={C.error} /></Pressable></XStack> : null}
          {attachment ? <XStack alignItems="center" gap="$2" backgroundColor={C.surface} borderRadius="$3" borderWidth={1} borderColor={C.line} padding="$2" alignSelf="flex-start"><XStack width={30} height={30} borderRadius={8} backgroundColor={C.rustLight} alignItems="center" justifyContent="center">{attachment.kind === 'image' ? <ImagePlus size={15} color={C.rust} /> : <FileText size={15} color={C.moss} />}</XStack><SizableText color={C.ink} size="$3" maxWidth={200} numberOfLines={1}>{attachment.name}</SizableText><Pressable onPress={() => setAttachment(null)} accessibilityLabel="Remove attachment"><X size={16} color={C.muted} /></Pressable></XStack> : null}
          {showAttachmentMenu ? <XStack gap="$2" paddingBottom="$1"><Button height={42} borderRadius="$4" backgroundColor={C.surface} borderColor={C.line} borderWidth={1} icon={<ImagePlus size={16} color={C.rust} />} onPress={pickPhoto}>Photo</Button><Button height={42} borderRadius="$4" backgroundColor={C.surface} borderColor={C.line} borderWidth={1} icon={<FileText size={16} color={C.moss} />} onPress={pickFile}>File</Button></XStack> : null}
          <YStack borderRadius="$5" backgroundColor={C.surface} borderColor={C.line} borderWidth={1} padding="$3" gap="$2">
            <TextInput value={draft} onChangeText={setDraft} placeholder={mode === 'image' ? 'Describe the image you want to create…' : 'Message Orient Âî…'} placeholderTextColor={C.quiet} multiline maxLength={8000} editable={!busy} onSubmitEditing={() => { if (Platform.OS === 'web') send(); }} style={{ minHeight: 48, maxHeight: 130, paddingHorizontal: 8, paddingVertical: 8, color: C.ink, fontSize: 16, lineHeight: 23, outlineStyle: 'none' as any, ...(Platform.OS === 'web' ? { outline: 'none' } : {}) } as any} />
            <XStack alignItems="center" justifyContent="space-between">
              <XStack alignItems="center" gap="$2"><ActionButton label="Add a photo or file" onPress={() => setShowAttachmentMenu(!showAttachmentMenu)}><Plus size={20} color={C.ink} /></ActionButton><Button height={40} borderRadius="$4" backgroundColor={mode === 'chat' ? C.rustLight : C.surface} borderWidth={1} borderColor={mode === 'chat' ? C.rustLight : C.line} color={mode === 'chat' ? C.rust : C.muted} icon={<MessageCircle size={15} color={mode === 'chat' ? C.rust : C.muted} />} onPress={() => setMode('chat')}>Chat</Button><Button height={40} borderRadius="$4" backgroundColor={mode === 'image' ? C.rustLight : C.surface} borderWidth={1} borderColor={mode === 'image' ? C.rustLight : C.line} color={mode === 'image' ? C.rust : C.muted} icon={<Sparkles size={15} color={mode === 'image' ? C.rust : C.muted} />} onPress={() => setMode('image')}>Image studio</Button></XStack>
              <Pressable accessibilityRole="button" accessibilityLabel="Send message" onPress={() => send()} disabled={busy || (!draft.trim() && !attachment)} style={({ pressed }) => ({ width: 44, height: 44, borderRadius: 22, backgroundColor: busy || (!draft.trim() && !attachment) ? '#D8D1C7' : C.rust, alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.82 : 1 })}><ArrowUp size={20} color={C.white} /></Pressable>
            </XStack>
          </YStack>
          {mode === 'chat' ? <XStack alignItems="center" justifyContent="center" gap="$2" paddingTop="$1"><SizableText color={C.quiet} size="$2">Answer length</SizableText>{(['concise', 'balanced', 'detailed'] as const).map((size) => <Pressable key={size} accessibilityRole="button" accessibilityLabel={`${size} answer length`} onPress={() => setAnswerSize(size)} style={({ pressed }) => ({ minHeight: 34, justifyContent: 'center', paddingHorizontal: 12, borderRadius: 17, backgroundColor: answerSize === size ? C.rustLight : pressed ? '#F0ECE5' : 'transparent' })}><SizableText color={answerSize === size ? C.rust : C.muted} size="$2" fontWeight={answerSize === size ? '700' : '400'}>{size[0].toUpperCase() + size.slice(1)}</SizableText></Pressable>)}</XStack> : null}
          <SizableText color={C.quiet} size="$2" textAlign="center">AI can make mistakes. Check important information.</SizableText>
        </YStack>
      </KeyboardAvoidingView>}
    </YStack>
  );
}
