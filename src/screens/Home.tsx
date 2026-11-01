import React from 'react';
import { AppState, Pressable, ScrollView, Text, View } from 'react-native';
import { Button, Card, Heading, Icon, ui, useTheme } from '../components/ui';
import { RecipeCard } from '../components/RecipeCard';
import { recipes } from '../data/recipes';
import { money, planCost, shoppingList } from '../data/planner';
import { useResponsive } from '../components/responsive';
import { useApp } from '../state/AppState';

export function Home({ onRecipe, onShopping, onEdit }: { onRecipe: (id: string, day?: string) => void; onShopping: () => void; onEdit: () => void }) {
  const { state } = useApp();
  const [hour, setHour] = React.useState(new Date().getHours());
  React.useEffect(() => { const sub = AppState.addEventListener('change', status => { if (status === 'active') setHour(new Date().getHours()); }); const interval = setInterval(() => setHour(new Date().getHours()), 60000); return () => { sub.remove(); clearInterval(interval); }; }, []);
  const greeting = hour >= 5 && hour < 12 ? 'BOM DIA' : hour >= 12 && hour < 18 ? 'BOA TARDE' : 'BOA NOITE';
  const c = useTheme();
  const { wide, columns } = useResponsive();
  const remoteItems = state.remotePlanning?.shoppingList.items;
  const total = state.remotePlanning?.total ?? planCost(state.plan, state.profile.people);
  const list = remoteItems ? remoteItems.map(item => ({ id: item.id })) : shoppingList(state.plan, state.profile.people);
  const checked = remoteItems ? remoteItems.filter(item => item.purchased).length : list.filter(item => state.checked.includes(item.id)).length;
  const firstName = (state.profile.name || 'Chef').trim().split(' ')[0];
  const percent = state.profile.budget > 0 ? Math.min(100, Math.round(total / state.profile.budget * 100)) : 0;
  return <ScrollView style={{ backgroundColor: c.bg }} contentContainerStyle={{ paddingHorizontal: wide ? 36 : 22, paddingTop: 28, paddingBottom: 48, gap: 25 }}>
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
      <View style={{ flex: 1, gap: 7 }}>
        <Text style={{ color: c.green, fontSize: 14, fontWeight: '800', letterSpacing: 1.2 }}>COMPRASFiT  ·  {greeting}</Text>
        <Text accessibilityRole="header" style={{ color: c.text, fontSize: wide ? 35 : 30, fontWeight: '800', letterSpacing: -1.2 }}>Olá, {firstName} 👋</Text>
        <Text style={{ color: c.muted, fontSize: 16 }}>Seu planejamento, mais simples.</Text>
      </View>
      <View style={{ width: 48, height: 48, borderRadius: 17, backgroundColor: '#E9F7EE', alignItems: 'center', justifyContent: 'center' }}><Icon name="leaf-outline" color={c.green} size={26} /></View>
    </View>
    <View style={{ borderRadius: 27, padding: 24, backgroundColor: '#176C4A', gap: 16 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Text style={{ color: '#C7EBD8', fontSize: 15, fontWeight: '600' }}>Seu orçamento semanal</Text>
        <Icon name="wallet-outline" color="#D7F3E4" size={23}/>
      </View>
      <View style={{ gap: 4 }}><Text style={{ color: '#FFFFFF', fontSize: 35, fontWeight: '800', letterSpacing: -1 }}>{money(total)}</Text><Text style={{ color: '#C7EBD8', fontSize: 15 }}>de {money(state.profile.budget)} disponíveis</Text></View>
      <View style={{ height: 8, borderRadius: 8, backgroundColor: '#478B70', overflow: 'hidden' }}><View style={{ height: '100%', width: `${percent}%`, borderRadius: 8, backgroundColor: total > state.profile.budget ? '#FFC77B' : '#B6F0CF' }}/></View>
      <Text style={{ color: '#DDF4E6', fontSize: 14 }}>{percent}% do orçamento estimado</Text>
    </View>
    <Pressable onPress={onShopping} accessibilityRole="button" accessibilityLabel="Abrir lista de compras" style={{ flexDirection: 'row', alignItems: 'center', padding: 18, borderRadius: 22, backgroundColor: '#F0F7F3', gap: 15 }}>
      <View style={{ width: 52, height: 52, borderRadius: 17, backgroundColor: '#D8EFE2', alignItems: 'center', justifyContent: 'center' }}><Icon name="basket-outline" color={c.green} size={26}/></View>
      <View style={{ flex: 1, gap: 4 }}><Text style={{ color: c.text, fontWeight: '800', fontSize: 19 }}>Lista de compras</Text><Text style={{ color: c.muted, fontSize: 14 }}>{checked} de {list.length} itens marcados</Text></View>
      <Icon name="arrow-forward" color={c.green} size={22}/>
    </Pressable>
    <View style={{ gap: 15 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <View style={{ gap: 4 }}><Text accessibilityRole="header" style={{ color: c.text, fontSize: 25, fontWeight: '800', letterSpacing: -.6 }}>Seu cardápio</Text><Text style={{ color: c.muted, fontSize: 15 }}>Receitas para sua semana</Text></View>
        <View style={{ paddingHorizontal: 12, paddingVertical: 7, backgroundColor: '#EDF6F0', borderRadius: 20 }}><Text style={{ color: c.green, fontWeight: '700', fontSize: 14 }}>{state.plan.length} refeições</Text></View>
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 15 }}>
        {[...state.plan].sort((a, b) => state.preferences.weekStart === 'Domingo' ? Number(b.day === 'Domingo') - Number(a.day === 'Domingo') : 0).map(entry => {
          const recipe = recipes.find(r => r.id === entry.recipeId);
          return recipe ? <View key={entry.day} style={{ width: columns === 3 ? '31.5%' : columns === 2 ? '48%' : '100%' }}><RecipeCard day={entry.day} recipe={recipe} onPress={() => onRecipe(recipe.id, entry.day)} /></View> : null;
        })}
      </View>
      {!state.plan.length && <Card><Text style={{ color: c.muted }}>Nenhuma receita compatível. Ajuste suas preferências para montar um plano.</Text></Card>}
    </View>
    <Button title="Editar planejamento" secondary icon="options-outline" onPress={onEdit}/>
    <Text style={{ textAlign: 'center', fontSize: 13, lineHeight: 17, color: c.muted }}>{total > state.profile.budget ? 'O custo estimado supera seu orçamento. Revise seu planejamento.' : state.remotePlanning ? 'Planejamento sincronizado com o backend.' : 'Preços e valores nutricionais são estimativas ilustrativas. Entre na sua conta para sincronizar.'}</Text>
  </ScrollView>;
}
