"""
LessonsAgent — gera 3 listas a partir do output dos outros agentes.

Sem novo modelo ML — regras determinísticas sobre:
  • Predições por categoria (PredictorAgent)
  • Transações classificadas (DeductionAgent)
  • Mês actual

Output:
  • next_year_lessons — categorias subaproveitadas + merchants não-dedutíveis
  • keep_doing       — categorias bem aproveitadas + bons hábitos identificados
  • subutilized      — meta info: categorias com utilização <30% (debug)
"""

from collections import defaultdict

CATEGORY_LABELS = {
    "saude": "Saúde",
    "educacao": "Educação",
    "habitacao": "Habitação",
    "restauracao": "Restauração",
    "ppr": "PPR",
}

CATEGORY_TIPS_NEXT_YEAR = {
    "saude": "Pede sempre fatura com NIF na farmácia, médicos e óptica",
    "educacao": "Guarda recibos de propinas e formação ao longo do ano",
    "habitacao": "Pede comprovativo de juros de crédito habitação ao banco",
    "restauracao": "Pede sempre fatura com NIF quando comeres fora",
    "ppr": "Distribui o PPR ao longo do ano (€100/mês alivia o cash-flow)",
}

CATEGORY_ICONS = {
    "saude": "HeartPulse",
    "educacao": "GraduationCap",
    "habitacao": "Home",
    "restauracao": "Utensils",
    "ppr": "PiggyBank",
}


class LessonsAgent:
    """Gera lições e hábitos com base nas predições e classificações."""

    def analyze(
        self,
        predictions: dict[str, dict],
        deduction_results: list[dict],
        current_month: int,
    ) -> dict:
        next_year_lessons: list[dict] = []
        keep_doing: list[dict] = []
        subutilized: list[str] = []

        # ── Lições — categorias subutilizadas (utilização <30%) ─────────────
        for cat, pred in predictions.items():
            year_end = float(pred.get("predicted_year_end") or 0)
            limit_exp = float(pred.get("limit_expense") or 1)
            pct = year_end / max(1, limit_exp)

            if pct < 0.30 and current_month >= 6:
                subutilized.append(cat)
                next_year_lessons.append({
                    "id": f"lesson_subutilized_{cat}",
                    "category": cat,
                    "category_label": CATEGORY_LABELS.get(cat, cat),
                    "icon": CATEGORY_ICONS.get(cat, "Calendar"),
                    "title": f"{CATEGORY_LABELS.get(cat, cat)} a {round(pct * 100)}% — começa cedo em 2027",
                    "description": CATEGORY_TIPS_NEXT_YEAR.get(cat, ""),
                    "type": "subutilized",
                })

        # ── Lições — merchants não-dedutíveis com gasto significativo ──────
        non_deductible: dict[str, float] = defaultdict(float)
        for d in deduction_results:
            if d.get("deduction_type") == "nao_dedutivel":
                merchant = d.get("merchant") or ""
                amount = abs(float(d.get("amount") or 0))
                if merchant and amount > 0:
                    non_deductible[merchant] += amount

        top_non_deductible = sorted(non_deductible.items(), key=lambda x: -x[1])[:2]
        for merchant, total in top_non_deductible:
            if total >= 50:
                next_year_lessons.append({
                    "id": f"lesson_nondeductible_{merchant.replace(' ', '_').lower()}",
                    "merchant": merchant,
                    "icon": "ShoppingBag",
                    "title": f"{merchant} ({round(total)}€) — não é dedutível",
                    "description": (
                        f"Gastaste {round(total)}€ em {merchant} este ano, mas estes gastos "
                        "não contam para o IRS. Vê alternativas dedutíveis na mesma categoria."
                    ),
                    "type": "non_deductible",
                })

        # ── Manter — categorias bem aproveitadas (>80%) ─────────────────────
        for cat, pred in predictions.items():
            year_end = float(pred.get("predicted_year_end") or 0)
            limit_exp = float(pred.get("limit_expense") or 1)
            pct = year_end / max(1, limit_exp)

            if pct >= 0.80:
                keep_doing.append({
                    "id": f"keep_{cat}",
                    "category": cat,
                    "category_label": CATEGORY_LABELS.get(cat, cat),
                    "icon": CATEGORY_ICONS.get(cat, "CheckCircle2"),
                    "title": f"{CATEGORY_LABELS.get(cat, cat)} — {round(pct * 100)}% do limite usado",
                    "description": (
                        f"Estás a aproveitar bem a dedução de {CATEGORY_LABELS.get(cat, cat).lower()}. "
                        "Continua a guardar todas as faturas com NIF."
                    ),
                    "type": "good_habit",
                })

        # ── Manter — top merchants dedutíveis com >85% confiança ────────────
        deductible_merchants: dict[str, dict] = {}
        for d in deduction_results:
            if d.get("is_deductible") and float(d.get("confidence") or 0) >= 0.85:
                merchant = d.get("merchant") or ""
                amount = abs(float(d.get("amount") or 0))
                deduction_type = d.get("deduction_type") or ""
                if merchant and amount > 0:
                    if merchant not in deductible_merchants:
                        deductible_merchants[merchant] = {
                            "merchant": merchant,
                            "total": 0.0,
                            "count": 0,
                            "deduction_type": deduction_type,
                            "max_confidence": 0.0,
                        }
                    deductible_merchants[merchant]["total"] += amount
                    deductible_merchants[merchant]["count"] += 1
                    deductible_merchants[merchant]["max_confidence"] = max(
                        deductible_merchants[merchant]["max_confidence"],
                        float(d.get("confidence") or 0),
                    )

        top_deductible = sorted(
            deductible_merchants.values(),
            key=lambda x: -x["total"],
        )[:2]

        cat_from_dtype = {
            "saude_dedutivel": "saude",
            "educacao_dedutivel": "educacao",
            "habitacao_dedutivel": "habitacao",
            "encargos_gerais_dedutivel": "restauracao",
            "ppr_dedutivel": "ppr",
        }

        for m in top_deductible:
            cat = cat_from_dtype.get(m["deduction_type"], "")
            keep_doing.append({
                "id": f"keep_merchant_{m['merchant'].replace(' ', '_').lower()}",
                "merchant": m["merchant"],
                "category": cat,
                "icon": CATEGORY_ICONS.get(cat, "CheckCircle2"),
                "title": f"{m['merchant']} — {round(m['total'])}€ identificados",
                "description": (
                    f"Identificado em {CATEGORY_LABELS.get(cat, cat).lower()} com "
                    f"{round(m['max_confidence'] * 100)}% de confiança. Mantém este hábito."
                ),
                "type": "good_merchant",
            })

        return {
            "next_year_lessons": next_year_lessons[:3],
            "keep_doing": keep_doing[:3],
            "subutilized_categories": subutilized,
        }
