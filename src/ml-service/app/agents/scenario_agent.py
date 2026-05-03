"""
ScenarioAgent — otimizador greedy de cenários fiscais.

Testa até 9 cenários baseados no perfil fiscal do utilizador,
espelhando irsCalculator.ts (escalões OE 2026 — Lei 73-A/2025).
"""

from typing import Any

# ── Motor IRS OE 2026 (espelho de irsCalculator.ts) ─────────────────────────

BRACKETS_2026 = [
    {"min": 0,      "max": 8342,    "rate": 0.1250, "parcel": 0.0},
    {"min": 8342,   "max": 12587,   "rate": 0.1570, "parcel": 266.94},
    {"min": 12587,  "max": 17838,   "rate": 0.2120, "parcel": 959.23},
    {"min": 17838,  "max": 23089,   "rate": 0.2410, "parcel": 1476.53},
    {"min": 23089,  "max": 29397,   "rate": 0.3110, "parcel": 3092.76},
    {"min": 29397,  "max": 43090,   "rate": 0.3490, "parcel": 4209.85},
    {"min": 43090,  "max": 46567,   "rate": 0.4310, "parcel": 7743.23},
    {"min": 46567,  "max": 86634,   "rate": 0.4460, "parcel": 8441.73},
    {"min": 86634,  "max": None,    "rate": 0.4800, "parcel": 11387.29},
]

DEDUCTION_LIMITS = {
    "saude":       {"rate": 0.15, "limit": 1000.0},
    "educacao":    {"rate": 0.30, "limit": 800.0},
    "habitacao":   {"rate": 0.15, "limit": 296.0},
    "restauracao": {"rate": 0.15, "limit": 250.0},
    "ppr":         {"rate": 0.20, "limit": 400.0},
}

SPECIFIC_DEDUCTION = 4104.0
DEPENDENTS_BASE = 600.0
DEPENDENTS_EXTRA = 126.0

# IRS Jovem — Art.º 12.º-B CIRS (OE 2026)
IRS_JOVEM_EXEMPTION = {1: 1.00, 2: 0.75, 3: 0.75, 4: 0.75,
                       5: 0.50, 6: 0.50, 7: 0.50,
                       8: 0.25, 9: 0.25, 10: 0.25}
IRS_JOVEM_TETO = 29542.15

# Limite legal "ser dependente" — art.º 13.º n.º 4 CIRS
# Filhos podem ser dependentes se ≤ 25 anos e rendimento anual ≤ RMMG × 14.
RMMG_2026_ANUAL = 12180.0    # Salário mínimo nacional × 14 (estimativa OE 2026)
DEPENDENT_AGE_MAX = 25       # filhos estudantes (acima é só por incapacidade)


def _ppr_limit(age: int) -> float:
    """OE 2026 — limites PPR por faixa etária (art.º 21.º EBF)."""
    if age <= 34:
        return 400.0
    if age <= 50:
        return 350.0
    return 300.0


def _find_bracket(income: float) -> dict:
    for b in BRACKETS_2026:
        if b["max"] is None or income <= b["max"]:
            return b
    return BRACKETS_2026[-1]


def _calc_deduction_value(amount: float, rate: float, limit: float) -> float:
    return min(amount * rate, limit)


