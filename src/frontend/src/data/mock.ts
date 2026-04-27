// ─────────────────────────────────────────────
//  GoldLock — Dados Mock para desenvolvimento UI
//  Substituir progressivamente por chamadas à API
// ─────────────────────────────────────────────

import { subDays, format } from 'date-fns';

// ── Tipos ─────────────────────────────────────

export type AccountType = 'checking' | 'savings' | 'investment';

export interface Account {
  id: string;
  bankName: string;
  bankLogo: string;
  accountName: string;
  iban: string;
  balance: number;
  currency: string;
  type: AccountType;
  lastSynced: string;
  color: string;
}

export interface Category {
  id: string;
  name: string;
  icon: string;
  color: string;
  irsCategory: string | null;
}

export interface Transaction {
  id: string;
  accountId: string;
  categoryId: string;
  description: string;
  amount: number;
  date: string;
  isExpense: boolean;
  isRecurring: boolean;
  mlConfidence: number;
}

export interface Budget {
  id: string;
  categoryId: string;
  name: string;
  limit: number;
  spent: number;
  period: 'monthly';
  alertThreshold: number;
}

export interface Goal {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  deadline: string;
  icon: string;
  color: string;
}

// ── Categorias ────────────────────────────────

export const CATEGORIES: Record<string, Category> = {
  supermercado:   { id: 'supermercado',   name: 'Supermercado',     icon: '🛒', color: '#4CAF50', irsCategory: null },
  restauracao:    { id: 'restauracao',    name: 'Restauração',      icon: '🍽️', color: '#FF9800', irsCategory: 'restauracao' },
  transportes:    { id: 'transportes',    name: 'Transportes',      icon: '🚗', color: '#2196F3', irsCategory: 'transportes' },
  saude:          { id: 'saude',          name: 'Saúde',            icon: '❤️', color: '#F44336', irsCategory: 'saude' },
  educacao:       { id: 'educacao',       name: 'Educação',         icon: '🎓', color: '#9C27B0', irsCategory: 'educacao' },
  habitacao:      { id: 'habitacao',      name: 'Habitação',        icon: '🏠', color: '#795548', irsCategory: 'habitacao' },
  servicos:       { id: 'servicos',       name: 'Serviços',         icon: '⚡', color: '#607D8B', irsCategory: null },
  lazer:          { id: 'lazer',          name: 'Lazer',            icon: '🎮', color: '#E91E63', irsCategory: null },
  subscricoes:    { id: 'subscricoes',    name: 'Subscrições',      icon: '🔁', color: '#FF5722', irsCategory: null },
  salario:        { id: 'salario',        name: 'Salário',          icon: '💰', color: '#4CAF50', irsCategory: null },
  transferencias: { id: 'transferencias', name: 'Transferências',   icon: '↔️', color: '#9E9E9E', irsCategory: null },
  outros:         { id: 'outros',         name: 'Outros',           icon: '•',  color: '#757575', irsCategory: null },
};

// ── Contas Bancárias ──────────────────────────

export const MOCK_ACCOUNTS: Account[] = [
  {
    id: 'acc-1',
    bankName: 'Caixa Geral de Depósitos',
    bankLogo: 'CGD',
    accountName: 'Conta Ordenado',
    iban: 'PT50 0035 0000 0001 2345 6780 9',
    balance: 3_842.50,
    currency: 'EUR',
    type: 'checking',
    lastSynced: new Date().toISOString(),
    color: '#003B71',
  },
  {
    id: 'acc-2',
    bankName: 'Millennium BCP',
    bankLogo: 'BCP',
    accountName: 'Conta Poupança',
    iban: 'PT50 0033 0000 4567 8901 2340 5',
    balance: 12_500.00,
    currency: 'EUR',
    type: 'savings',
    lastSynced: new Date().toISOString(),
    color: '#E31837',
  },
  {
    id: 'acc-3',
    bankName: 'NovoBanco',
    bankLogo: 'NB',
    accountName: 'Conta Corrente',
    iban: 'PT50 0007 0000 8901 2345 6780 1',
    balance: 1_250.30,
    currency: 'EUR',
    type: 'checking',
    lastSynced: subDays(new Date(), 1).toISOString(),
    color: '#FF6B00',
  },
];

// ── Transações ────────────────────────────────

