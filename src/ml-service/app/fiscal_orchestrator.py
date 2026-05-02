"""
FiscalOrchestrator — coordena os 4 agentes do Assistente Fiscal IA.

Corre DeductionAgent, ScenarioAgent, PredictorAgent e ScoreAgent
em sequência (Deduction primeiro, pois os seus resultados alimentam
Predictor e Score).
"""

from pathlib import Path
from typing import Any

from app.agents.deduction_agent import DeductionAgent
from app.agents.lessons_agent import LessonsAgent
from app.agents.predictor_agent import PredictorAgent
from app.agents.scenario_agent import ScenarioAgent
from app.agents.score_agent import ScoreAgent

_DATA_DIR = Path(__file__).parent.parent / "data"
_DEDUCTION_CSV = str(_DATA_DIR / "deduction_training.csv")
_PREDICTOR_CSV = str(_DATA_DIR / "predictor_training.csv")


class FiscalOrchestrator:
    def __init__(self) -> None:
        self.deduction_agent = DeductionAgent()
        self.scenario_agent = ScenarioAgent()
        self.predictor_agent = PredictorAgent()
        self.score_agent = ScoreAgent()
        self.lessons_agent = LessonsAgent()

    # ── Análise completa ──────────────────────────────────────────────────────

    def analyze(self, payload: dict[str, Any]) -> dict:
        fiscal_profile: dict | None = payload.get("fiscal_profile")
        transactions: list[dict] = payload.get("transactions") or []
        current_month: int = int(payload.get("current_month") or 6)

        # 1. Classificar transações como dedutíveis (alimenta Predictor e Score)
        deduction_results = self.deduction_agent.classify_batch(transactions) if self.deduction_agent.is_trained() else []

        # 2. Enriquecer transações com deduction_type para o PredictorAgent
        classified_tx = _merge_deduction_types(transactions, deduction_results)

        # 3. Prever totais de fim-de-ano por categoria
        predictions = self.predictor_agent.predict(classified_tx, current_month)

        # 4. Otimizar cenários fiscais
        scenarios = self.scenario_agent.optimize(fiscal_profile)

        # 5. Calcular score fiscal
        score = self.score_agent.score(fiscal_profile, deduction_results, predictions)

        # 6. Gerar lições e bons hábitos (3 tempos: agir / aprender / manter)
        lessons = self.lessons_agent.analyze(predictions, deduction_results, current_month)

        # this_year_actions = top 3 cenários do ScenarioAgent (excluindo baseline)
        this_year_actions = [s for s in scenarios if s.get("scenario_id") != "baseline"][:3]

        return {
            "fiscal_score": score,
            "deduction_recommendations": [d for d in deduction_results if d.get("is_deductible")],
            "all_deductions": deduction_results,
            "scenarios": scenarios,
            "predictions": predictions,
            "this_year_actions": this_year_actions,
            "next_year_lessons": lessons["next_year_lessons"],
            "keep_doing": lessons["keep_doing"],
            "meta": {
                "transactions_analysed": len(transactions),
                "deductible_found": sum(1 for d in deduction_results if d.get("is_deductible")),
                "deduction_agent_trained": self.deduction_agent.is_trained(),
                "predictor_trained": self.predictor_agent.is_trained(),
                "current_month": current_month,
            },
        }

    # ── Treino ────────────────────────────────────────────────────────────────

    def train_all(self) -> dict:
        results: dict[str, Any] = {}

        if not Path(_DEDUCTION_CSV).exists():
            return {"error": f"Ficheiro de treino não encontrado: {_DEDUCTION_CSV}. Correr scripts/generate_training_data.py primeiro."}

        results["deduction_agent"] = self.deduction_agent.train(_DEDUCTION_CSV)

        if Path(_PREDICTOR_CSV).exists():
            results["predictor_agent"] = self.predictor_agent.train(_PREDICTOR_CSV)
        else:
            results["predictor_agent"] = {"warning": "predictor_training.csv não encontrado — usar extrapolação linear"}

        return results

    # ── Métricas ──────────────────────────────────────────────────────────────

    def metrics(self) -> dict:
        return {
            "deduction_agent": self.deduction_agent.metrics(),
            "predictor_agent": self.predictor_agent.metrics(),
        }


def _merge_deduction_types(transactions: list[dict], deduction_results: list[dict]) -> list[dict]:
    """Junta deduction_type das classificações ML de volta às transações originais."""
    tx_map = {str(d.get("transaction_id")): d for d in deduction_results if d.get("transaction_id")}
    enriched = []
    for tx in transactions:
        tx_id = str(tx.get("id") or "")
        classified = tx_map.get(tx_id)
        if classified:
            enriched.append({**tx, "deduction_type": classified["deduction_type"]})
        else:
            enriched.append(tx)
    return enriched