def _calculate_irs(
    gross_income: float,
    social_security: float,
    marital_status: str,
    dependents: int,
    withholding: float,
    deductions: dict[str, float],
    joint_income: float = 0.0,
    age: int | None = None,
    irs_jovem: bool = False,
    years_working: int = 0,
) -> dict:
    """Calcula IRS — lógica idêntica a irsCalculator.ts (OE 2026)."""

    # IRS Jovem — isenção parcial (art.º 12.º-B)
    irs_jovem_exemption = 0.0
    taxable_gross = gross_income
    if irs_jovem and 1 <= years_working <= 10:
        exemption_rate = IRS_JOVEM_EXEMPTION.get(years_working, 0)
        irs_jovem_exemption = min(gross_income * exemption_rate, IRS_JOVEM_TETO)
        taxable_gross = max(0.0, gross_income - irs_jovem_exemption)

    # Dedução específica Cat. A
    specific_ded = max(social_security, SPECIFIC_DEDUCTION)
    collectable = max(0.0, taxable_gross - specific_ded)

    # Quociente conjugal
    if marital_status == "married" and joint_income > 0:
        total = gross_income + joint_income
        collectable_total = max(0.0, total - specific_ded * 2)
        base = collectable_total / 2
    else:
        base = collectable

    bracket = _find_bracket(base)
    gross_tax_base = base * bracket["rate"] - bracket["parcel"]
    gross_tax = gross_tax_base * (2 if marital_status == "married" and joint_income > 0 else 1)
    gross_tax = max(0.0, gross_tax)

    # PPR limit por idade
    ppr_lim = _ppr_limit(age) if age is not None else DEDUCTION_LIMITS["ppr"]["limit"]
    effective_limits = {**DEDUCTION_LIMITS, "ppr": {**DEDUCTION_LIMITS["ppr"], "limit": ppr_lim}}

    # Deduções à coleta
    dep_ded = DEPENDENTS_BASE * dependents + (DEPENDENTS_EXTRA * max(0, dependents - 1))
    ded_values = {k: _calc_deduction_value(v, effective_limits[k]["rate"], effective_limits[k]["limit"])
                  for k, v in deductions.items() if k in effective_limits}
    total_ded = dep_ded + sum(ded_values.values())

    net_tax = max(0.0, gross_tax - total_ded)
    result = net_tax - withholding
    effective_rate = (net_tax / gross_income * 100) if gross_income > 0 else 0.0

    return {
        "gross_tax": round(gross_tax, 2),
        "net_tax": round(net_tax, 2),
        "result": round(result, 2),
        "effective_rate": round(effective_rate, 2),
        "marginal_rate": round(bracket["rate"] * 100, 2),
        "bracket_rate": bracket["rate"],
        "bracket_min": bracket["min"],
        "bracket_max": bracket["max"],
        "collectable_income": round(collectable, 2),
        "irs_jovem_exemption": round(irs_jovem_exemption, 2),
    }


# ── ScenarioAgent ─────────────────────────────────────────────────────────────