const tx = (
  id: string,
  accountId: string,
  categoryId: string,
  description: string,
  amount: number,
  daysAgo: number,
  isExpense = true,
  isRecurring = false,
): Transaction => ({
  id,
  accountId,
  categoryId,
  description,
  amount,
  date: format(subDays(new Date(), daysAgo), 'yyyy-MM-dd'),
  isExpense,
  isRecurring,
  mlConfidence: 0.85 + Math.random() * 0.14,
});

export const MOCK_TRANSACTIONS: Transaction[] = [
  tx('t-01', 'acc-1', 'salario',       'Salário — Empresa XYZ',          2_100.00,  1,  false),
  tx('t-02', 'acc-1', 'habitacao',     'Renda Apartamento',                 750.00,  2,  true,  true),
  tx('t-03', 'acc-1', 'supermercado',  'Pingo Doce Cascais',                 87.40,  2),
  tx('t-04', 'acc-1', 'servicos',      'EDP Energia',                        62.30,  3,  true,  true),
  tx('t-05', 'acc-1', 'restauracao',   'Restaurante O Corvo',                34.50,  3),
  tx('t-06', 'acc-1', 'transportes',   'Galp Combustível',                   55.00,  4),
  tx('t-07', 'acc-1', 'subscricoes',   'Netflix',                            17.99,  5,  true,  true),
  tx('t-08', 'acc-1', 'saude',         'Farmácia Saúde+',                    28.60,  5),
  tx('t-09', 'acc-1', 'supermercado',  'Continente Online',                  64.20,  6),
  tx('t-10', 'acc-1', 'lazer',         'Cinema NOS',                         18.00,  7),
  tx('t-11', 'acc-2', 'transferencias','Transferência para poupança',        200.00,  7,  false),
  tx('t-12', 'acc-1', 'subscricoes',   'Spotify',                            10.99,  8,  true,  true),
  tx('t-13', 'acc-1', 'restauracao',   'Uber Eats',                          22.80,  8),
  tx('t-14', 'acc-1', 'educacao',      'Udemy — Curso de React',             29.99,  9),
  tx('t-15', 'acc-1', 'servicos',      'NOS Internet + TV',                  49.99,  9,  true,  true),
  tx('t-16', 'acc-1', 'transportes',   'CP Comboios — Assinatura',           52.50, 10,  true,  true),
  tx('t-17', 'acc-1', 'supermercado',  'Lidl',                               43.10, 11),
  tx('t-18', 'acc-1', 'saude',         'Consulta Dentista',                  80.00, 12),
  tx('t-19', 'acc-1', 'lazer',         'Decathlon',                          65.00, 13),
  tx('t-20', 'acc-1', 'restauracao',   'Tasca do João',                      41.00, 14),
  tx('t-21', 'acc-1', 'supermercado',  'Auchan',                             91.30, 15),
  tx('t-22', 'acc-1', 'servicos',      'Água — EPAL',                        18.40, 16,  true,  true),
  tx('t-23', 'acc-1', 'transportes',   'Uber',                               12.50, 17),
  tx('t-24', 'acc-1', 'outros',        'Amazon',                             35.99, 18),
  tx('t-25', 'acc-1', 'saude',         'Óptica Alves',                       120.00, 20),
];

// ── Orçamentos ────────────────────────────────

export const MOCK_BUDGETS: Budget[] = [
  { id: 'b-1', categoryId: 'supermercado', name: 'Supermercado',  limit: 300, spent: 286, period: 'monthly', alertThreshold: 80 },
  { id: 'b-2', categoryId: 'restauracao',  name: 'Restauração',   limit: 150, spent: 98,  period: 'monthly', alertThreshold: 80 },
  { id: 'b-3', categoryId: 'transportes',  name: 'Transportes',   limit: 150, spent: 120, period: 'monthly', alertThreshold: 80 },
  { id: 'b-4', categoryId: 'lazer',        name: 'Lazer',         limit: 100, spent: 83,  period: 'monthly', alertThreshold: 80 },
  { id: 'b-5', categoryId: 'subscricoes',  name: 'Subscrições',   limit: 50,  spent: 28.98, period: 'monthly', alertThreshold: 80 },
  { id: 'b-6', categoryId: 'saude',        name: 'Saúde',         limit: 100, spent: 228.60, period: 'monthly', alertThreshold: 80 },
];

// ── Metas de Poupança ─────────────────────────

