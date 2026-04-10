// App.js - Controle Financeiro Pessoal
// Cole este arquivo na pasta do seu projeto Expo

import { useState, useEffect, useMemo } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  Modal, Alert, StatusBar, SafeAreaView, Platform
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ── Constantes ────────────────────────────────────────────────────────────────
const CATEGORIAS = [
  { nome: '🏠 Moradia', cor: '#6366f1' },
  { nome: '🍽️ Alimentação', cor: '#f59e0b' },
  { nome: '🚗 Transporte', cor: '#10b981' },
  { nome: '💊 Saúde', cor: '#ef4444' },
  { nome: '📚 Educação', cor: '#8b5cf6' },
  { nome: '🎮 Lazer', cor: '#ec4899' },
  { nome: '👗 Vestuário', cor: '#14b8a6' },
  { nome: '💳 Dívidas', cor: '#f97316' },
  { nome: '🔧 Outros', cor: '#64748b' },
];

const TIPOS_INVESTIMENTO = [
  { nome: '📈 Ações', cor: '#34d399' },
  { nome: '🏦 CDB/LCI/LCA', cor: '#60a5fa' },
  { nome: '📊 Fundos', cor: '#a78bfa' },
  { nome: '₿ Cripto', cor: '#fbbf24' },
  { nome: '🏛️ Tesouro Direto', cor: '#f472b6' },
  { nome: '🏠 FII', cor: '#fb923c' },
  { nome: '💵 Renda Fixa', cor: '#4ade80' },
  { nome: '🌍 ETF', cor: '#38bdf8' },
  { nome: '🔮 Outros', cor: '#94a3b8' },
];

const METODOS = ['Dinheiro', 'Débito', 'Crédito', 'Pix', 'Transferência'];
const MESES = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];

const fmt = (v) => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const fmtPct = (v) => `${Number(v || 0).toFixed(2)}%`;
const today = () => new Date().toISOString().split('T')[0];
const mesAtual = () => { const d = new Date(); return `${MESES[d.getMonth()]}/${d.getFullYear()}`; };

const save = async (key, val) => { try { await AsyncStorage.setItem(key, JSON.stringify(val)); } catch(e) {} };
const load = async (key, def) => { try { const r = await AsyncStorage.getItem(key); return r ? JSON.parse(r) : def; } catch(e) { return def; } };

// ── Cores / tema ──────────────────────────────────────────────────────────────
const C = {
  bg: '#0d0d1a', card: '#1a1a3e', border: '#2d2d6b',
  text: '#e2e8f0', muted: '#6b7280', label: '#9ca3af',
  purple: '#c4b5fd', accent: '#7c3aed',
  green: '#34d399', red: '#f87171', blue: '#60a5fa',
  orange: '#fb923c', yellow: '#fbbf24',
};

// ── Componentes base ──────────────────────────────────────────────────────────
const Card = ({ children, style, borderColor }) => (
  <View style={[{ backgroundColor: C.card, borderWidth: 1, borderColor: borderColor || C.border, borderRadius: 16, padding: 16, marginBottom: 12 }, style]}>
    {children}
  </View>
);

const Lbl = ({ children }) => (
  <Text style={{ fontSize: 10, color: C.label, marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.8 }}>{children}</Text>
);

const BigNum = ({ value, color }) => (
  <Text style={{ fontSize: 20, fontWeight: '700', color: color || C.text, marginTop: 2 }}>{value}</Text>
);

const Barra = ({ pct, cor, height = 8 }) => (
  <View style={{ backgroundColor: '#0d0d1a', borderRadius: 99, height, overflow: 'hidden' }}>
    <View style={{ width: `${Math.min(100, Math.max(0, pct))}%`, height: '100%', backgroundColor: cor, borderRadius: 99 }} />
  </View>
);

const Btn = ({ label, cor, bg, onPress, style }) => (
  <TouchableOpacity onPress={onPress} style={[{ backgroundColor: bg, borderWidth: 1, borderColor: cor, borderRadius: 10, paddingHorizontal: 16, paddingVertical: 10 }, style]}>
    <Text style={{ color: cor, fontWeight: '600', fontSize: 13, textAlign: 'center' }}>{label}</Text>
  </TouchableOpacity>
);

const Inp = ({ style, ...props }) => (
  <TextInput placeholderTextColor={C.muted} style={[{ backgroundColor: '#0d0d1a', borderWidth: 1, borderColor: C.border, color: C.text, padding: 10, borderRadius: 10, fontSize: 14 }, style]} {...props} />
);

// Picker simples usando botões
const SimplePicker = ({ options, value, onChange }) => (
  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 4 }}>
    <View style={{ flexDirection: 'row', gap: 6, paddingVertical: 4 }}>
      {options.map(op => (
        <TouchableOpacity key={op} onPress={() => onChange(op)}
          style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: value === op ? C.accent : C.border, backgroundColor: value === op ? '#312e81' : 'transparent' }}>
          <Text style={{ color: value === op ? C.purple : C.muted, fontSize: 12 }}>{op}</Text>
        </TouchableOpacity>
      ))}
    </View>
  </ScrollView>
);

// ── Gerador de parcelas ───────────────────────────────────────────────────────
function gerarParcelas(emp) {
  const principal = Number(emp.valorOriginal);
  const taxa = Number(emp.jurosPorc) / 100;
  const n = Number(emp.numParcelas);
  const parcelas = [];
  for (let i = 1; i <= n; i++) {
    let vp = 0;
    if (taxa === 0) { vp = principal / n; }
    else if (emp.tipoJuros === 'simples') { vp = principal * (1 + taxa * n) / n; }
    else { const f = (taxa * Math.pow(1+taxa,n)) / (Math.pow(1+taxa,n)-1); vp = principal * f; }
    const [ano, mes, dia] = emp.dataInicio.split('-').map(Number);
    const dv = new Date(ano, mes - 1 + i, dia);
    parcelas.push({ numero: i, valorParcela: Number(vp.toFixed(2)), dataVencimento: dv.toISOString().split('T')[0] });
  }
  return parcelas;
}

