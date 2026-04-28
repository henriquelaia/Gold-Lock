import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BookOpen, CheckCircle, Clock, ChevronRight,
  X, Star, Award, Users, Zap,
} from 'lucide-react';
import { MOCK_QUIZZES, type QuizCategory, type Quiz } from '../data/mock';

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 14 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.30, delay, ease: [0.22, 1, 0.36, 1] },
});

const card = {
  background: 'var(--surface)',
  border: '1px solid var(--border)',
  boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
} as const;

type CategoryFilter = 'todos' | QuizCategory;

const CATEGORY_LABELS: Record<QuizCategory, string> = {
  orcamentacao: 'Orçamentação',
  investimento: 'Investimento',
  impostos:     'Impostos',
  credito:      'Crédito',
};

const CATEGORY_COLORS: Record<QuizCategory, string> = {
  orcamentacao: '#22C55E',
  investimento: '#3B82F6',
  impostos:     '#F59E0B',
  credito:      '#8B5CF6',
};

const DIFFICULTY_LABELS = {
  facil:   { label: 'Fácil',   color: '#22C55E', bg: 'rgba(34,197,94,0.10)' },
  medio:   { label: 'Médio',   color: '#F59E0B', bg: 'rgba(245,158,11,0.10)' },
  dificil: { label: 'Difícil', color: '#EF4444', bg: 'rgba(239,68,68,0.10)' },
};

interface QuizScore {
  quizId: string;
  score: number;
  total: number;
}

interface QuizModalProps {
  quiz: Quiz;
  onClose: (score?: QuizScore) => void;
}

