import React, { useState } from 'react';
import { Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { downloadList, shareList } from '../data/shareList';
import { Card, Icon, ui, useTheme } from '../components/ui';
import { shoppingList } from '../data/planner';
import { useResponsive } from '../components/responsive';
import { useApp } from '../state/AppState';

export function Shopping() {
  const { state, toggleChecked } = useApp();
  const c = useTheme();
  const { columns } = useResponsive();
  const [message, setMessage] = useState('');
  const remoteItems = state.remotePlanning?.shoppingList.items;
  const remoteItems = state.remotePlanning?.shoppingList.items;
  const items = remoteItems ? remoteItems.map(item => ({ id: item.id, name: item.name, emoji: item.category.includes('Hortifruti') ? '🥦' : item.category.includes('Carnes') ? '🍗' : '🛒', category: item.category, unit: item.unit, quantity: item.quantityNeeded })) : shoppingList(state.plan, state.profile.people);
  const isChecked = (id: string) => remoteItems ? remoteItems.find(item => item.id === id)?.purchased ?? false : state.checked.includes(id);
  const categories = [...new Set(items.map(i => i.category))];
  const count = items.filter(i => isChecked(i.id)).length;
  const listText = () => `Minha lista ComprasFit\n${items.map(i => `${isChecked(i.id) ? '✓' : '□'} ${i.name} — ${i.quantity.toLocaleString('pt-BR')} ${i.unit}`).join('\n')}`;
  const share = async () => {
    try {
      setMessage(await shareList(listText()));
    } catch { setMessage('Não foi possível compartilhar neste dispositivo. Tente novamente.'); }
  };
  return <ScrollView contentContainerStyle={{ padding: 24, gap: 22 }}>
    <View style={{ alignItems: 'center', gap: 12 }}>
      <Text style={{ fontSize: 13, letterSpacing: 2, color: c.muted }}>ESTA SEMANA</Text>
      <Text accessibilityRole="header" style={{ fontSize: 28, fontWeight: '800', color: c.text }}>Lista de compras</Text>
      <Text style={{ backgroundColor: '#DFEBD9', color: '#32643C', borderRadius: 20, paddingVertical: 8, paddingHorizontal: 16 }}>{count}/{items.length} itens comprados</Text>
    </View>
    <Pressable accessibilityRole="button" onPress={share} style={[ui.row, { justifyContent: 'center', padding: 14, backgroundColor: c.white, borderRadius: 12, borderWidth: 1, borderColor: c.border }]}><Icon name="share-outline" color={c.text} /><Text style={{ color: c.text, fontWeight: '600' }}>Compartilhar lista</Text></Pressable>
    {Platform.OS === 'web' && <Pressable accessibilityRole="button" accessibilityLabel="Baixar lista de compras" onPress={() => downloadList(listText())} style={[ui.row, { justifyContent: 'center', padding: 12 }]}><Icon name="download-outline" color={c.forest} /><Text style={{ color: c.text }}>Baixar lista em texto</Text></Pressable>}
    {!!message && <Text accessibilityRole="alert" style={{ color: c.muted }}>{message}</Text>}
    {!items.length && <Text style={{ color: c.muted }}>Monte seu planejamento para gerar a lista.</Text>}
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'flex-start', gap: 22 }}>{categories.map(category => <View key={category} style={{ gap: 10, width: columns > 1 ? '48%' : '100%' }}>
      <Text style={{ fontSize: 13, color: c.muted, textTransform: 'uppercase', letterSpacing: 1 }}>{category}</Text>
      <Card style={{ padding: 0, overflow: 'hidden' }}>{items.filter(i => i.category === category).map((item, index) => {
        const checked = isChecked(item.id);
        return <Pressable key={item.id} accessibilityRole="checkbox" accessibilityState={{ checked }} aria-checked={checked} accessibilityLabel={`${item.name}, ${item.quantity} ${item.unit}`} onPress={() => toggleChecked(item.id)} style={[ui.row, { padding: 16, borderTopWidth: index ? 1 : 0, borderColor: c.border }]}>
          <Text style={{ fontSize: 26 }}>{item.emoji}</Text>
          <View style={{ flex: 1, gap: 4 }}><Text style={{ color: checked ? c.muted : c.text, fontWeight: '600', textDecorationLine: checked ? 'line-through' : 'none' }}>{item.name}</Text><Text style={{ color: c.muted, fontSize: 14 }}>{item.quantity.toLocaleString('pt-BR')} {item.unit}</Text></View>
          <Icon name={checked ? 'checkmark-circle' : 'ellipse-outline'} color={checked ? c.green : c.border} size={25} />
        </Pressable>;
      })}</Card>
    </View>)}</View>
    {items.length > 0 && count === items.length && <Text style={{ textAlign: 'center', color: c.forest, paddingBottom: 20, fontWeight: '700' }}>Tudo pronto para cozinhar! 🥦</Text>}
  </ScrollView>;
}