// ══════════════════════════════════════════════════════════════════════════════
export default function App() {
  const [aba, setAba] = useState('resumo');
  const [transacoes, setTransacoes] = useState([]);
  const [investimentos, setInvestimentos] = useState([]);
  const [emprestimos, setEmprestimos] = useState([]);
  const [orcamentos, setOrcamentos] = useState({});
  const [meta, setMeta] = useState(500);
  const [mesRef, setMesRef] = useState(mesAtual());
  const [ready, setReady] = useState(false);

  // Modais
  const [modalTx, setModalTx] = useState(false);
  const [tipoTx, setTipoTx] = useState('despesa');
  const [formTx, setFormTx] = useState({ data: today(), categoria: CATEGORIAS[0].nome, descricao: '', valor: '', metodo: 'Pix', observacao: '' });
  const [editTxId, setEditTxId] = useState(null);

  const [modalInv, setModalInv] = useState(false);
  const [formInv, setFormInv] = useState({ nome: '', tipo: TIPOS_INVESTIMENTO[0].nome, valorAportado: '', valorAtual: '', dataCompra: today(), observacao: '' });
  const [editInvId, setEditInvId] = useState(null);

  const [modalEmp, setModalEmp] = useState(false);
  const [formEmp, setFormEmp] = useState({ devedor: '', descricao: '', valorOriginal: '', jurosPorc: '0', tipoJuros: 'simples', numParcelas: '1', dataInicio: today(), observacao: '' });
  const [editEmpId, setEditEmpId] = useState(null);

  const [detalheEmp, setDetalheEmp] = useState(null);
  const [modalPgto, setModalPgto] = useState(false);
  const [formPgto, setFormPgto] = useState({ valor: '', data: today(), obs: '' });

  useEffect(() => {
    (async () => {
      setTransacoes(await load('tx_v3', []));
      setInvestimentos(await load('inv_v3', []));
      setEmprestimos(await load('emp_v3', []));
      setOrcamentos(await load('orc_v3', {}));
      setMeta(await load('meta_v3', 500));
      setReady(true);
    })();
  }, []);

  useEffect(() => { if (ready) save('tx_v3', transacoes); }, [transacoes, ready]);
  useEffect(() => { if (ready) save('inv_v3', investimentos); }, [investimentos, ready]);
  useEffect(() => { if (ready) save('emp_v3', emprestimos); }, [emprestimos, ready]);
  useEffect(() => { if (ready) save('orc_v3', orcamentos); }, [orcamentos, ready]);
  useEffect(() => { if (ready) save('meta_v3', meta); }, [meta, ready]);

  // Computed
  const doMes = useMemo(() => transacoes.filter(t => {
    const d = new Date(t.data + 'T12:00:00');
    return `${MESES[d.getMonth()]}/${d.getFullYear()}` === mesRef;
  }), [transacoes, mesRef]);

  const receitas = doMes.filter(t => t.tipo === 'receita');
  const despesas = doMes.filter(t => t.tipo === 'despesa');
  const totalReceitas = receitas.reduce((s, t) => s + Number(t.valor), 0);
  const totalDespesas = despesas.reduce((s, t) => s + Number(t.valor), 0);
  const saldo = totalReceitas - totalDespesas;
  const totalAportadoGeral = investimentos.reduce((s, i) => s + Number(i.valorAportado), 0);
  const totalAtualGeral = investimentos.reduce((s, i) => s + Number(i.valorAtual || i.valorAportado), 0);
  const rentGeral = totalAportadoGeral > 0 ? ((totalAtualGeral - totalAportadoGeral) / totalAportadoGeral) * 100 : 0;
  const totalEmAberto = emprestimos.reduce((s, e) => {
    const dev = e.parcelas.reduce((x, p) => x + p.valorParcela, 0);
    const pg = (e.pagamentos || []).reduce((x, p) => x + Number(p.valor), 0);
    return s + Math.max(0, dev - pg);
  }, 0);

  const porCategoria = useMemo(() => {
    const res = {}; CATEGORIAS.forEach(c => { res[c.nome] = 0; });
    despesas.forEach(t => { res[t.categoria] = (res[t.categoria] || 0) + Number(t.valor); });
    return res;
  }, [despesas]);

  const meses = useMemo(() => {
    const set = new Set(transacoes.map(t => {
      const d = new Date(t.data + 'T12:00:00');
      return `${MESES[d.getMonth()]}/${d.getFullYear()}`;
    }));
    set.add(mesAtual());
    return [...set].sort((a, b) => {
      const [ma, ya] = a.split('/'); const [mb, yb] = b.split('/');
      return yb - ya || MESES.indexOf(mb) - MESES.indexOf(ma);
    });
  }, [transacoes]);

  // Handlers TX
  const salvarTx = () => {
    if (!formTx.descricao || !formTx.valor) { Alert.alert('Preencha descrição e valor!'); return; }
    const nova = { ...formTx, tipo: tipoTx, id: editTxId || Date.now() };
    setTransacoes(prev => editTxId ? prev.map(t => t.id === editTxId ? nova : t) : [nova, ...prev]);
    setModalTx(false);
  };
  const abrirTx = (tipo, tr = null) => {
    setTipoTx(tipo);
    if (tr) { setEditTxId(tr.id); setFormTx({ data: tr.data, categoria: tr.categoria || CATEGORIAS[0].nome, descricao: tr.descricao, valor: String(tr.valor), metodo: tr.metodo || 'Pix', observacao: tr.observacao || '' }); }
    else { setEditTxId(null); setFormTx({ data: today(), categoria: CATEGORIAS[0].nome, descricao: '', valor: '', metodo: 'Pix', observacao: '' }); }
    setModalTx(true);
  };

  // Handlers INV
  const salvarInv = () => {
    if (!formInv.nome || !formInv.valorAportado) { Alert.alert('Preencha nome e valor!'); return; }
    const novo = { ...formInv, id: editInvId || Date.now() };
    setInvestimentos(prev => editInvId ? prev.map(i => i.id === editInvId ? novo : i) : [novo, ...prev]);
    setModalInv(false);
  };
  const abrirInv = (inv = null) => {
    if (inv) { setEditInvId(inv.id); setFormInv({ nome: inv.nome, tipo: inv.tipo, valorAportado: String(inv.valorAportado), valorAtual: String(inv.valorAtual || inv.valorAportado), dataCompra: inv.dataCompra, observacao: inv.observacao || '' }); }
    else { setEditInvId(null); setFormInv({ nome: '', tipo: TIPOS_INVESTIMENTO[0].nome, valorAportado: '', valorAtual: '', dataCompra: today(), observacao: '' }); }
    setModalInv(true);
  };

  // Handlers EMP
  const salvarEmp = () => {
    if (!formEmp.devedor || !formEmp.valorOriginal) { Alert.alert('Preencha devedor e valor!'); return; }
    const parcelas = gerarParcelas(formEmp);
    const emp = { ...formEmp, id: editEmpId || Date.now(), parcelas, pagamentos: editEmpId ? (emprestimos.find(e => e.id === editEmpId)?.pagamentos || []) : [] };
    setEmprestimos(prev => editEmpId ? prev.map(e => e.id === editEmpId ? emp : e) : [emp, ...prev]);
    setModalEmp(false);
  };
  const abrirEmp = (emp = null) => {
    if (emp) { setEditEmpId(emp.id); setFormEmp({ devedor: emp.devedor, descricao: emp.descricao, valorOriginal: String(emp.valorOriginal), jurosPorc: String(emp.jurosPorc), tipoJuros: emp.tipoJuros, numParcelas: String(emp.numParcelas), dataInicio: emp.dataInicio, observacao: emp.observacao || '' }); }
    else { setEditEmpId(null); setFormEmp({ devedor: '', descricao: '', valorOriginal: '', jurosPorc: '0', tipoJuros: 'simples', numParcelas: '1', dataInicio: today(), observacao: '' }); }
    setModalEmp(true);
  };
  const registrarPgto = () => {
    if (!formPgto.valor) { Alert.alert('Informe o valor!'); return; }
    setEmprestimos(prev => prev.map(e => e.id === detalheEmp.id ? { ...e, pagamentos: [...(e.pagamentos || []), { valor: Number(formPgto.valor), data: formPgto.data, obs: formPgto.obs }] } : e));
    setDetalheEmp(prev => ({ ...prev, pagamentos: [...(prev.pagamentos || []), { valor: Number(formPgto.valor), data: formPgto.data, obs: formPgto.obs }] }));
    setFormPgto({ valor: '', data: today(), obs: '' });
    setModalPgto(false);
  };

  if (!ready) return (
    <View style={{ flex: 1, backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ fontSize: 40 }}>💰</Text>
      <Text style={{ color: C.purple, fontSize: 16, marginTop: 12 }}>Carregando...</Text>
    </View>
  );

  const ABAS = [
    { id: 'resumo', label: '📊' },
    { id: 'lancamentos', label: '📋' },
    { id: 'categorias', label: '🗂️' },
    { id: 'investimentos', label: '📈' },
    { id: 'emprestimos', label: '🤝' },
  ];

  const saldoCor = saldo >= 0 ? C.green : C.red;
  const rentCor = rentGeral >= 0 ? C.green : C.red;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }}>
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />

      {/* Header */}
      <View style={{ backgroundColor: '#1a1a3e', paddingHorizontal: 16, paddingTop: Platform.OS === 'android' ? 12 : 4, paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: C.border }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <View>
            <Text style={{ fontSize: 20, fontWeight: '700', color: C.purple }}>💰 Meu Dinheiro</Text>
            <Text style={{ fontSize: 11, color: '#7c6fb0' }}>controle financeiro pessoal</Text>
          </View>
          <Text style={{ color: C.orange, fontWeight: '700', fontSize: 13 }}>{mesRef}</Text>
        </View>
        {/* Tabs */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={{ flexDirection: 'row', gap: 6 }}>
            {ABAS.map(a => (
              <TouchableOpacity key={a.id} onPress={() => setAba(a.id)}
                style={{ paddingHorizontal: 16, paddingVertical: 6, borderRadius: 8, backgroundColor: aba === a.id ? C.accent : 'transparent' }}>
                <Text style={{ fontSize: 18 }}>{a.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
        <Text style={{ fontSize: 11, color: C.muted, marginTop: 4 }}>
          {aba === 'resumo' ? 'Resumo' : aba === 'lancamentos' ? 'Lançamentos' : aba === 'categorias' ? 'Categorias' : aba === 'investimentos' ? 'Investimentos' : 'Empréstimos'}
        </Text>
      </View>

      {/* Seletor de mês */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ backgroundColor: '#12122a', maxHeight: 42 }}>
        <View style={{ flexDirection: 'row', gap: 4, padding: 6 }}>
          {meses.map(m => (
            <TouchableOpacity key={m} onPress={() => setMesRef(m)}
              style={{ paddingHorizontal: 12, paddingVertical: 4, borderRadius: 8, borderWidth: 1, borderColor: mesRef === m ? C.purple : C.border, backgroundColor: mesRef === m ? '#312e81' : 'transparent' }}>
              <Text style={{ color: mesRef === m ? C.purple : C.muted, fontSize: 12 }}>{m}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 14 }}>

        {/* ════ RESUMO ════ */}
        {aba === 'resumo' && (
          <>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 4 }}>
              {[
                { l: 'Receitas', v: fmt(totalReceitas), c: C.green },
                { l: 'Despesas', v: fmt(totalDespesas), c: C.red },
                { l: 'Saldo', v: fmt(saldo), c: saldoCor },
                { l: 'A Receber', v: fmt(totalEmAberto), c: C.orange },
              ].map(c => (
                <Card key={c.l} style={{ flex: 1, minWidth: '45%' }} borderColor={c.c + '44'}>
                  <Lbl>{c.l}</Lbl>
                  <BigNum value={c.v} color={c.c} />
                </Card>
              ))}
            </View>

            <Card borderColor={C.blue + '44'}>
              <Lbl>💼 Patrimônio investido</Lbl>
              <BigNum value={fmt(totalAtualGeral)} color={C.blue} />
              <Text style={{ color: rentCor, fontSize: 12, marginTop: 4, fontWeight: '700' }}>
                {rentGeral >= 0 ? '▲' : '▼'} {fmtPct(Math.abs(rentGeral))}  ({fmt(totalAtualGeral - totalAportadoGeral)})
              </Text>
            </Card>

            <Card>
              <Lbl>🎯 Meta de economia (R$)</Lbl>
              <Inp value={String(meta)} onChangeText={v => setMeta(Number(v) || 0)} keyboardType="numeric" style={{ marginBottom: 8 }} />
              <Barra pct={meta > 0 ? (saldo / meta) * 100 : 0} cor={saldo >= meta ? C.green : C.accent} />
              <Text style={{ color: saldo >= meta ? C.green : C.yellow, fontSize: 12, marginTop: 6, fontWeight: '700' }}>
                {saldo >= meta ? '🎉 Meta atingida!' : `${fmt(Math.max(0, saldo))} de ${fmt(meta)}`}
              </Text>
            </Card>

            <Card>
              <Lbl>➕ Ações rápidas</Lbl>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
                <Btn label="💚 + Receita" cor={C.green} bg="#064e3b" onPress={() => abrirTx('receita')} style={{ flex: 1 }} />
                <Btn label="🔴 + Despesa" cor={C.red} bg="#7f1d1d" onPress={() => abrirTx('despesa')} style={{ flex: 1 }} />
                <Btn label="📈 + Investimento" cor={C.blue} bg="#1e3a5f" onPress={() => { setAba('investimentos'); abrirInv(); }} style={{ flex: 1 }} />
                <Btn label="🤝 + Empréstimo" cor={C.orange} bg="#7c2d12" onPress={() => { setAba('emprestimos'); abrirEmp(); }} style={{ flex: 1 }} />
              </View>
            </Card>

            <Card>
              <Lbl>🕐 Últimos lançamentos</Lbl>
              {doMes.length === 0 && <Text style={{ color: C.muted, textAlign: 'center', padding: 12 }}>Nenhum lançamento este mês.</Text>}
              {doMes.slice(0, 8).map(t => (
                <View key={t.id} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#1e1e4b' }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: C.text, fontSize: 13 }}>{t.descricao}</Text>
                    <Text style={{ color: C.muted, fontSize: 11 }}>{t.data} {t.categoria ? `· ${t.categoria}` : ''}</Text>
                  </View>
                  <Text style={{ color: t.tipo === 'receita' ? C.green : C.red, fontWeight: '700', fontSize: 14 }}>
                    {t.tipo === 'receita' ? '+' : '-'}{fmt(t.valor)}
                  </Text>
                </View>
              ))}
            </Card>
          </>
        )}

        {/* ════ LANÇAMENTOS ════ */}
        {aba === 'lancamentos' && (
          <>
            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 14 }}>
              <Btn label="+ Receita" cor={C.green} bg="#064e3b" onPress={() => abrirTx('receita')} style={{ flex: 1 }} />
              <Btn label="+ Despesa" cor={C.red} bg="#7f1d1d" onPress={() => abrirTx('despesa')} style={{ flex: 1 }} />
            </View>
            {doMes.length === 0 && <Card><Text style={{ color: C.muted, textAlign: 'center', padding: 12 }}>Nenhum lançamento em {mesRef}.</Text></Card>}
            {doMes.map(t => (
              <Card key={t.id}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: C.text, fontSize: 14, fontWeight: '600' }}>{t.descricao}</Text>
                    <Text style={{ color: C.muted, fontSize: 11, marginTop: 2 }}>{t.data} · {t.tipo === 'receita' ? 'Receita' : t.categoria} · {t.metodo}</Text>
                    {t.observacao ? <Text style={{ color: '#9ca3af', fontSize: 11, fontStyle: 'italic' }}>{t.observacao}</Text> : null}
                  </View>
                  <Text style={{ color: t.tipo === 'receita' ? C.green : C.red, fontWeight: '700', fontSize: 15 }}>
                    {t.tipo === 'receita' ? '+' : '-'}{fmt(t.valor)}
                  </Text>
                </View>
                <View style={{ flexDirection: 'row', gap: 8, marginTop: 8, justifyContent: 'flex-end' }}>
                  <TouchableOpacity onPress={() => abrirTx(t.tipo, t)} style={{ backgroundColor: '#312e81', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 }}>
                    <Text style={{ color: '#a5b4fc', fontSize: 11 }}>✏️ Editar</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => { Alert.alert('Excluir?', t.descricao, [{ text: 'Cancelar' }, { text: 'Excluir', style: 'destructive', onPress: () => setTransacoes(prev => prev.filter(x => x.id !== t.id)) }]); }} style={{ backgroundColor: '#450a0a', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 }}>
                    <Text style={{ color: C.red, fontSize: 11 }}>🗑️ Excluir</Text>
                  </TouchableOpacity>
                </View>
              </Card>
            ))}
          </>
        )}

        {/* ════ CATEGORIAS ════ */}
        {aba === 'categorias' && (
          <Card>
            <Lbl>🗂️ Despesas por categoria — {mesRef}</Lbl>
            {CATEGORIAS.map(cat => {
              const gasto = porCategoria[cat.nome] || 0;
              const orc = orcamentos[cat.nome] || 0;
              const pct = orc > 0 ? (gasto / orc) * 100 : 0;
              const estourou = orc > 0 && gasto > orc;
              return (
                <View key={cat.nome} style={{ marginBottom: 18 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                    <Text style={{ color: C.text, fontSize: 13 }}>{cat.nome}</Text>
                    <Text style={{ color: estourou ? C.red : C.muted, fontSize: 12, fontWeight: estourou ? '700' : '400' }}>
                      {fmt(gasto)}{orc > 0 ? ` / ${fmt(orc)}` : ''}{estourou ? ' ⚠️' : ''}
                    </Text>
                  </View>
                  <Barra pct={pct} cor={estourou ? '#ef4444' : cat.cor} />
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 }}>
                    <Text style={{ color: C.muted, fontSize: 11 }}>Orçamento R$:</Text>
                    <Inp value={orcamentos[cat.nome] ? String(orcamentos[cat.nome]) : ''} onChangeText={v => setOrcamentos(p => ({ ...p, [cat.nome]: Number(v) || 0 }))} keyboardType="numeric" placeholder="0,00" style={{ flex: 1, padding: 6, fontSize: 12 }} />
                  </View>
                </View>
              );
            })}
          </Card>
        )}

        {/* ════ INVESTIMENTOS ════ */}
        {aba === 'investimentos' && (
          <>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 4 }}>
              {[
                { l: 'Total Aportado', v: fmt(totalAportadoGeral), c: C.blue },
                { l: 'Valor Atual', v: fmt(totalAtualGeral), c: '#a78bfa' },
                { l: 'Rendimento', v: fmt(totalAtualGeral - totalAportadoGeral), c: rentCor },
              ].map(c => (
                <Card key={c.l} style={{ flex: 1, minWidth: '45%' }} borderColor={c.c + '44'}>
                  <Lbl>{c.l}</Lbl>
                  <BigNum value={c.v} color={c.c} />
                </Card>
              ))}
            </View>
            <Btn label="📈 + Novo Investimento" cor={C.blue} bg="#1e3a5f" onPress={() => abrirInv()} style={{ marginBottom: 14 }} />
            {investimentos.length === 0 && <Card><Text style={{ color: C.muted, textAlign: 'center', padding: 12 }}>Nenhum investimento. Adicione acima ☝️</Text></Card>}
            {investimentos.map(inv => {
              const aportado = Number(inv.valorAportado);
              const atual = Number(inv.valorAtual || inv.valorAportado);
              const rend = atual - aportado;
              const pctR = aportado > 0 ? (rend / aportado) * 100 : 0;
              const pos = rend >= 0;
              return (
                <Card key={inv.id}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: C.text, fontSize: 14, fontWeight: '700' }}>{inv.nome}</Text>
                      <Text style={{ color: C.muted, fontSize: 11 }}>{inv.tipo} · {inv.dataCompra}</Text>
                      {inv.observacao ? <Text style={{ color: '#9ca3af', fontSize: 11, fontStyle: 'italic' }}>{inv.observacao}</Text> : null}
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={{ color: '#a78bfa', fontWeight: '700', fontSize: 15 }}>{fmt(atual)}</Text>
                      <Text style={{ color: pos ? C.green : C.red, fontSize: 12, fontWeight: '600' }}>{pos ? '▲' : '▼'} {fmtPct(Math.abs(pctR))}</Text>
                      <Text style={{ color: C.muted, fontSize: 11 }}>Aport: {fmt(aportado)}</Text>
                    </View>
                  </View>
                  <View style={{ marginTop: 10 }}><Barra pct={Math.min(100, Math.max(0, 50 + pctR * 2))} cor={pos ? C.green : C.red} height={5} /></View>
                  <View style={{ flexDirection: 'row', gap: 8, marginTop: 10, justifyContent: 'flex-end' }}>
                    <TouchableOpacity onPress={() => abrirInv(inv)} style={{ backgroundColor: '#312e81', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 }}>
                      <Text style={{ color: '#a5b4fc', fontSize: 11 }}>✏️ Editar</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => { Alert.alert('Excluir?', inv.nome, [{ text: 'Cancelar' }, { text: 'Excluir', style: 'destructive', onPress: () => setInvestimentos(prev => prev.filter(i => i.id !== inv.id)) }]); }} style={{ backgroundColor: '#450a0a', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 }}>
                      <Text style={{ color: C.red, fontSize: 11 }}>🗑️ Remover</Text>
                    </TouchableOpacity>
                  </View>
                </Card>
              );
            })}
          </>
        )}

        {/* ════ EMPRÉSTIMOS ════ */}
        {aba === 'emprestimos' && (
          <>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 4 }}>
              {[
                { l: 'Total Emprestado', v: fmt(emprestimos.reduce((s, e) => s + Number(e.valorOriginal), 0)), c: C.orange },
                { l: 'Em Aberto', v: fmt(totalEmAberto), c: totalEmAberto > 0 ? C.red : C.green },
              ].map(c => (
                <Card key={c.l} style={{ flex: 1 }} borderColor={c.c + '44'}>
                  <Lbl>{c.l}</Lbl>
                  <BigNum value={c.v} color={c.c} />
                </Card>
              ))}
            </View>
            <Btn label="🤝 + Novo Empréstimo" cor={C.orange} bg="#7c2d12" onPress={() => abrirEmp()} style={{ marginBottom: 14 }} />
            {emprestimos.length === 0 && <Card><Text style={{ color: C.muted, textAlign: 'center', padding: 12 }}>Nenhum empréstimo. Adicione acima ☝️</Text></Card>}
            {emprestimos.map(emp => {
              const totalDev = emp.parcelas.reduce((s, p) => s + p.valorParcela, 0);
              const totalPg = (emp.pagamentos || []).reduce((s, p) => s + Number(p.valor), 0);
              const emAberto = Math.max(0, totalDev - totalPg);
              const pct = totalDev > 0 ? (totalPg / totalDev) * 100 : 0;
              const quitado = emAberto <= 0.01;
              return (
                <TouchableOpacity key={emp.id} onPress={() => setDetalheEmp(emp)}>
                  <Card borderColor={quitado ? C.green + '44' : C.orange + '33'}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <View style={{ flex: 1 }}>
                        <Text style={{ color: C.text, fontSize: 14, fontWeight: '700' }}>{emp.devedor}</Text>
                        <Text style={{ color: C.muted, fontSize: 11 }}>{emp.descricao} · {emp.numParcelas}x · {emp.dataInicio}</Text>
                        {Number(emp.jurosPorc) > 0 && <Text style={{ color: C.yellow, fontSize: 11 }}>{emp.jurosPorc}% a.m. ({emp.tipoJuros})</Text>}
                      </View>
                      <View style={{ alignItems: 'flex-end' }}>
                        {quitado
                          ? <Text style={{ color: C.green, fontWeight: '700', fontSize: 14 }}>🎉 Quitado</Text>
                          : <Text style={{ color: C.orange, fontWeight: '700', fontSize: 15 }}>{fmt(emAberto)}</Text>
                        }
                        <Text style={{ color: C.muted, fontSize: 11 }}>Total: {fmt(totalDev)}</Text>
                      </View>
                    </View>
                    <View style={{ marginTop: 10 }}>
                      <Barra pct={pct} cor={quitado ? C.green : C.orange} height={6} />
                      <Text style={{ color: C.muted, fontSize: 11, marginTop: 4 }}>{pct.toFixed(0)}% pago · toque para detalhes</Text>
                    </View>
                  </Card>
                </TouchableOpacity>
              );
            })}
          </>
        )}
      </ScrollView>

      {/* ── MODAL TRANSAÇÃO ── */}
      <Modal visible={modalTx} animationType="slide" transparent>
        <View style={{ flex: 1, backgroundColor: '#000000aa', justifyContent: 'flex-end' }}>
          <View style={{ backgroundColor: '#1a1a3e', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24, maxHeight: '90%' }}>
            <ScrollView>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 }}>
                <Text style={{ color: tipoTx === 'receita' ? C.green : C.red, fontSize: 16, fontWeight: '700' }}>{editTxId ? '✏️ Editar' : '➕ Nova'} {tipoTx === 'receita' ? 'Receita' : 'Despesa'}</Text>
                <TouchableOpacity onPress={() => setModalTx(false)}><Text style={{ color: C.muted, fontSize: 22 }}>✕</Text></TouchableOpacity>
              </View>
              <View style={{ flexDirection: 'row', gap: 8, marginBottom: 14 }}>
                {['receita', 'despesa'].map(t => (
                  <TouchableOpacity key={t} onPress={() => setTipoTx(t)} style={{ flex: 1, padding: 8, borderRadius: 8, borderWidth: 1, borderColor: t === 'receita' ? C.green : C.red, backgroundColor: tipoTx === t ? (t === 'receita' ? '#064e3b' : '#7f1d1d') : 'transparent' }}>
                    <Text style={{ color: t === 'receita' ? C.green : C.red, textAlign: 'center', fontSize: 13 }}>{t === 'receita' ? '💚 Receita' : '🔴 Despesa'}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <Lbl>Data</Lbl>
              <Inp value={formTx.data} onChangeText={v => setFormTx(p => ({ ...p, data: v }))} placeholder="AAAA-MM-DD" style={{ marginBottom: 12 }} />
              <Lbl>Descrição</Lbl>
              <Inp value={formTx.descricao} onChangeText={v => setFormTx(p => ({ ...p, descricao: v }))} placeholder="Ex: Salário, Mercado..." style={{ marginBottom: 12 }} />
              <Lbl>Valor (R$)</Lbl>
              <Inp value={formTx.valor} onChangeText={v => setFormTx(p => ({ ...p, valor: v }))} keyboardType="numeric" placeholder="0,00" style={{ marginBottom: 12 }} />
              {tipoTx === 'despesa' && (<>
                <Lbl>Categoria</Lbl>
                <SimplePicker options={CATEGORIAS.map(c => c.nome)} value={formTx.categoria} onChange={v => setFormTx(p => ({ ...p, categoria: v }))} />
              </>)}
              <Lbl>Método</Lbl>
              <SimplePicker options={METODOS} value={formTx.metodo} onChange={v => setFormTx(p => ({ ...p, metodo: v }))} />
              <Lbl>Observação</Lbl>
              <Inp value={formTx.observacao} onChangeText={v => setFormTx(p => ({ ...p, observacao: v }))} placeholder="Opcional..." style={{ marginBottom: 16 }} />
              <Btn label={editTxId ? 'Salvar alterações' : `Adicionar ${tipoTx === 'receita' ? 'receita' : 'despesa'}`} cor={tipoTx === 'receita' ? C.green : C.red} bg={tipoTx === 'receita' ? '#064e3b' : '#7f1d1d'} onPress={salvarTx} />
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ── MODAL INVESTIMENTO ── */}
      <Modal visible={modalInv} animationType="slide" transparent>
        <View style={{ flex: 1, backgroundColor: '#000000aa', justifyContent: 'flex-end' }}>
          <View style={{ backgroundColor: '#1a1a3e', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24, maxHeight: '90%' }}>
            <ScrollView>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 }}>
                <Text style={{ color: C.blue, fontSize: 16, fontWeight: '700' }}>{editInvId ? '✏️ Editar' : '📈 Novo'} Investimento</Text>
                <TouchableOpacity onPress={() => setModalInv(false)}><Text style={{ color: C.muted, fontSize: 22 }}>✕</Text></TouchableOpacity>
              </View>
              <Lbl>Nome do ativo</Lbl>
              <Inp value={formInv.nome} onChangeText={v => setFormInv(p => ({ ...p, nome: v }))} placeholder="Ex: PETR4, Bitcoin, CDB..." style={{ marginBottom: 12 }} />
              <Lbl>Tipo</Lbl>
              <SimplePicker options={TIPOS_INVESTIMENTO.map(t => t.nome)} value={formInv.tipo} onChange={v => setFormInv(p => ({ ...p, tipo: v }))} />
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <View style={{ flex: 1 }}><Lbl>Valor aportado (R$)</Lbl><Inp value={formInv.valorAportado} onChangeText={v => setFormInv(p => ({ ...p, valorAportado: v }))} keyboardType="numeric" placeholder="0,00" style={{ marginBottom: 12 }} /></View>
                <View style={{ flex: 1 }}><Lbl>Valor atual (R$)</Lbl><Inp value={formInv.valorAtual} onChangeText={v => setFormInv(p => ({ ...p, valorAtual: v }))} keyboardType="numeric" placeholder="0,00" style={{ marginBottom: 12 }} /></View>
              </View>
              <Lbl>Data compra</Lbl>
              <Inp value={formInv.dataCompra} onChangeText={v => setFormInv(p => ({ ...p, dataCompra: v }))} placeholder="AAAA-MM-DD" style={{ marginBottom: 12 }} />
              <Lbl>Observação</Lbl>
              <Inp value={formInv.observacao} onChangeText={v => setFormInv(p => ({ ...p, observacao: v }))} placeholder="Opcional..." style={{ marginBottom: 16 }} />
              <Btn label={editInvId ? 'Salvar alterações' : 'Adicionar investimento'} cor={C.blue} bg="#1e3a5f" onPress={salvarInv} />
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ── MODAL EMPRÉSTIMO ── */}
      <Modal visible={modalEmp} animationType="slide" transparent>
        <View style={{ flex: 1, backgroundColor: '#000000aa', justifyContent: 'flex-end' }}>
          <View style={{ backgroundColor: '#1a1a3e', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24, maxHeight: '92%' }}>
            <ScrollView>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 }}>
                <Text style={{ color: C.orange, fontSize: 16, fontWeight: '700' }}>{editEmpId ? '✏️ Editar' : '🤝 Novo'} Empréstimo</Text>
                <TouchableOpacity onPress={() => setModalEmp(false)}><Text style={{ color: C.muted, fontSize: 22 }}>✕</Text></TouchableOpacity>
              </View>
              <Lbl>Nome do devedor</Lbl>
              <Inp value={formEmp.devedor} onChangeText={v => setFormEmp(p => ({ ...p, devedor: v }))} placeholder="Ex: João Silva" style={{ marginBottom: 12 }} />
              <Lbl>Motivo / descrição</Lbl>
              <Inp value={formEmp.descricao} onChangeText={v => setFormEmp(p => ({ ...p, descricao: v }))} placeholder="Ex: emergência, compra..." style={{ marginBottom: 12 }} />
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <View style={{ flex: 1 }}><Lbl>Valor (R$)</Lbl><Inp value={formEmp.valorOriginal} onChangeText={v => setFormEmp(p => ({ ...p, valorOriginal: v }))} keyboardType="numeric" placeholder="0,00" style={{ marginBottom: 12 }} /></View>
                <View style={{ flex: 1 }}><Lbl>Nº Parcelas</Lbl><Inp value={formEmp.numParcelas} onChangeText={v => setFormEmp(p => ({ ...p, numParcelas: v }))} keyboardType="numeric" placeholder="1" style={{ marginBottom: 12 }} /></View>
              </View>
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <View style={{ flex: 1 }}><Lbl>Juros/parcela (%)</Lbl><Inp value={formEmp.jurosPorc} onChangeText={v => setFormEmp(p => ({ ...p, jurosPorc: v }))} keyboardType="numeric" placeholder="0" style={{ marginBottom: 12 }} /></View>
                <View style={{ flex: 1 }}><Lbl>Data início</Lbl><Inp value={formEmp.dataInicio} onChangeText={v => setFormEmp(p => ({ ...p, dataInicio: v }))} placeholder="AAAA-MM-DD" style={{ marginBottom: 12 }} /></View>
              </View>
              <Lbl>Tipo de juros</Lbl>
              <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
                {[['simples', '📐 Simples'], ['composto', '📈 Compostos']].map(([v, l]) => (
                  <TouchableOpacity key={v} onPress={() => setFormEmp(p => ({ ...p, tipoJuros: v }))} style={{ flex: 1, padding: 8, borderRadius: 8, borderWidth: 1, borderColor: C.orange, backgroundColor: formEmp.tipoJuros === v ? '#7c2d12' : 'transparent' }}>
                    <Text style={{ color: C.orange, textAlign: 'center', fontSize: 12 }}>{l}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <Lbl>Observação</Lbl>
              <Inp value={formEmp.observacao} onChangeText={v => setFormEmp(p => ({ ...p, observacao: v }))} placeholder="Opcional..." style={{ marginBottom: 16 }} />
              <Btn label={editEmpId ? 'Salvar alterações' : 'Registrar empréstimo'} cor={C.orange} bg="#7c2d12" onPress={salvarEmp} />
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ── MODAL DETALHE EMPRÉSTIMO ── */}
      <Modal visible={!!detalheEmp} animationType="slide" transparent>
        <View style={{ flex: 1, backgroundColor: '#000000aa', justifyContent: 'flex-end' }}>
          <View style={{ backgroundColor: '#1a1a3e', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24, maxHeight: '92%' }}>
            {detalheEmp && (() => {
              const emp = emprestimos.find(e => e.id === detalheEmp.id) || detalheEmp;
              const totalDev = emp.parcelas.reduce((s, p) => s + p.valorParcela, 0);
              const totalPg = (emp.pagamentos || []).reduce((s, p) => s + Number(p.valor), 0);
              const emAberto = Math.max(0, totalDev - totalPg);
              const pct = totalDev > 0 ? (totalPg / totalDev) * 100 : 0;
              const quitado = emAberto <= 0.01;
              let saldoPg = totalPg;
              const statusParcelas = emp.parcelas.map(p => {
                if (saldoPg >= p.valorParcela) { saldoPg -= p.valorParcela; return 'pago'; }
                if (saldoPg > 0) { saldoPg = 0; return 'parcial'; }
                return 'pendente';
              });
              return (
                <ScrollView>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 }}>
                    <View><Text style={{ color: C.orange, fontSize: 16, fontWeight: '700' }}>🤝 {emp.devedor}</Text>
                    <Text style={{ color: C.muted, fontSize: 11 }}>{emp.descricao} · {emp.dataInicio}</Text></View>
                    <TouchableOpacity onPress={() => setDetalheEmp(null)}><Text style={{ color: C.muted, fontSize: 22 }}>✕</Text></TouchableOpacity>
                  </View>
                  <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
                    {[{ l: 'Emprestado', v: fmt(emp.valorOriginal), c: C.muted }, { l: 'Pago', v: fmt(totalPg), c: C.green }, { l: 'Em aberto', v: fmt(emAberto), c: quitado ? C.green : C.red }].map(c => (
                      <View key={c.l} style={{ flex: 1, backgroundColor: '#0d0d1a', borderRadius: 10, padding: 10, alignItems: 'center' }}>
                        <Text style={{ color: C.muted, fontSize: 10 }}>{c.l}</Text>
                        <Text style={{ color: c.c, fontWeight: '700', fontSize: 13, marginTop: 2 }}>{c.v}</Text>
                      </View>
                    ))}
                  </View>
                  <Barra pct={pct} cor={quitado ? C.green : C.orange} height={10} />
                  <Text style={{ color: quitado ? C.green : C.muted, fontSize: 12, textAlign: 'right', marginTop: 4, marginBottom: 12, fontWeight: quitado ? '700' : '400' }}>
                    {quitado ? '🎉 Quitado!' : `${pct.toFixed(1)}% pago`}
                  </Text>
                  <Text style={{ color: C.orange, fontSize: 12, fontWeight: '700', marginBottom: 8 }}>📋 Parcelas</Text>
                  {emp.parcelas.map((p, i) => {
                    const st = statusParcelas[i];
                    const stCor = st === 'pago' ? C.green : st === 'parcial' ? C.yellow : C.red;
                    return (
                      <View key={p.numero} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: '#1e1e4b' }}>
                        <Text style={{ color: C.muted, fontSize: 12 }}>Parcela {p.numero}</Text>
                        <Text style={{ color: C.muted, fontSize: 12 }}>{p.dataVencimento}</Text>
                        <Text style={{ color: C.orange, fontSize: 12, fontWeight: '600' }}>{fmt(p.valorParcela)}</Text>
                        <Text style={{ color: stCor, fontSize: 11 }}>{st === 'pago' ? '✅' : st === 'parcial' ? '⚡' : '⏳'}</Text>
                      </View>
                    );
                  })}
                  {(emp.pagamentos || []).length > 0 && (<>
                    <Text style={{ color: C.green, fontSize: 12, fontWeight: '700', marginTop: 14, marginBottom: 8 }}>💰 Pagamentos recebidos</Text>
                    {(emp.pagamentos || []).map((pg, i) => (
                      <View key={i} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 5, borderBottomWidth: 1, borderBottomColor: '#1e1e4b' }}>
                        <Text style={{ color: C.muted, fontSize: 12 }}>{pg.data}</Text>
                        <Text style={{ color: '#9ca3af', fontSize: 12, fontStyle: 'italic' }}>{pg.obs || '—'}</Text>
                        <Text style={{ color: C.green, fontSize: 12, fontWeight: '700' }}>+{fmt(pg.valor)}</Text>
                      </View>
                    ))}
                  </>)}
                  {!quitado && (
                    <Btn label="➕ Registrar pagamento recebido" cor={C.green} bg="#064e3b" onPress={() => setModalPgto(true)} style={{ marginTop: 16 }} />
                  )}
                  <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
                    <TouchableOpacity onPress={() => { setDetalheEmp(null); abrirEmp(emp); }} style={{ flex: 1, backgroundColor: '#312e81', padding: 10, borderRadius: 10 }}>
                      <Text style={{ color: '#a5b4fc', textAlign: 'center', fontSize: 12 }}>✏️ Editar</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => { Alert.alert('Excluir?', emp.devedor, [{ text: 'Cancelar' }, { text: 'Excluir', style: 'destructive', onPress: () => { setEmprestimos(prev => prev.filter(e => e.id !== emp.id)); setDetalheEmp(null); } }]); }} style={{ flex: 1, backgroundColor: '#450a0a', padding: 10, borderRadius: 10 }}>
                      <Text style={{ color: C.red, textAlign: 'center', fontSize: 12 }}>🗑️ Excluir</Text>
                    </TouchableOpacity>
                  </View>
                </ScrollView>
              );
            })()}
          </View>
        </View>
      </Modal>

      {/* ── MODAL PAGAMENTO ── */}
      <Modal visible={modalPgto} animationType="slide" transparent>
        <View style={{ flex: 1, backgroundColor: '#000000aa', justifyContent: 'flex-end' }}>
          <View style={{ backgroundColor: '#1a1a3e', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 }}>
              <Text style={{ color: C.green, fontSize: 16, fontWeight: '700' }}>💰 Registrar Pagamento</Text>
              <TouchableOpacity onPress={() => setModalPgto(false)}><Text style={{ color: C.muted, fontSize: 22 }}>✕</Text></TouchableOpacity>
            </View>
            <Lbl>Valor recebido (R$)</Lbl>
            <Inp value={formPgto.valor} onChangeText={v => setFormPgto(p => ({ ...p, valor: v }))} keyboardType="numeric" placeholder="0,00" style={{ marginBottom: 12 }} />
            <Lbl>Data</Lbl>
            <Inp value={formPgto.data} onChangeText={v => setFormPgto(p => ({ ...p, data: v }))} placeholder="AAAA-MM-DD" style={{ marginBottom: 12 }} />
            <Lbl>Observação</Lbl>
            <Inp value={formPgto.obs} onChangeText={v => setFormPgto(p => ({ ...p, obs: v }))} placeholder="Ex: Pix recebido..." style={{ marginBottom: 16 }} />
            <Btn label="✅ Confirmar pagamento" cor={C.green} bg="#064e3b" onPress={registrarPgto} />
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
}