function QuizModal({ quiz, onClose }: QuizModalProps) {
  const [step, setStep] = useState<'intro' | 'question' | 'result'>('intro');
  const [currentQ, setCurrentQ] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [answers, setAnswers] = useState<number[]>([]);
  const [showExplanation, setShowExplanation] = useState(false);

  const question = quiz.questions[currentQ];
  const totalQuestions = quiz.questions.length;

  const handleAnswer = (idx: number) => {
    if (selected !== null) return;
    setSelected(idx);
    setShowExplanation(true);
  };

  const handleNext = () => {
    const newAnswers = [...answers, selected!];
    if (currentQ + 1 >= totalQuestions) {
      setAnswers(newAnswers);
      setStep('result');
    } else {
      setAnswers(newAnswers);
      setCurrentQ(q => q + 1);
      setSelected(null);
      setShowExplanation(false);
    }
  };

  const finalScore = answers.filter((a, i) => a === quiz.questions[i].correctIndex).length;
  const pct = Math.round((finalScore / totalQuestions) * 100);

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.50)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <motion.div
        initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }}
        transition={{ ease: [0.22, 1, 0.36, 1], duration: 0.28 }}
        className="w-full max-w-lg rounded-2xl overflow-hidden"
        style={{ background: 'var(--surface)', boxShadow: '0 24px 80px rgba(0,0,0,0.25)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: 'var(--border)' }}>
          <div className="flex items-center gap-3">
            <span className="text-2xl">{quiz.icon}</span>
            <div>
              <p className="text-sm font-bold" style={{ color: 'var(--ink-900)' }}>{quiz.title}</p>
              {step === 'question' && (
                <p className="text-xs" style={{ color: 'var(--ink-300)' }}>
                  Pergunta {currentQ + 1} de {totalQuestions}
                </p>
              )}
            </div>
          </div>
          <button onClick={() => onClose()}
            className="w-8 h-8 flex items-center justify-center rounded-xl transition-colors hover:bg-red-50 hover:text-red-500"
            style={{ color: 'var(--ink-300)' }}>
            <X size={16} />
          </button>
        </div>

        {/* Progress bar */}
        {step === 'question' && (
          <div className="h-1" style={{ background: 'var(--ink-100)' }}>
            <motion.div className="h-full" animate={{ width: `${((currentQ + 1) / totalQuestions) * 100}%` }}
              transition={{ duration: 0.4 }}
              style={{ background: 'var(--gold)' }} />
          </div>
        )}

        <div className="p-6">
          {/* Intro */}
          {step === 'intro' && (
            <div className="text-center space-y-4">
              <span className="text-5xl">{quiz.icon}</span>
              <div>
                <p className="text-lg font-bold" style={{ color: 'var(--ink-900)' }}>{quiz.title}</p>
                <p className="text-sm mt-2" style={{ color: 'var(--ink-500)' }}>{quiz.description}</p>
              </div>
              <div className="flex items-center justify-center gap-4 text-xs" style={{ color: 'var(--ink-400)' }}>
                <span className="flex items-center gap-1"><BookOpen size={12} /> {totalQuestions} perguntas</span>
                <span className="flex items-center gap-1"><Clock size={12} /> ~{quiz.estimatedMinutes} min</span>
                <span className="px-2 py-0.5 rounded-full font-medium text-[11px]"
                  style={{ background: DIFFICULTY_LABELS[quiz.difficulty].bg, color: DIFFICULTY_LABELS[quiz.difficulty].color }}>
                  {DIFFICULTY_LABELS[quiz.difficulty].label}
                </span>
              </div>
              <button onClick={() => setStep('question')}
                className="w-full py-3 rounded-xl text-sm font-bold text-white transition-opacity hover:opacity-85"
                style={{ background: 'var(--ink-900)' }}>
                Começar Quiz
              </button>
            </div>
          )}

          {/* Question */}
          {step === 'question' && (
            <div className="space-y-4">
              <p className="text-base font-semibold leading-snug" style={{ color: 'var(--ink-900)' }}>
                {question.question}
              </p>
              <div className="space-y-2">
                {question.options.map((opt, i) => {
                  let bg = 'var(--surface)';
                  let border = 'var(--border)';
                  let textColor = 'var(--ink-700)';
                  if (selected !== null) {
                    if (i === question.correctIndex) { bg = 'rgba(34,197,94,0.08)'; border = '#22C55E'; textColor = '#16a34a'; }
                    else if (i === selected && i !== question.correctIndex) { bg = 'rgba(239,68,68,0.08)'; border = '#EF4444'; textColor = '#DC2626'; }
                  }
                  return (
                    <button key={i} onClick={() => handleAnswer(i)} disabled={selected !== null}
                      className="w-full text-left px-4 py-3 rounded-xl text-sm transition-all"
                      style={{ background: bg, border: `1px solid ${border}`, color: textColor }}>
                      <span className="font-medium mr-2" style={{ color: 'var(--ink-300)' }}>
                        {String.fromCharCode(65 + i)}.
                      </span>
                      {opt}
                    </button>
                  );
                })}
              </div>
              {showExplanation && (
                <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                  className="rounded-xl px-4 py-3 text-xs"
                  style={{ background: 'var(--ink-50)', border: '1px solid var(--border)' }}>
                  <p className="font-semibold mb-1" style={{ color: 'var(--ink-700)' }}>Explicação</p>
                  <p style={{ color: 'var(--ink-500)' }}>{question.explanation}</p>
                </motion.div>
              )}
              {selected !== null && (
                <button onClick={handleNext}
                  className="w-full py-3 rounded-xl text-sm font-bold text-white transition-opacity hover:opacity-85"
                  style={{ background: 'var(--ink-900)' }}>
                  {currentQ + 1 >= totalQuestions ? 'Ver resultado' : 'Próxima pergunta →'}
                </button>
              )}
            </div>
          )}

          {/* Result */}
          {step === 'result' && (
            <div className="text-center space-y-4">
              <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto text-3xl font-black"
                style={{
                  background: pct >= 80 ? 'rgba(34,197,94,0.12)' : pct >= 50 ? 'rgba(245,158,11,0.12)' : 'rgba(239,68,68,0.12)',
                  color: pct >= 80 ? '#16a34a' : pct >= 50 ? '#D97706' : '#DC2626',
                }}>
                {pct}%
              </div>
              <div>
                <p className="text-lg font-bold" style={{ color: 'var(--ink-900)' }}>
                  {pct >= 80 ? '🎉 Excelente!' : pct >= 50 ? '👍 Bom trabalho!' : '📚 Continua a aprender!'}
                </p>
                <p className="text-sm mt-1" style={{ color: 'var(--ink-500)' }}>
                  Respondeste corretamente a <strong>{finalScore}</strong> de <strong>{totalQuestions}</strong> perguntas.
                </p>
              </div>
              <button onClick={() => onClose({ quizId: quiz.id, score: finalScore, total: totalQuestions })}
                className="w-full py-3 rounded-xl text-sm font-bold text-white transition-opacity hover:opacity-85"
                style={{ background: 'var(--ink-900)' }}>
                Concluir
              </button>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

function useLocalStorage<T>(key: string, initial: T): [T, (v: T) => void] {
  const [value, setValue] = useState<T>(() => {
    try { return JSON.parse(localStorage.getItem(key) ?? 'null') ?? initial; }
    catch { return initial; }
  });
  const set = (v: T) => { setValue(v); localStorage.setItem(key, JSON.stringify(v)); };
  return [value, set];
}

export function LearnPage() {
  const [activeCategory, setActiveCategory] = useState<CategoryFilter>('todos');
  const [activeQuiz, setActiveQuiz] = useState<Quiz | null>(null);
  const [completedQuizzes, setCompletedQuizzes] = useLocalStorage<QuizScore[]>('gl_completed_quizzes', []);

  const filtered = activeCategory === 'todos'
    ? MOCK_QUIZZES
    : MOCK_QUIZZES.filter(q => q.category === activeCategory);

  const handleQuizComplete = (score?: QuizScore) => {
    if (score) {
      const existing = completedQuizzes.findIndex(s => s.quizId === score.quizId);
      if (existing >= 0) {
        const updated = [...completedQuizzes];
        updated[existing] = score;
        setCompletedQuizzes(updated);
      } else {
        setCompletedQuizzes([...completedQuizzes, score]);
      }
    }
    setActiveQuiz(null);
  };

  const avgScore = completedQuizzes.length > 0
    ? Math.round(completedQuizzes.reduce((s, q) => s + (q.score / q.total) * 100, 0) / completedQuizzes.length)
    : null;

  const categories: CategoryFilter[] = ['todos', 'investimento', 'orcamentacao', 'impostos', 'credito'];

  return (
    <div className="p-6 space-y-5 max-w-7xl mx-auto">

      {/* Header */}
      <motion.div {...fadeUp(0)} className="flex items-center justify-between">
        <div>
          <h1 className="text-[22px] font-bold" style={{ color: 'var(--ink-900)' }}>Literacia Financeira</h1>
          <p className="text-[13px] mt-0.5" style={{ color: 'var(--ink-400)' }}>
            Aprende conceitos essenciais de finanças pessoais
          </p>
        </div>
        {completedQuizzes.length > 0 && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold"
            style={{ background: 'var(--gold-subtle)', color: 'var(--gold)', border: '1px solid var(--gold-border)' }}>
            <Star size={12} />
            Score médio: {avgScore}%
          </div>
        )}
      </motion.div>

      {/* Progresso */}
      {completedQuizzes.length > 0 && (
        <motion.div {...fadeUp(0.04)} className="rounded-2xl p-5" style={card}>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center"
              style={{ background: 'var(--gold-subtle)' }}>
              <Award size={22} style={{ color: 'var(--gold)' }} />
            </div>
            <div className="flex-1">
              <p className="text-sm font-bold" style={{ color: 'var(--ink-900)' }}>
                {completedQuizzes.length} de {MOCK_QUIZZES.length} quizzes concluídos
              </p>
              <div className="h-1.5 rounded-full mt-2" style={{ background: 'var(--ink-100)' }}>
                <motion.div className="h-full rounded-full"
                  animate={{ width: `${(completedQuizzes.length / MOCK_QUIZZES.length) * 100}%` }}
                  transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                  style={{ background: 'var(--gold)' }} />
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Filtros */}
      <motion.div {...fadeUp(0.08)} className="flex gap-2 flex-wrap">
        {categories.map(cat => (
          <button key={cat} onClick={() => setActiveCategory(cat)}
            className="px-3 py-1.5 rounded-xl text-xs font-semibold transition-all"
            style={{
              background: activeCategory === cat ? 'var(--ink-900)' : 'var(--surface)',
              color: activeCategory === cat ? 'white' : 'var(--ink-400)',
              border: `1px solid ${activeCategory === cat ? 'var(--ink-900)' : 'var(--border)'}`,
            }}>
            {cat === 'todos' ? 'Todos' : CATEGORY_LABELS[cat]}
          </button>
        ))}
      </motion.div>

      {/* Grid de quizzes */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        <AnimatePresence mode="popLayout">
          {filtered.map((quiz, i) => {
            const completed = completedQuizzes.find(s => s.quizId === quiz.id);
            const diffCfg = DIFFICULTY_LABELS[quiz.difficulty];
            const catColor = CATEGORY_COLORS[quiz.category];

            return (
              <motion.div key={quiz.id}
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ delay: i * 0.05, duration: 0.24 }}
                className="rounded-2xl p-5 flex flex-col gap-4 cursor-pointer transition-all hover:shadow-md hover:-translate-y-0.5"
                style={{ ...card, position: 'relative', overflow: 'hidden' }}
                onClick={() => setActiveQuiz(quiz)}
              >
                {/* Faixa de cor lateral */}
                <div className="absolute left-0 top-0 bottom-0 w-1 rounded-l-2xl"
                  style={{ background: catColor }} />

                {/* Ícone + badges */}
                <div className="flex items-start justify-between pl-2">
                  <span className="text-3xl">{quiz.icon}</span>
                  <div className="flex items-center gap-1.5">
                    {completed && (
                      <div className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold"
                        style={{ background: 'rgba(34,197,94,0.12)', color: '#16a34a' }}>
                        <CheckCircle size={10} />
                        {Math.round((completed.score / completed.total) * 100)}%
                      </div>
                    )}
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold"
                      style={{ background: diffCfg.bg, color: diffCfg.color }}>
                      {diffCfg.label}
                    </span>
                  </div>
                </div>

                {/* Conteúdo */}
                <div className="pl-2 flex-1">
                  <p className="text-sm font-bold leading-snug" style={{ color: 'var(--ink-900)' }}>
                    {quiz.title}
                  </p>
                  <p className="text-xs mt-1 leading-relaxed" style={{ color: 'var(--ink-500)' }}>
                    {quiz.description}
                  </p>
                </div>

                {/* Footer */}
                <div className="pl-2 flex items-center justify-between">
                  <div className="flex items-center gap-3 text-[11px]" style={{ color: 'var(--ink-300)' }}>
                    <span className="flex items-center gap-1">
                      <BookOpen size={11} />
                      {quiz.questions.length} perguntas
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock size={11} />
                      {quiz.estimatedMinutes} min
                    </span>
                  </div>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                    style={{ background: `${catColor}18`, color: catColor }}>
                    {CATEGORY_LABELS[quiz.category]}
                  </span>
                </div>

                <button className="pl-2 w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold transition-opacity hover:opacity-80"
                  style={{
                    background: completed ? 'var(--ink-100)' : 'var(--ink-900)',
                    color: completed ? 'var(--ink-500)' : 'white',
                  }}>
                  {completed ? (
                    <><CheckCircle size={13} /> Repetir quiz</>
                  ) : (
                    <>Iniciar quiz <ChevronRight size={13} /></>
                  )}
                </button>
              </motion.div>
            );
          })}
        </AnimatePresence>
        {filtered.length === 0 && (
          <div className="text-center py-16 col-span-full">
            <p className="text-4xl mb-3">📚</p>
            <p className="text-sm font-semibold" style={{ color: 'var(--ink-900)' }}>Sem quizzes nesta categoria</p>
            <button onClick={() => setActiveCategory('todos')}
              className="mt-3 text-xs font-medium hover:underline"
              style={{ color: 'var(--gold)' }}>
              Ver todos os quizzes
            </button>
          </div>
        )}
      </div>

      {/* Secção Creators — Em breve */}
      <motion.div {...fadeUp(0.3)} className="rounded-2xl overflow-hidden" style={card}>
        <div className="px-6 py-5 border-b flex items-center justify-between" style={{ borderColor: 'var(--border)' }}>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest mb-0.5" style={{ color: 'var(--ink-300)' }}>
              Em breve
            </p>
            <h2 className="text-sm font-bold" style={{ color: 'var(--ink-900)' }}>
              Conteúdo de Criadores Portugueses
            </h2>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold"
            style={{ background: 'var(--ink-100)', color: 'var(--ink-500)' }}>
            <Zap size={11} />
            A chegar em breve
          </div>
        </div>
        <div className="px-6 py-5">
          <p className="text-sm mb-5" style={{ color: 'var(--ink-500)' }}>
            Estamos a construir parcerias com criadores de conteúdo portugueses de literacia financeira para trazer
            vídeos, cursos e guias exclusivos diretamente aqui — integrados com o teu perfil financeiro.
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { name: 'Criador A', sub: 'Investimentos', color: '#3B82F6' },
              { name: 'Criador B', sub: 'Orçamentação', color: '#22C55E' },
              { name: 'Criador C', sub: 'Impostos', color: '#F59E0B' },
              { name: 'Criador D', sub: 'Crédito', color: '#8B5CF6' },
            ].map(c => (
              <div key={c.name} className="rounded-xl p-4 flex flex-col items-center gap-2 text-center"
                style={{ background: 'var(--ink-50)', border: '1px solid var(--border)' }}>
                <div className="w-10 h-10 rounded-full flex items-center justify-center"
                  style={{ background: `${c.color}20` }}>
                  <Users size={18} style={{ color: c.color }} />
                </div>
                <div>
                  <p className="text-xs font-bold" style={{ color: 'var(--ink-700)' }}>{c.name}</p>
                  <p className="text-[10px]" style={{ color: 'var(--ink-300)' }}>{c.sub}</p>
                </div>
              </div>
            ))}
          </div>
          <p className="mt-4 text-[11px] text-center" style={{ color: 'var(--ink-300)' }}>
            Notificações de comunidade disponíveis em breve.
          </p>
        </div>
      </motion.div>

      {/* Modal */}
      <AnimatePresence>
        {activeQuiz && (
          <QuizModal quiz={activeQuiz} onClose={handleQuizComplete} />
        )}
      </AnimatePresence>
    </div>
  );
}
