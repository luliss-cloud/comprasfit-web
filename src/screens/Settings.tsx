import React from 'react';
import { Modal, Pressable, ScrollView, Switch, Text, View } from 'react-native';
import { Button, Card, Heading, Icon, ui, useTheme } from '../components/ui';
import { useApp } from '../state/AppState';

export function Preferences() {
  const { state, updatePreferences } = useApp();
  const c = useTheme();
  return <ScrollView contentContainerStyle={{ padding: 24, gap: 26 }}>
    <Heading title="Minhas preferências" subtitle="Seu app, do seu jeito." />
    <Card><View style={[ui.row, { justifyContent: 'space-between' }]}><View style={{ flex: 1, gap: 6 }}><Text style={{ color: c.text, fontSize: 19, fontWeight: '700' }}>Aparência do seu app</Text><Text style={{ color: c.muted, fontSize: 15 }}>Usar tema escuro</Text></View><Switch accessibilityLabel="Tema escuro" value={state.preferences.dark} onValueChange={dark => updatePreferences({ dark })} trackColor={{ true: c.green, false: c.border }} /></View></Card>
    <Card><Text style={{ color: c.text, fontSize: 19, fontWeight: '700', marginBottom: 8 }}>Lembretes</Text><Text style={{ color: c.muted, lineHeight: 22 }}>As notificações serão adicionadas em uma próxima etapa. Esta versão não envia lembretes.</Text></Card>
    <Card><Text style={{ color: c.text, fontSize: 19, fontWeight: '700', marginBottom: 14 }}>Início da semana</Text>{(['Segunda-feira', 'Domingo'] as const).map(day => <Pressable accessibilityRole="radio" accessibilityState={{ checked: state.preferences.weekStart === day }} aria-checked={state.preferences.weekStart === day} onPress={() => updatePreferences({ weekStart: day })} key={day} style={[ui.row, { paddingVertical: 12 }]}><Icon name={state.preferences.weekStart === day ? 'radio-button-on' : 'radio-button-off'} size={21} color={c.green} /><Text style={{ color: c.text }}>{day}</Text></Pressable>)}</Card>
    <Card><Text style={{ color: c.text, fontSize: 19, fontWeight: '700', marginBottom: 8 }}>Idioma e região</Text>{([{ id: 'pt-BR', label: 'Português (Brasil)' }, { id: 'en', label: 'English' }, { id: 'es', label: 'Español' }] as const).map(option => <Pressable key={option.id} accessibilityRole="radio" accessibilityState={{ checked: (state.preferences.language || 'pt-BR') === option.id }} onPress={() => updatePreferences({ language: option.id })} style={[ui.row, { paddingVertical: 10, gap: 12 }]}><Icon name={(state.preferences.language || 'pt-BR') === option.id ? 'radio-button-on' : 'radio-button-off'} color={c.green} /><Text style={{ color: c.text }}>{option.label}</Text></Pressable>)}<Text style={{ color: c.muted, fontSize: 14 }}>Preferência salva neste dispositivo. Tradução completa das telas ainda em desenvolvimento.</Text></Card>
  </ScrollView>;
}

export function Settings({ onEdit, onAccount }: { onEdit: (step: number) => void; onAccount: () => void }) {
  const { state, reset } = useApp();
  const c = useTheme();
  const [confirm, setConfirm] = React.useState(false);
  const [info, setInfo] = React.useState<string | null>(null);
  return <ScrollView contentContainerStyle={{ padding: 24, gap: 26 }}>
    <Heading title="Configurações" subtitle="Vamos deixar tudo organizado." />
    <View style={{ gap: 12 }}><Text style={{ fontSize: 20, fontWeight: '700', color: c.text }}>Minha conta</Text><Pressable accessibilityRole="button" onPress={onAccount}><Card><View style={[ui.row, { gap: 12 }]}><Icon name="person-circle-outline" size={32} color={c.green} /><View style={{ flex: 1 }}><Text style={{ color: c.text, fontWeight: '700', fontSize: 20 }}>{state.profile.name || 'Meu perfil'}</Text><Text style={{ color: c.muted, marginTop: 7 }}>Entrar, criar conta ou editar perfil neste dispositivo.</Text></View><Icon name="chevron-forward" color={c.muted} /></View></Card></Pressable></View>
    <View style={{ gap: 12 }}><Text style={{ fontSize: 20, fontWeight: '700', color: c.text }}>Planejamento</Text><Card style={{ padding: 0 }}>{[
      ['calendar-outline', 'Orçamento semanal', 5], ['basket-outline', 'Supermercado selecionado', 2], ['restaurant-outline', 'Preferências alimentares', 7],
    ].map(([icon, label, step]) => <Pressable key={label} accessibilityRole="button" onPress={() => onEdit(Number(step))} style={[ui.row, { padding: 18 }]}><Icon name={icon as React.ComponentProps<typeof Icon>['name']} color={c.forest} size={20} /><Text style={{ flex: 1, color: c.text }}>{label}</Text><Icon name="chevron-forward" color={c.muted} size={18} /></Pressable>)}</Card></View>
    <View style={{ gap: 12 }}><Text style={{ fontSize: 20, fontWeight: '700', color: c.text }}>Aplicativo</Text><Card style={{ padding: 0 }}>{['Sobre o ComprasFit', 'Dados e privacidade'].map(label => <Pressable key={label} accessibilityRole="button" onPress={() => setInfo(label)} style={[ui.row, { padding: 18 }]}><Text style={{ flex: 1, color: c.text }}>{label}</Text><Icon name="chevron-forward" color={c.muted} size={18} /></Pressable>)}</Card></View>
    <Button title="Apagar dados deste dispositivo" secondary onPress={() => setConfirm(true)} />
    <Text style={{ textAlign: 'center', color: c.muted, fontSize: 14 }}>ComprasFit · versão 1.0.0</Text>
    <Modal visible={confirm || !!info} transparent animationType="fade" onRequestClose={() => { setConfirm(false); setInfo(null); }}><View style={{ flex: 1, backgroundColor: '#00000066', justifyContent: 'center', padding: 24 }}><Card style={{ gap: 18, width: '100%', maxWidth: 480, alignSelf: 'center' }}>
      <Heading title={confirm ? 'Apagar seus dados?' : info!} />
      <Text style={{ color: c.muted, lineHeight: 23 }}>{confirm ? 'Seu perfil, plano, favoritos e lista de compras serão removidos deste aparelho. Esta ação não pode ser desfeita.' : info === 'Dados e privacidade' ? 'O app mantém preferências e um fallback local neste aparelho. Quando você entra na conta, o planejamento e a lista de compras também são enviados ao backend do ComprasFit. Você pode apagar os dados locais nas configurações.' : 'Planeje suas refeições e organize as compras. Esta é uma versão de demonstração do frontend, baseada no design enviado. O catálogo, os custos e a nutrição são ilustrativos.'}</Text>
      {confirm && <Button title="Sim, apagar dados" onPress={() => { setConfirm(false); reset(); }} />}
      <Button title={confirm ? 'Cancelar' : 'Entendi'} secondary onPress={() => { setConfirm(false); setInfo(null); }} />
    </Card></View></Modal>
  </ScrollView>;
}