export const MOCK_GOALS: Goal[] = [
  {
    id: 'g-1',
    name: 'Fundo de Emergência',
    targetAmount: 10_000,
    currentAmount: 7_200,
    deadline: '2025-12-31',
    icon: '🛡️',
    color: 'var(--gold)',
  },
  {
    id: 'g-2',
    name: 'Férias em Japão',
    targetAmount: 3_500,
    currentAmount: 1_840,
    deadline: '2025-08-01',
    icon: '✈️',
    color: '#0C8CE8',
  },
  {
    id: 'g-3',
    name: 'Entrada Habitação',
    targetAmount: 25_000,
    currentAmount: 12_500,
    deadline: '2027-01-01',
    icon: '🏠',
    color: '#22C55E',
  },
  {
    id: 'g-4',
    name: 'Portátil Novo',
    targetAmount: 1_800,
    currentAmount: 1_650,
    deadline: '2025-05-01',
    icon: '💻',
    color: '#F59E0B',
  },
];

// ── Tendência mensal (últimos 6 meses) ────────

export const MONTHLY_TREND = [
  { month: 'Nov', income: 2100, expenses: 1680 },
  { month: 'Dez', income: 2100, expenses: 2050 },
  { month: 'Jan', income: 2100, expenses: 1520 },
  { month: 'Fev', income: 2100, expenses: 1430 },
  { month: 'Mar', income: 2100, expenses: 1710 },
  { month: 'Abr', income: 2100, expenses: 1590 },
];

// ── Despesas por categoria (mês atual) ────────

export const SPENDING_BY_CATEGORY = [
  { name: 'Habitação',     value: 750,   color: '#795548' },
  { name: 'Supermercado',  value: 286,   color: '#4CAF50' },
  { name: 'Transportes',   value: 120,   color: '#2196F3' },
  { name: 'Saúde',         value: 228.6, color: '#F44336' },
  { name: 'Restauração',   value: 98,    color: '#FF9800' },
  { name: 'Serviços',      value: 130.7, color: '#607D8B' },
  { name: 'Lazer',         value: 83,    color: '#E91E63' },
  { name: 'Subscrições',   value: 28.98, color: '#FF5722' },
];

// ── Investimentos ─────────────────────────────

export type InvestmentType = 'stock' | 'etf' | 'bond' | 'crypto' | 'certificado' | 'deposito';
export type RiskLevel = 'guaranteed' | 'moderate' | 'high';

export interface Investment {
  id: string;
  name: string;
  ticker?: string;
  type: InvestmentType;
  quantity: number;
  purchasePrice: number;
  currentPrice: number;
  currency: string;
  riskLevel: RiskLevel;
  institution?: string;
  maturityDate?: string;
  annualRate?: number;
}

export const MOCK_INVESTMENTS: Investment[] = [
  {
    id: 'inv-1', name: 'Galp Energia', ticker: 'GALP', type: 'stock',
    quantity: 50, purchasePrice: 11.20, currentPrice: 13.45,
    currency: 'EUR', riskLevel: 'high',
  },
  {
    id: 'inv-2', name: 'EDP Renováveis', ticker: 'EDPR', type: 'stock',
    quantity: 30, purchasePrice: 19.80, currentPrice: 17.10,
    currency: 'EUR', riskLevel: 'high',
  },
  {
    id: 'inv-3', name: 'iShares MSCI World ETF', ticker: 'IWDA', type: 'etf',
    quantity: 25, purchasePrice: 85.40, currentPrice: 102.30,
    currency: 'EUR', riskLevel: 'moderate',
  },
  {
    id: 'inv-4', name: 'Amundi S&P 500 ETF', ticker: 'CSP1', type: 'etf',
    quantity: 20, purchasePrice: 71.20, currentPrice: 89.50,
    currency: 'EUR', riskLevel: 'moderate',
  },
  {
    id: 'inv-5', name: 'OT Portugal 2030', ticker: undefined, type: 'bond',
    quantity: 1000, purchasePrice: 1.00, currentPrice: 0.97,
    currency: 'EUR', riskLevel: 'moderate', annualRate: 3.20,
  },
  {
    id: 'inv-6', name: 'Bitcoin', ticker: 'BTC', type: 'crypto',
    quantity: 0.085, purchasePrice: 28_500, currentPrice: 62_400,
    currency: 'USD', riskLevel: 'high',
  },
  {
    id: 'inv-7', name: 'Ethereum', ticker: 'ETH', type: 'crypto',
    quantity: 1.2, purchasePrice: 1_840, currentPrice: 3_120,
    currency: 'USD', riskLevel: 'high',
  },
  {
    id: 'inv-8', name: 'Certificados de Aforro Série E', ticker: undefined, type: 'certificado',
    quantity: 5000, purchasePrice: 1.00, currentPrice: 1.00,
    currency: 'EUR', riskLevel: 'guaranteed',
    institution: 'IGCP / AforroNet', annualRate: 3.50,
  },
  {
    id: 'inv-9', name: 'Depósito a Prazo CGD 12M', ticker: undefined, type: 'deposito',
    quantity: 10_000, purchasePrice: 1.00, currentPrice: 1.00,
    currency: 'EUR', riskLevel: 'guaranteed',
    institution: 'Caixa Geral de Depósitos', annualRate: 2.75,
    maturityDate: '2025-09-15',
  },
  {
    id: 'inv-10', name: 'NOS SGPS', ticker: 'NOS', type: 'stock',
    quantity: 100, purchasePrice: 3.90, currentPrice: 4.15,
    currency: 'EUR', riskLevel: 'high',
  },
];

