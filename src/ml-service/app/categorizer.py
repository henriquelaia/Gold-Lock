"""
TransactionCategorizer
======================
Pipeline TF-IDF + Random Forest para categorização automática
de transações financeiras no contexto português.
"""

import os
import joblib
import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.ensemble import RandomForestClassifier
from sklearn.pipeline import Pipeline
from sklearn.model_selection import cross_val_score
from typing import Optional


# Categorias predefinidas para o mercado português
CATEGORIES_PT = [
    'supermercado', 'restauracao', 'transportes', 'saude',
    'educacao', 'habitacao', 'servicos', 'lazer',
    'vestuario', 'subscricoes', 'salario', 'freelance',
    'investimentos', 'transferencias', 'outros'
]

# Dados de treino iniciais (seed data)
SEED_DATA = [
    ('PINGO DOCE', 'supermercado'), ('CONTINENTE', 'supermercado'),
    ('LIDL', 'supermercado'), ('MINIPRECO', 'supermercado'),
    ('AUCHAN', 'supermercado'), ('INTERMARCHE', 'supermercado'),
    ('MERCADONA', 'supermercado'), ('JUMBO', 'supermercado'),
    ('MC DONALDS', 'restauracao'), ('BURGER KING', 'restauracao'),
    ('TELEPIZZA', 'restauracao'), ('UBER EATS', 'restauracao'),
    ('GLOVO', 'restauracao'), ('BOLT FOOD', 'restauracao'),
    ('RESTAURANTE', 'restauracao'), ('CAFE', 'restauracao'),
    ('GALP', 'transportes'), ('REPSOL', 'transportes'),
    ('BP', 'transportes'), ('UBER', 'transportes'),
    ('BOLT', 'transportes'), ('CP COMBOIOS', 'transportes'),
    ('METRO LISBOA', 'transportes'), ('VIVA VIAGEM', 'transportes'),
    ('FARMACIA', 'saude'), ('HOSPITAL', 'saude'),
    ('CLINICA', 'saude'), ('DENTISTA', 'saude'),
    ('CONTINENTE ONLINE', 'supermercado'),
    ('WORTEN', 'lazer'), ('FNAC', 'lazer'),
    ('SPOTIFY', 'subscricoes'), ('NETFLIX', 'subscricoes'),
    ('YOUTUBE PREMIUM', 'subscricoes'), ('HBO MAX', 'subscricoes'),
    ('DISNEY PLUS', 'subscricoes'), ('APPLE', 'subscricoes'),
    ('ZARA', 'vestuario'), ('H&M', 'vestuario'),
    ('PRIMARK', 'vestuario'), ('PULL AND BEAR', 'vestuario'),
    ('EDP', 'servicos'), ('EPAL AGUA', 'servicos'),
    ('NOS', 'servicos'), ('MEO', 'servicos'),
    ('VODAFONE', 'servicos'), ('GALP GAS', 'servicos'),
    ('RENDA', 'habitacao'), ('ALUGUER', 'habitacao'),
    ('CONDOMINIO', 'habitacao'), ('HIPOTECA', 'habitacao'),
    ('TRANSFERENCIA RECEBIDA', 'transferencias'),
    ('MBWAY RECEBIDO', 'transferencias'),
    ('UNIVERSIDADE', 'educacao'), ('PROPINAS', 'educacao'),
    ('LIVRARIA', 'educacao'), ('CURSO', 'educacao'),
]


class TransactionCategorizer:
    """Pipeline de categorização de transações financeiras."""

    MODEL_PATH = os.path.join(os.path.dirname(__file__), '..', 'models', 'categorizer.pkl')

    def __init__(self):
        self.pipeline: Optional[Pipeline] = None
        self._load_or_train()

    def _load_or_train(self):
        """Carrega modelo existente ou treina com seed data."""
        if os.path.exists(self.MODEL_PATH):
            self.pipeline = joblib.load(self.MODEL_PATH)
            print(f'[ML] Modelo carregado de {self.MODEL_PATH}')
        else:
            print('[ML] Modelo não encontrado. A treinar com seed data...')
            self._train_initial()

    def _train_initial(self):
        """Treina o modelo inicial com seed data."""
        descriptions = [d[0] for d in SEED_DATA]
        labels = [d[1] for d in SEED_DATA]

        self.pipeline = Pipeline([
            ('tfidf', TfidfVectorizer(
                analyzer='char_wb',
                ngram_range=(2, 4),
                max_features=5000,
                lowercase=True,
                strip_accents='unicode',
            )),
            ('clf', RandomForestClassifier(
                n_estimators=100,
                max_depth=20,
                random_state=42,
                class_weight='balanced',
            )),
        ])

        self.pipeline.fit(descriptions, labels)
        self._save_model()
        print('[ML] Modelo inicial treinado e guardado.')

    def _save_model(self):
        """Guarda o modelo em disco."""
        os.makedirs(os.path.dirname(self.MODEL_PATH), exist_ok=True)
        joblib.dump(self.pipeline, self.MODEL_PATH)

    def is_loaded(self) -> bool:
        """Verifica se o modelo está carregado."""
        return self.pipeline is not None

    def predict(self, transactions: list[dict]) -> list[dict]:
        """
        Categoriza uma lista de transações.

        Args:
            transactions: [{ description: str, amount: float }]

        Returns:
            [{ category: str, confidence: float }]
        """
        if not self.pipeline:
            raise RuntimeError('Modelo não carregado')

        descriptions = [t['description'].upper() for t in transactions]
        predictions = self.pipeline.predict(descriptions)
        probabilities = self.pipeline.predict_proba(descriptions)

        results = []
        for i, (pred, probs) in enumerate(zip(predictions, probabilities)):
            confidence = float(np.max(probs))
            results.append({
                'category': pred,
                'confidence': round(confidence, 4),
            })

        return results

    def retrain(self, corrections: list[dict]) -> dict:
        """
        Re-treina o modelo com correções do utilizador.

        Args:
            corrections: [{ description: str, category: str }]

        Returns:
            Métricas do modelo atualizado.
        """
        # Combinar seed data + correções
        all_descriptions = [d[0] for d in SEED_DATA] + [c['description'].upper() for c in corrections]
        all_labels = [d[1] for d in SEED_DATA] + [c['category'] for c in corrections]

        self.pipeline.fit(all_descriptions, all_labels)
        self._save_model()

        # Cross-validation se houver dados suficientes
        if len(all_descriptions) >= 20:
            scores = cross_val_score(self.pipeline, all_descriptions, all_labels, cv=min(5, len(set(all_labels))), scoring='accuracy')
            return {
                'accuracy_mean': round(float(scores.mean()), 4),
                'accuracy_std': round(float(scores.std()), 4),
                'n_samples': len(all_descriptions),
                'n_categories': len(set(all_labels)),
            }

        return {
            'n_samples': len(all_descriptions),
            'n_categories': len(set(all_labels)),
        }