class ScenarioAgent:
    """Testa até 9 cenários fiscais e ordena por poupança máxima (OE 2026)."""

    def optimize(
        self,
        fiscal_profile: dict[str, Any] | None,
        investments: list[dict] | None = None,
    ) -> list[dict]:
        if not fiscal_profile:
            return []

        gross = float(fiscal_profile.get("gross_income_annual") or 0)
        if gross <= 0:
            return []

        ss = float(fiscal_profile.get("social_security_contributions") or gross * 0.11)
        status = fiscal_profile.get("marital_status") or "single"
        dependents = int(fiscal_profile.get("dependents") or 0)
        withholding = float(fiscal_profile.get("withholding_tax") or 0)
        ppr_contrib = float(fiscal_profile.get("ppr_contributions") or 0)
        age = fiscal_profile.get("age")
        if age is not None:
            age = int(age)

        # Investimentos não-PPR (stocks, etfs, bonds, crypto) — base para cenário "redirecionar"
        non_ppr_investment_value = 0.0
        for inv in (investments or []):
            if str(inv.get("type")) in {"stock", "etf", "bond", "crypto"}:
                qty = float(inv.get("quantity") or 0)
                price = float(inv.get("purchase_price") or 0)
                non_ppr_investment_value += qty * price

        ppr_lim = _ppr_limit(age) if age is not None else DEDUCTION_LIMITS["ppr"]["limit"]
        ppr_max_expense = ppr_lim / DEDUCTION_LIMITS["ppr"]["rate"]

        current_deductions = {
            "saude":       float(fiscal_profile.get("saude") or 0),
            "educacao":    float(fiscal_profile.get("educacao") or 0),
            "habitacao":   float(fiscal_profile.get("habitacao") or 0),
            "restauracao": float(fiscal_profile.get("restauracao") or 0),
            "ppr":         ppr_contrib,
        }

        baseline = _calculate_irs(gross, ss, status, dependents, withholding, current_deductions, age=age)
        scenarios: list[dict] = []

        def _scenario(sid: str, label: str, deductions: dict, actions: list[str],
                      override_status: str | None = None, joint_income: float = 0.0,
                      irs_jovem: bool = False, years_working: int = 0) -> dict | None:
            calc_status = override_status or status
            calc = _calculate_irs(gross, ss, calc_status, dependents, withholding,
                                  deductions, joint_income, age=age,
                                  irs_jovem=irs_jovem, years_working=years_working)
            saving = round(baseline["result"] - calc["result"], 2)
            if saving <= 0:
                return None
            return {
                "scenario_id": sid,
                "label": label,
                "tax_saving_eur": saving,
                "tax_saving_pct": round(saving / max(1, abs(baseline["result"])) * 100, 1),
                "new_result": calc["result"],
                "new_effective_rate": calc["effective_rate"],
                "irs_jovem_exemption": calc.get("irs_jovem_exemption", 0),
                "actions": actions,
                "status": "recomendado" if saving > 50 else "possível",
            }

        # ── Cenário 1: PPR máximo para o escalão actual ──────────────────────
        ppr_additional = max(0.0, ppr_max_expense - ppr_contrib)
        if ppr_additional > 50:
            # Se já contribui mas não chegou ao limite, label diferente
            if ppr_contrib > 0:
                ppr_label = f"Aproveitar PPR existente — falta {round(ppr_additional):,}€".replace(",", ".")
                ppr_actions = [
                    f"Já tens {round(ppr_contrib):,}€ de PPR este ano".replace(",", "."),
                    f"Contribuir mais {round(ppr_additional, 0):,.0f}€ até 31/12 para chegar ao limite".replace(",", "."),
                    f"Benefício fiscal máximo: {ppr_lim:.0f}€ em deduções à coleta (OE 2026)",
                ]
            else:
                ppr_label = f"Contribuir {round(ppr_additional):,}€ para PPR".replace(",", ".")
                ppr_actions = [
                    f"Efectuar contribuição PPR de {round(ppr_additional, 0):,.0f}€ até 31/12".replace(",", "."),
                    f"Benefício fiscal máximo: {ppr_lim:.0f}€ em deduções à coleta (OE 2026)",
                ]
            ded_ppr = {**current_deductions, "ppr": ppr_max_expense}
            s = _scenario("ppr_max", ppr_label, ded_ppr, ppr_actions)
            if s:
                scenarios.append(s)

        # ── Cenário 1b: Redirecionar parte de investimentos não-PPR ─────────
        # Só aparece se utilizador tem ≥€500 em ações/ETFs/crypto E não atingiu o limite PPR
        if non_ppr_investment_value >= 500 and ppr_additional > 50:
            redirect_amount = min(ppr_additional, non_ppr_investment_value)
            ded_redirect = {**current_deductions, "ppr": min(ppr_max_expense, ppr_contrib + redirect_amount)}
            s = _scenario(
                "redirect_to_ppr",
                f"Redirecionar {round(redirect_amount):,}€ de ações/ETFs para PPR".replace(",", "."),
                ded_redirect,
                [f"Tens {round(non_ppr_investment_value):,}€ em ações/ETFs sem benefício fiscal directo".replace(",", "."),
                 f"Reforça o PPR em {round(redirect_amount):,}€ — ganhas a dedução fiscal".replace(",", "."),
                 "Estratégia adequada se o horizonte for ≥5 anos (penalização do PPR)"],
            )
            if s:
                scenarios.append(s)

        # ── Cenário 2 & 3: Declaração conjunta vs separada ───────────────────
        if status == "married":
            joint_est = gross * 0.70
            s_joint = _scenario(
                "married_joint", "Declaração conjunta", current_deductions,
                ["Declarar IRS em conjunto com cônjuge",
                 "Verificar rendimento conjunto no Portal AT"],
                override_status="married", joint_income=joint_est,
            )
            if s_joint:
                scenarios.append(s_joint)

            s_sep = _scenario(
                "married_separate", "Declaração separada", current_deductions,
                ["Declarar IRS separadamente do cônjuge"],
            )
            if s_sep:
                scenarios.append(s_sep)

        # ── Cenário 4: IRS Jovem ─────────────────────────────────────────────
        is_jovem = fiscal_profile.get("is_irs_jovem") or (age is not None and age <= 35)
        years_w = int(fiscal_profile.get("years_working") or 1)
        if is_jovem and years_w <= 10:
            exemption_rate = IRS_JOVEM_EXEMPTION.get(years_w, 0)
            exempt_amount = min(gross * exemption_rate, IRS_JOVEM_TETO)
            pct_label = int(exemption_rate * 100)
            s = _scenario(
                "irs_jovem",
                f"IRS Jovem — {pct_label}% isenção (ano {years_w})",
                current_deductions,
                [f"Isenção de {pct_label}% sobre rendimento até {IRS_JOVEM_TETO:,.2f}€".replace(",", "."),
                 f"Montante isento estimado: {exempt_amount:,.2f}€".replace(",", "."),
                 "Art.º 12.º-B CIRS — requerer na declaração Mod. 3"],
                irs_jovem=True, years_working=years_w,
            )
            if s:
                scenarios.append(s)

        # ── Cenário 4b: Incluir com pais como dependente ──────────────────────
        # Art.º 13.º n.º 4 CIRS — só elegível se ≤25 anos e rendimento ≤ RMMG×14
        parent_income = float(fiscal_profile.get("parent_household_income") or 0)
        parent_status = fiscal_profile.get("parent_marital_status") or "single"
        parent_other_deps = int(fiscal_profile.get("parent_other_dependents") or 0)

        eligible_dependent = (
            age is not None
            and age <= DEPENDENT_AGE_MAX
            and gross <= RMMG_2026_ANUAL
            and parent_income > 0
        )

        if eligible_dependent:
            # Helper para calcular IRS do agregado dos pais respeitando o quociente
            # conjugal: se married, divide rendimento em 2 cônjuges (50/50) e usa
            # joint_income para activar o quociente em _calculate_irs.
            def _calc_household(income: float, ss_val: float, status_h: str,
                                deps: int, withhold: float, dedu: dict) -> dict:
                if status_h == "married" and income > 0:
                    half = income / 2
                    half_ss = ss_val / 2
                    return _calculate_irs(half, half_ss, "married", deps, withhold,
                                          dedu, joint_income=half)
                return _calculate_irs(income, ss_val, status_h, deps, withhold, dedu)

            # Caso A — jovem sozinho (com IRS Jovem se aplicável) + pais sem ele
            irs_user_alone = _calculate_irs(
                gross, ss, status, dependents, withholding,
                current_deductions, age=age,
                irs_jovem=is_jovem, years_working=years_w,
            )
            parent_ss = parent_income * 0.11
            irs_parents_no_user = _calc_household(
                parent_income, parent_ss, parent_status,
                parent_other_deps, 0, {},
            )

            # Caso B — incluído como dependente: rendimento somado, +1 dependente.
            # A retenção do jovem é "transferida" para o agregado.
            combined_income = parent_income + gross
            combined_ss = parent_ss + ss
            irs_aggregated = _calc_household(
                combined_income, combined_ss, parent_status,
                parent_other_deps + 1, withholding, current_deductions,
            )

            a_total = irs_user_alone["result"] + irs_parents_no_user["result"]
            b_total = irs_aggregated["result"]
            saving = round(a_total - b_total, 2)

            if saving > 50:
                fmt = lambda n: f"{round(n):,}".replace(",", ".")
                scenarios.append({
                    "scenario_id": "aggregated_with_parents",
                    "label": f"Declarar como dependente dos pais — poupança agregada {fmt(saving)}€",
                    "tax_saving_eur": saving,
                    "tax_saving_pct": round(saving / max(1, abs(a_total)) * 100, 1),
                    "new_result": b_total,
                    "new_effective_rate": irs_aggregated["effective_rate"],
                    "irs_jovem_exemption": 0.0,
                    "actions": [
                        f"O agregado familiar (tu + pais) poupa {fmt(saving)}€ se fores incluído como dependente",
                        "Perdes o reembolso individual e o IRS Jovem, mas os pais beneficiam de +€600 de dedução por ti",
                        f"Elegível: ≤25 anos e rendimento ≤ {fmt(RMMG_2026_ANUAL)}€ (art.º 13.º n.º 4 CIRS)",
                        "Decisão recomendada apenas se a poupança líquida for partilhada com os pais",
                    ],
                    "status": "recomendado" if saving > 200 else "possível",
                })

        # ── Cenário 5: Maximizar saúde ───────────────────────────────────────
        saude_max_exp = DEDUCTION_LIMITS["saude"]["limit"] / DEDUCTION_LIMITS["saude"]["rate"]
        saude_gap = saude_max_exp - current_deductions["saude"]
        if saude_gap > 50:
            s = _scenario(
                "max_saude",
                f"Maximizar dedução de saúde (+{round(saude_gap):,}€)".replace(",", "."),
                {**current_deductions, "saude": saude_max_exp},
                ["Guardar faturas de saúde: farmácia, médicos, dentista, óptica",
                 f"Faltam {round(saude_gap, 0):,.0f}€ para o limite de 1.000€".replace(",", ".")],
            )
            if s:
                scenarios.append(s)

        # ── Cenário 6: Maximizar educação ────────────────────────────────────
        educ_max_exp = DEDUCTION_LIMITS["educacao"]["limit"] / DEDUCTION_LIMITS["educacao"]["rate"]
        educ_gap = educ_max_exp - current_deductions["educacao"]
        if educ_gap > 50:
            s = _scenario(
                "max_educacao",
                f"Maximizar dedução de educação (+{round(educ_gap):,}€)".replace(",", "."),
                {**current_deductions, "educacao": educ_max_exp},
                ["Guardar faturas de propinas, explicações, creche",
                 f"Faltam {round(educ_gap, 0):,.0f}€ para o limite de 800€".replace(",", ".")],
            )
            if s:
                scenarios.append(s)

        # ── Cenário 7: PPR + saúde combinado ────────────────────────────────
        if ppr_additional > 50 and saude_gap > 50:
            s = _scenario(
                "ppr_plus_saude", "PPR máximo + Saúde máxima",
                {**current_deductions, "ppr": ppr_max_expense, "saude": saude_max_exp},
                ["Contribuir para PPR até ao máximo fiscal",
                 "Guardar todas as faturas de saúde do ano"],
            )
            if s:
                scenarios.append(s)

        # ── Cenário 8: Otimização total ──────────────────────────────────────
        ded_optimal = {k: v["limit"] / v["rate"] for k, v in DEDUCTION_LIMITS.items()}
        ded_optimal["ppr"] = ppr_max_expense
        s_opt = _scenario(
            "optimal", "Otimização total (todos os limites)", ded_optimal,
            ["Maximizar PPR + Saúde + Educação + Habitação + Restauração",
             "Ver cenários individuais para priorização"],
        )
        if s_opt:
            scenarios.append(s_opt)

        scenarios.sort(key=lambda x: -x["tax_saving_eur"])

        scenarios.insert(0, {
            "scenario_id": "baseline",
            "label": "Situação actual",
            "tax_saving_eur": 0.0,
            "tax_saving_pct": 0.0,
            "new_result": baseline["result"],
            "new_effective_rate": baseline["effective_rate"],
            "irs_jovem_exemption": 0.0,
            "actions": [],
            "status": "baseline",
        })

        return scenarios[:9]
