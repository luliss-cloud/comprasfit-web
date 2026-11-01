import React from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { Button, Card, Heading, Icon, useTheme } from '../components/ui';
import { useApp } from '../state/AppState';

const inputStyle = (color: string, borderColor: string) => ({
  color,
  borderColor,
  borderWidth: 1,
  borderRadius: 12,
  padding: 14,
  fontSize: 18,
  marginTop: 7,
});

function messageFrom(error: unknown) {
  return error instanceof Error ? error.message : 'Não foi possível concluir a operação.';
}

export function Account({ onBack }: { onBack: () => void }) {
  const c = useTheme();
  const { state, auth, signUp, signIn, signOut, updateProfile } = useApp();
  const [mode, setMode] = React.useState<'landing' | 'signup' | 'login' | 'profile'>('landing');
  const [name, setName] = React.useState(state.profile.name || '');
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [confirm, setConfirm] = React.useState('');
  const [busy, setBusy] = React.useState(false);
  const [message, setMessage] = React.useState('');

  React.useEffect(() => {
    if (auth.status === 'authenticated') {
      setEmail(auth.session?.user.email ?? '');
      setName(current => current || state.profile.name);
      setMode('profile');
    }
  }, [auth.status, auth.session?.user.email, state.profile.name]);

  const save = async () => {
    setMessage('');
    const cleanName = name.trim();
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanName || !/^\S+@\S+\.\S+$/.test(cleanEmail) || password.length < 8 || password !== confirm) {
      setMessage('Preencha nome, e-mail válido e senha de pelo menos 8 caracteres, com confirmação igual.');
      return;
    }

    setBusy(true);
    try {
      const result = await signUp(cleanName, cleanEmail, password);
      updateProfile({ name: cleanName });
      setPassword('');
      setConfirm('');
      setEmail(cleanEmail);
      setMode(result.needsEmailConfirmation ? 'login' : 'profile');
      setMessage(result.needsEmailConfirmation
        ? 'Cadastro criado. Confirme o e-mail e depois entre na conta.'
        : 'Conta criada e conectada ao backend.');
    } catch (error) {
      setMessage(messageFrom(error));
    } finally {
      setBusy(false);
    }
  };

  const login = async () => {
    setMessage('');
    setBusy(true);
    try {
      await signIn(email, password);
      setPassword('');
      setMode('profile');
      setMessage('Você entrou na sua conta.');
    } catch (error) {
      setMessage(messageFrom(error));
    } finally {
      setBusy(false);
    }
  };

  const updateName = () => {
    const cleanName = name.trim();
    if (!cleanName) {
      setMessage('Informe um nome válido.');
      return;
    }
    updateProfile({ name: cleanName });
    setMessage('Nome atualizado neste dispositivo.');
  };

  const logout = async () => {
    try {
      await signOut();
      setPassword('');
      setMode('landing');
      setMessage('Você saiu da conta. O planejamento local continua neste aparelho.');
    } catch (error) {
      setMessage(messageFrom(error));
    }
  };

  const field = (
    label: string,
    value: string,
    onChangeText: (value: string) => void,
    options: { secure?: boolean; email?: boolean } = {},
  ) => <View>
    <Text style={{ color: c.text, fontWeight: '600' }}>{label}</Text>
    <TextInput
      accessibilityLabel={label}
      style={inputStyle(c.text, c.border)}
      value={value}
      onChangeText={onChangeText}
      secureTextEntry={options.secure}
      autoCapitalize={options.email ? 'none' : 'sentences'}
      keyboardType={options.email ? 'email-address' : 'default'}
      autoCorrect={!options.email && !options.secure}
    />
  </View>;

  return <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 24, gap: 20 }}>
    <Pressable onPress={onBack} accessibilityRole="button" style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
      <Icon name="arrow-back" color={c.text} />
      <Text style={{ color: c.text }}>Voltar às configurações</Text>
    </Pressable>
    <Heading title="Minha conta" subtitle="Seu perfil, sincronizado quando você quiser." />
    <Card style={{ gap: 18 }}>
      {mode === 'landing' && <><Text style={{ color: c.text, fontSize: 20, fontWeight: '700' }}>Conecte seu planejamento</Text>
        <Text style={{ color: c.muted, lineHeight: 22 }}>Com uma conta, o planejamento e a lista de compras podem usar o backend do ComprasFit. Você também pode continuar sem cadastro.</Text>
        <Button title="Criar conta" onPress={() => { setMode('signup'); setMessage(''); }} />
        <Button title="Entrar" secondary onPress={() => { setMode('login'); setMessage(''); }} />
        <Button title="Continuar sem conta" secondary onPress={onBack} />
      </>}
      {mode === 'signup' && <><Text style={{ color: c.text, fontSize: 21, fontWeight: '700' }}>Criar conta online</Text>
        {field('Nome', name, setName)}
        {field('E-mail', email, setEmail, { email: true })}
        {field('Senha (mínimo 8 caracteres)', password, setPassword, { secure: true })}
        {field('Confirmar senha', confirm, setConfirm, { secure: true })}
        <Button title="Cadastrar" busy={busy} onPress={save} />
        <Button title="Já tenho conta" secondary onPress={() => { setMode('login'); setMessage(''); }} />
      </>}
      {mode === 'login' && <><Text style={{ color: c.text, fontSize: 21, fontWeight: '700' }}>Entrar na conta</Text>
        {field('E-mail', email, setEmail, { email: true })}
        {field('Senha', password, setPassword, { secure: true })}
        <Button title="Entrar" busy={busy} onPress={login} />
        <Button title="Voltar" secondary onPress={() => { setMode('landing'); setMessage(''); }} />
      </>}
      {mode === 'profile' && <><Text style={{ color: c.text, fontSize: 21, fontWeight: '700' }}>Conta conectada</Text>
        {field('Nome', name, setName)}
        <Text style={{ color: c.muted }}>{auth.session?.user.email ?? email}</Text>
        <Button title="Salvar nome" busy={busy} onPress={updateName} />
        <Button title="Sair da conta" secondary onPress={logout} />
      </>}
      {!!message && <Text accessibilityRole="alert" style={{ color: c.forest, lineHeight: 21 }}>{message}</Text>}
    </Card>
    <Text style={{ color: c.muted, fontSize: 14, lineHeight: 19 }}>
      A senha é enviada somente para o endpoint seguro de autenticação do backend e não é salva no aplicativo. Sem login, o app continua funcionando com dados locais.
    </Text>
  </ScrollView>;
}