// ── Quizzes de Literacia Financeira ───────────

export type QuizCategory = 'orcamentacao' | 'investimento' | 'impostos' | 'credito';
export type QuizDifficulty = 'facil' | 'medio' | 'dificil';

export interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

export interface Quiz {
  id: string;
  title: string;
  description: string;
  category: QuizCategory;
  difficulty: QuizDifficulty;
  estimatedMinutes: number;
  icon: string;
  questions: QuizQuestion[];
}

export const MOCK_QUIZZES: Quiz[] = [
  {
    id: 'q-1',
    title: 'O que é um ETF?',
    description: 'Aprende o básico sobre fundos de índice cotados em bolsa.',
    category: 'investimento',
    difficulty: 'facil',
    estimatedMinutes: 3,
    icon: '📈',
    questions: [
      {
        id: 'q1-1',
        question: 'O que significa a sigla ETF?',
        options: ['Exchange Traded Fund', 'European Tax Foundation', 'Equity Transfer Fee', 'Extended Term Finance'],
        correctIndex: 0,
        explanation: 'ETF significa "Exchange Traded Fund" — um fundo que replica um índice e é negociado em bolsa como uma ação.',
      },
      {
        id: 'q1-2',
        question: 'Qual é a principal vantagem dos ETFs face a ações individuais?',
        options: ['Rendimento garantido', 'Diversificação imediata com um único produto', 'São isentos de impostos em Portugal', 'Só podem ser comprados em Portugal'],
        correctIndex: 1,
        explanation: 'Ao comprar um ETF que replica o S&P 500, estás a investir em 500 empresas de uma vez, reduzindo o risco específico de cada empresa.',
      },
      {
        id: 'q1-3',
        question: 'O que é o TER (Total Expense Ratio) de um ETF?',
        options: ['O retorno anual esperado', 'A comissão anual cobrada pelo fundo', 'O imposto sobre ganhos', 'O valor mínimo de investimento'],
        correctIndex: 1,
        explanation: 'O TER é o custo anual do ETF, tipicamente entre 0,05% e 0,50%. Quanto mais baixo, melhor para o investidor a longo prazo.',
      },
      {
        id: 'q1-4',
        question: 'Um ETF "acumulador" (ACC) vs "distribuidor" (DIST) — qual a diferença?',
        options: ['O ACC tem mais risco', 'O DIST reinveste dividendos automaticamente', 'O ACC reinveste dividendos; o DIST distribui-os', 'Não há diferença prática'],
        correctIndex: 2,
        explanation: 'Um ETF acumulador reinveste os dividendos automaticamente (mais eficiente fiscalmente). Um distribuidor paga dividendos regularmente.',
      },
      {
        id: 'q1-5',
        question: 'Qual destes é um ETF de índice global comum?',
        options: ['GALP', 'IWDA (iShares MSCI World)', 'CGD', 'BTC'],
        correctIndex: 1,
        explanation: 'O IWDA é um dos ETFs mais populares em Portugal, replicando o índice MSCI World com ~1500 empresas de países desenvolvidos.',
      },
    ],
  },
  {
    id: 'q-2',
    title: 'Como funciona o IRS em Portugal?',
    description: 'Percebe os escalões, deduções e como calcular o teu imposto.',
    category: 'impostos',
    difficulty: 'medio',
    estimatedMinutes: 5,
    icon: '🧾',
    questions: [
      {
        id: 'q2-1',
        question: 'Portugal tem um sistema de IRS progressivo. O que significa isso?',
        options: ['Todos pagam a mesma taxa', 'Quem ganha mais paga uma taxa percentual maior', 'O imposto diminui com o tempo', 'É calculado apenas sobre poupanças'],
        correctIndex: 1,
        explanation: 'No sistema progressivo, o rendimento é dividido em escalões e cada escalão tem uma taxa marginal mais alta. Em 2024, os escalões vão de 13,25% a 48%.',
      },
      {
        id: 'q2-2',
        question: 'O que são "deduções à coleta" no IRS?',
        options: ['Rendimentos adicionais', 'Valores que reduzem o imposto a pagar', 'Multas por não declarar', 'Contribuições para a Segurança Social'],
        correctIndex: 1,
        explanation: 'As deduções à coleta reduzem diretamente o imposto a pagar. Incluem despesas de saúde (15%), educação (30%), habitação, etc.',
      },
      {
        id: 'q2-3',
        question: 'Qual é a taxa de dedução para despesas de saúde no IRS 2024?',
        options: ['10%', '15%', '20%', '25%'],
        correctIndex: 1,
        explanation: 'As despesas de saúde têm uma dedução de 15% no IRS, com um teto máximo de €1.000.',
      },
      {
        id: 'q2-4',
        question: 'Até quando é o prazo normal de entrega do IRS em Portugal?',
        options: ['31 de março', '30 de abril', '30 de junho', '31 de dezembro'],
        correctIndex: 2,
        explanation: 'O prazo normal para entregar a declaração de IRS em Portugal é geralmente 30 de junho do ano seguinte ao do rendimento.',
      },
      {
        id: 'q2-5',
        question: 'O que é o "mínimo de existência" no IRS?',
        options: ['Valor mínimo para abrir conta bancária', 'Rendimento abaixo do qual não se paga IRS', 'Custo mínimo de habitação dedutível', 'Contribuição mínima para a SS'],
        correctIndex: 1,
        explanation: 'O mínimo de existência garante que contribuintes com rendimentos baixos não fiquem sem meios de subsistência após pagar impostos.',
      },
      {
        id: 'q2-6',
        question: 'Os ganhos de mais-valias de ETFs em Portugal são tributados a que taxa (taxa autónoma)?',
        options: ['10%', '20%', '28%', '35%'],
        correctIndex: 2,
        explanation: 'As mais-valias de valores mobiliários (incluindo ETFs e ações) são tributadas à taxa autónoma de 28% em Portugal, salvo opção pelo englobamento.',
      },
      {
        id: 'q2-7',
        question: 'O que significa "englobamento" no IRS?',
        options: ['Juntar rendimentos de vários países', 'Somar todos os rendimentos e tributar à taxa marginal', 'Excluir rendimentos de investimentos', 'Pagar IRS em prestações'],
        correctIndex: 1,
        explanation: 'O englobamento consiste em somar todos os rendimentos (trabalho + capitais + mais-valias) e tributá-los às taxas progressivas. Pode ser vantajoso para rendimentos baixos.',
      },
      {
        id: 'q2-8',
        question: 'Os Certificados de Aforro estão sujeitos a imposto em Portugal?',
        options: ['Não, são isentos', 'Sim, os juros pagam 28% de retenção na fonte', 'Só se o valor ultrapassar €10.000', 'Apenas para não residentes'],
        correctIndex: 1,
        explanation: 'Os juros dos Certificados de Aforro estão sujeitos a retenção na fonte de 28%, como qualquer outro rendimento de capitais em Portugal.',
      },
    ],
  },
  {
    id: 'q-3',
    title: 'A Regra dos 50/30/20',
    description: 'Aprende a dividir o teu orçamento mensal de forma equilibrada.',
    category: 'orcamentacao',
    difficulty: 'facil',
    estimatedMinutes: 3,
    icon: '💰',
    questions: [
      {
        id: 'q3-1',
        question: 'Na regra 50/30/20, o que representam os 50%?',
        options: ['Poupanças e investimentos', 'Necessidades básicas (renda, alimentação, transportes)', 'Entretenimento e lazer', 'Impostos e contribuições'],
        correctIndex: 1,
        explanation: '50% do rendimento líquido vai para necessidades essenciais: renda/hipoteca, alimentação, transportes, saúde e utilidades.',
      },
      {
        id: 'q3-2',
        question: 'E os 30%?',
        options: ['Poupanças obrigatórias', 'Dívidas e créditos', 'Desejos e estilo de vida (restaurantes, lazer, viagens)', 'Seguros'],
        correctIndex: 2,
        explanation: 'Os 30% destinam-se a gastos com qualidade de vida: restaurantes, cinema, roupas, viagens — coisas que queres mas não precisas.',
      },
      {
        id: 'q3-3',
        question: 'Os 20% finais destinam-se a:',
        options: ['Pagamento de impostos', 'Poupanças, investimentos e pagamento de dívidas', 'Gastos imprevistos', 'Educação dos filhos'],
        correctIndex: 1,
        explanation: 'Os 20% cobrem poupanças para emergências, investimentos para o futuro, e pagamento acelerado de dívidas.',
      },
      {
        id: 'q3-4',
        question: 'Se tens um salário líquido de €1.500, quanto deves poupar segundo esta regra?',
        options: ['€150', '€300', '€450', '€750'],
        correctIndex: 1,
        explanation: '20% de €1.500 = €300 para poupança e investimento por mês.',
      },
      {
        id: 'q3-5',
        question: 'Qual é a maior crítica à regra 50/30/20?',
        options: ['É demasiado complexa', 'Não funciona para rendimentos baixos onde 50% não cobre o essencial', 'Não inclui poupança de emergência', 'Foi criada para os EUA e não se aplica a Portugal'],
        correctIndex: 1,
        explanation: 'Com rendimentos baixos, apenas as despesas essenciais podem superar os 50%, tornando a regra difícil de aplicar sem ajustes.',
      },
      {
        id: 'q3-6',
        question: 'Qual destas despesas pertence à categoria "necessidades" (50%)?',
        options: ['Netflix', 'Ginásio', 'Renda do apartamento', 'Jantar fora'],
        correctIndex: 2,
        explanation: 'A renda ou hipoteca é uma necessidade básica. Netflix, ginásio e jantares fora são desejos — pertencem aos 30%.',
      },
    ],
  },
  {
    id: 'q-4',
    title: 'Juro Composto vs Simples',
    description: 'A diferença que muda o teu futuro financeiro.',
    category: 'investimento',
    difficulty: 'medio',
    estimatedMinutes: 4,
    icon: '📊',
    questions: [
      {
        id: 'q4-1',
        question: 'No juro simples, como se calculam os juros?',
        options: ['Sobre o capital inicial + juros acumulados', 'Sempre sobre o capital inicial', 'Diminui a cada ano', 'Varia com a inflação'],
        correctIndex: 1,
        explanation: 'No juro simples, os juros são sempre calculados sobre o capital inicial, sem incorporar os juros já ganhos.',
      },
      {
        id: 'q4-2',
        question: 'O que diferencia o juro composto do simples?',
        options: ['A taxa é sempre mais alta', 'Os juros gerados também geram juros', 'Só existe em produtos bancários', 'É calculado mensalmente'],
        correctIndex: 1,
        explanation: 'No juro composto, os juros do período anterior são adicionados ao capital, e os juros seguintes calculam-se sobre esse novo total — "juros sobre juros".',
      },
      {
        id: 'q4-3',
        question: 'Com juro simples de 5%/ano, €1.000 em 10 anos tornam-se:',
        options: ['€1.050', '€1.500', '€1.629', '€2.000'],
        correctIndex: 1,
        explanation: '€1.000 × 5% × 10 anos = €500 de juros. Total: €1.500. (Com juro composto seriam €1.629 — mais €129!)',
      },
      {
        id: 'q4-4',
        question: 'A "regra dos 72" serve para quê?',
        options: ['Calcular impostos sobre investimentos', 'Estimar em quantos anos o capital duplica', 'Definir o portefólio ideal', 'Calcular a taxa de inflação'],
        correctIndex: 1,
        explanation: 'Divide 72 pela taxa de juro para saber em quantos anos o dinheiro duplica. Ex: a 8%/ano → 72÷8 = 9 anos para duplicar.',
      },
      {
        id: 'q4-5',
        question: 'Porquê é que investir cedo é mais importante do que investir mais?',
        options: ['As taxas são mais altas para jovens', 'O tempo amplia o efeito do juro composto exponencialmente', 'Os impostos são menores', 'Os produtos são mais baratos'],
        correctIndex: 1,
        explanation: 'Com juro composto, cada ano extra multiplica os ganhos. Investir €100/mês dos 25 aos 35 pode superar investir €100/mês dos 35 aos 65.',
      },
      {
        id: 'q4-6',
        question: 'Qual destes produtos beneficia mais do juro composto?',
        options: ['Conta à ordem', 'ETF acumulador a longo prazo', 'Depósito a prazo renovado anualmente', 'Numerário em casa'],
        correctIndex: 1,
        explanation: 'Um ETF acumulador reinveste automaticamente os dividendos, aproveitando ao máximo o efeito do juro composto ao longo de décadas.',
      },
      {
        id: 'q4-7',
        question: 'A inflação funciona como juro composto negativo. Com 3%/ano de inflação, €1.000 hoje valem quanto em 10 anos?',
        options: ['€970', '€700', '€744', '€850'],
        correctIndex: 2,
        explanation: 'O poder de compra deteriora-se a 3%/ano composto. €1.000 × (0,97)^10 ≈ €737. Por isso investir é essencial para preservar valor.',
      },
    ],
  },
  {
    id: 'q-5',
    title: 'Certificados de Aforro vs Depósitos a Prazo',
    description: 'Dois produtos de poupança garantida — qual escolher?',
    category: 'investimento',
    difficulty: 'facil',
    estimatedMinutes: 3,
    icon: '🏦',
    questions: [
      {
        id: 'q5-1',
        question: 'Quem emite os Certificados de Aforro em Portugal?',
        options: ['Banco de Portugal', 'Estado Português (IGCP)', 'Caixa Geral de Depósitos', 'Banco Central Europeu'],
        correctIndex: 1,
        explanation: 'Os Certificados de Aforro são emitidos pelo Estado Português através do IGCP (Instituto de Gestão da Tesouraria e do Crédito Público).',
      },
      {
        id: 'q5-2',
        question: 'Qual é o valor mínimo de subscrição dos Certificados de Aforro Série E?',
        options: ['€50', '€100', '€500', '€1.000'],
        correctIndex: 1,
        explanation: 'Os Certificados de Aforro podem ser subscritos a partir de €100 (1 certificado = €100), tornando-os acessíveis a todos.',
      },
      {
        id: 'q5-3',
        question: 'Os Depósitos a Prazo são garantidos até que valor pelo Fundo de Garantia de Depósitos?',
        options: ['€50.000', '€100.000', '€250.000', 'Sem limite'],
        correctIndex: 1,
        explanation: 'O Fundo de Garantia de Depósitos protege cada depositante até €100.000 por banco. Acima disso, há risco de perda em caso de insolvência bancária.',
      },
      {
        id: 'q5-4',
        question: 'Qual a principal desvantagem dos Depósitos a Prazo face aos Certificados de Aforro?',
        options: ['São mais arriscados', 'Têm penalizações por levantamento antecipado', 'Não são garantidos', 'Têm taxas de juro mais altas'],
        correctIndex: 1,
        explanation: 'Os Depósitos a Prazo têm geralmente penalizações se o dinheiro for levantado antes do vencimento. Os Certificados de Aforro têm mais flexibilidade após 3 meses.',
      },
      {
        id: 'q5-5',
        question: 'Em que situação faz mais sentido escolher Certificados de Aforro?',
        options: ['Quando precisas do dinheiro em menos de 3 meses', 'Para poupar a médio/longo prazo com capital garantido pelo Estado', 'Para diversificar em ações', 'Quando a taxa de juro é inferior à inflação'],
        correctIndex: 1,
        explanation: 'Os Certificados de Aforro são ideais para poupança garantida a médio/longo prazo, especialmente quando a taxa é competitiva e queres risco zero.',
      },
    ],
  },
  {
    id: 'q-6',
    title: 'O que é a Taxa de Esforço?',
    description: 'Percebe este indicador crucial antes de pedir crédito.',
    category: 'credito',
    difficulty: 'medio',
    estimatedMinutes: 4,
    icon: '🏠',
    questions: [
      {
        id: 'q6-1',
        question: 'O que é a taxa de esforço num crédito habitação?',
        options: ['A taxa de juro do empréstimo', 'A percentagem do rendimento mensal gasta em prestações de crédito', 'O valor da entrada mínima', 'O custo de processamento do crédito'],
        correctIndex: 1,
        explanation: 'A taxa de esforço indica que percentagem do teu rendimento líquido mensal é consumida pelo pagamento de prestações de crédito (hipoteca, carro, etc.).',
      },
      {
        id: 'q6-2',
        question: 'Qual é o limite máximo de taxa de esforço recomendado pelo Banco de Portugal?',
        options: ['25%', '35%', '50%', '60%'],
        correctIndex: 1,
        explanation: 'O Banco de Portugal recomenda uma taxa de esforço máxima de 35-40%. Acima disso, o risco de incumprimento aumenta significativamente.',
      },
      {
        id: 'q6-3',
        question: 'Se ganhas €1.500 líquidos/mês e pagas €450 de prestação, qual é a tua taxa de esforço?',
        options: ['25%', '30%', '35%', '40%'],
        correctIndex: 1,
        explanation: '€450 ÷ €1.500 = 0,30 = 30%. Estás dentro do limite recomendado, mas sem muito espaço para outras despesas ou imprevistos.',
      },
      {
        id: 'q6-4',
        question: 'O TAEG (Taxa Anual de Encargos Efetiva Global) inclui:',
        options: ['Apenas a taxa de juro nominal', 'Juros, comissões, seguros e outros encargos', 'Só as comissões bancárias', 'A inflação esperada'],
        correctIndex: 1,
        explanation: 'O TAEG é o custo real total do crédito, incluindo taxa de juro, comissões de abertura, seguros obrigatórios e outros encargos. É o número que deves comparar entre bancos.',
      },
      {
        id: 'q6-5',
        question: 'O que é o "spread" numa hipoteca de taxa variável?',
        options: ['A diferença entre EURIBOR e inflação', 'A margem de lucro do banco, adicionada à taxa de referência (EURIBOR)', 'O prazo máximo do empréstimo', 'O valor da entrada'],
        correctIndex: 1,
        explanation: 'O spread é a comissão fixa do banco. A tua taxa de juro = EURIBOR (variável) + spread (fixo). Por exemplo, EURIBOR 3,5% + spread 1% = 4,5% total.',
      },
      {
        id: 'q6-6',
        question: 'Qual a vantagem de uma hipoteca de taxa fixa face a taxa variável?',
        options: ['Taxa sempre mais baixa', 'Prestação previsível e protegida de subidas de juros', 'Aprovação mais fácil', 'Amortização mais rápida'],
        correctIndex: 1,
        explanation: 'Com taxa fixa, sabes exatamente o que vais pagar durante todo o prazo — essencial para planeamento financeiro. A taxa variável pode ser mais baixa mas tem risco de subir.',
      },
    ],
  },
];

// ── Helpers ───────────────────────────────────

export const totalBalance = MOCK_ACCOUNTS.reduce((s, a) => s + a.balance, 0);

export const monthIncome = MOCK_TRANSACTIONS
  .filter(t => !t.isExpense && t.date >= format(subDays(new Date(), 30), 'yyyy-MM-dd'))
  .reduce((s, t) => s + t.amount, 0);

export const monthExpenses = MOCK_TRANSACTIONS
  .filter(t => t.isExpense && t.date >= format(subDays(new Date(), 30), 'yyyy-MM-dd'))
  .reduce((s, t) => s + t.amount, 0);

export const monthSavings = monthIncome - monthExpenses;

export const totalPortfolioValue = MOCK_INVESTMENTS.reduce((sum, inv) => {
  const val = inv.quantity * inv.currentPrice;
  return sum + (inv.currency === 'USD' ? val * 0.92 : val);
}, 0);

export const totalPortfolioCost = MOCK_INVESTMENTS.reduce((sum, inv) => {
  const val = inv.quantity * inv.purchasePrice;
  return sum + (inv.currency === 'USD' ? val * 0.92 : val);
}, 0);

export const totalPortfolioReturn = totalPortfolioValue - totalPortfolioCost;
