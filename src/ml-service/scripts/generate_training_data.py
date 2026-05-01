"""
Gerador de dados de treino para o Assistente Fiscal IA do Gold Lock.

Gera dois datasets sintéticos baseados no CIRS (Lei 82/2023 / OE 2024):
  - data/deduction_training.csv  (~800 linhas) para DeductionAgent
  - data/predictor_training.csv  (~400 linhas) para PredictorAgent

Uso:
    cd src/ml-service
    python scripts/generate_training_data.py
"""

import csv
import os
import random
from pathlib import Path

random.seed(42)

# ── Merchants portugueses por tipo de dedução (Art.º CIRS) ───────────────────

MERCHANTS = {
    "saude_dedutivel": {
        "article": "Art.º 78.º-C CIRS",
        "rate": 0.15,
        "limit": 1000.0,
        "patterns": [
            ("Farmácia Barros", (5, 120)),
            ("Farmácia Central", (5, 150)),
            ("Farmácia Moderna", (3, 90)),
            ("Farmácia São João", (4, 110)),
            ("Farmácia Saúde", (5, 100)),
            ("Hospital CUF", (50, 2000)),
            ("Hospital da Luz", (80, 3000)),
            ("Hospital Particular", (60, 1500)),
            ("Clínica de Saúde", (30, 500)),
            ("Clínica Médica", (25, 400)),
            ("Centro de Saúde", (10, 80)),
            ("Médico Especialista", (50, 300)),
            ("Consulta Médica", (40, 200)),
            ("Dentista Silva", (60, 800)),
            ("Clínica Dentária", (50, 600)),
            ("Ortodontia Lisboa", (80, 1200)),
            ("Óptica Central", (50, 400)),
            ("Óptica Portuguesa", (45, 350)),
            ("Óculos e Lentes", (30, 250)),
            ("Fisioterapia Porto", (30, 120)),
            ("Centro de Fisioterapia", (25, 100)),
            ("Psicólogo Clínico", (50, 120)),
            ("Análises Clínicas", (15, 80)),
            ("Laboratório Germano", (20, 150)),
            ("SONAE Saúde", (10, 60)),
            ("Farmácias Holon", (5, 130)),
            ("Pingo Doce Farmácia", (4, 90)),
            ("Ginecologista", (60, 200)),
            ("Pediatra Aveiro", (40, 160)),
            ("Cirurgia Ambulatório", (100, 5000)),
        ],
    },
    "educacao_dedutivel": {
        "article": "Art.º 78.º-D CIRS",
        "rate": 0.30,
        "limit": 800.0,
        "patterns": [
            ("Universidade de Lisboa", (200, 2000)),
            ("Universidade do Porto", (200, 2000)),
            ("Universidade de Coimbra", (200, 2000)),
            ("UBI - Universidade da Beira", (200, 1800)),
            ("ISCTE", (300, 2500)),
            ("Escola Superior", (150, 1200)),
            ("Instituto Politécnico", (100, 1000)),
            ("Escola Primária Privada", (100, 600)),
            ("Colégio Internacional", (200, 1500)),
            ("Colégio São José", (150, 800)),
            ("Escola Secundária Privada", (80, 500)),
            ("Explicações Matemática", (20, 150)),
            ("Centro de Explicações", (30, 200)),
            ("Aulas de Inglês", (40, 300)),
            ("British Council", (50, 400)),
            ("Escola de Línguas", (30, 250)),
            ("Conservatório de Música", (40, 200)),
            ("Escola de Arte", (35, 180)),
            ("Creche Girassol", (150, 600)),
            ("Jardim de Infância", (120, 500)),
            ("ISEG", (300, 3000)),
            ("Faculdade de Direito", (250, 2000)),
            ("Curso Profissional", (100, 800)),
            ("Formação Profissional", (80, 600)),
            ("Cursos de Informática", (50, 300)),
        ],
    },
    "habitacao_dedutivel": {
        "article": "Art.º 78.º-E CIRS",
        "rate": 0.15,
        "limit": 296.0,
        "patterns": [
            ("BNP Paribas Juros", (80, 400)),
            ("Caixa Geral Juros Habitação", (100, 500)),
            ("Santander Juros Habitação", (90, 450)),
            ("Millennium BCP Hipoteca", (100, 480)),
            ("Novo Banco Juros", (80, 420)),
            ("Crédito Habitação BPI", (90, 460)),
            ("Juros Empréstimo Casa", (70, 380)),
            ("EDP Juros Habitação", (60, 300)),
        ],
    },
    "encargos_gerais_dedutivel": {
        "article": "Art.º 78.º-B CIRS",
        "rate": 0.15,
        "limit": 250.0,
        "patterns": [
            ("McDonald's", (5, 30)),
            ("Pizza Hut", (8, 40)),
            ("Restaurante Central", (10, 60)),
            ("Tasca do Zé", (8, 45)),
            ("Restaurante Português", (12, 70)),
            ("Sushi Lisboa", (15, 80)),
            ("Nando's", (10, 50)),
            ("KFC", (5, 25)),
            ("Burger King", (5, 28)),
            ("Café A Brasileira", (2, 15)),
            ("Pastelaria Garrett", (2, 20)),
            ("Restaurante Solar", (15, 90)),
            ("Pizzaria Roma", (10, 50)),
            ("Marisqueira Ramiro", (20, 150)),
            ("Casa de Pasto", (8, 40)),
        ],
    },
    "ppr_dedutivel": {
        "article": "Art.º 21.º EBF",
        "rate": 0.20,
        "limit": 400.0,
        "patterns": [
            ("Caixa Geral PPR", (500, 3000)),
            ("BCP PPR Investimento", (500, 2500)),
            ("Santander PPR Reforma", (500, 2500)),
            ("BPI Reforma Poupança", (400, 2000)),
            ("Allianz PPR", (400, 2000)),
            ("Fidelidade PPR", (300, 1500)),
            ("Zurich PPR Poupança", (300, 1500)),
            ("GNB PPR Seguro", (400, 2000)),
            ("Generali PPR", (300, 1500)),
        ],
    },
    "nao_dedutivel": {
        "article": "n/a",
        "rate": 0.0,
        "limit": 0.0,
        "patterns": [
            ("Decathlon", (10, 300)),
            ("FNAC", (15, 500)),
            ("Worten", (20, 800)),
            ("Media Markt", (30, 1000)),
            ("H&M", (10, 200)),
            ("Zara", (15, 300)),
            ("Primark", (5, 100)),
            ("Leroy Merlin", (20, 500)),
            ("IKEA", (30, 1000)),
            ("Pingo Doce", (5, 150)),
            ("Continente", (10, 200)),
            ("Lidl", (5, 100)),
            ("Aldi", (5, 100)),
            ("BP Gasolina", (30, 100)),
            ("Galp Combustível", (30, 100)),
            ("Repsol", (30, 100)),
            ("Shell", (30, 100)),
            ("CTT Correios", (2, 30)),
            ("EDP Eletricidade", (50, 200)),
            ("NOS Internet", (20, 60)),
            ("Vodafone", (15, 50)),
            ("MEO", (15, 50)),
            ("Netflix", (8, 16)),
            ("Spotify", (5, 10)),
            ("Amazon", (10, 300)),
            ("Apple Store", (1, 500)),
            ("Google Play", (1, 50)),
            ("Uber", (5, 50)),
            ("Bolt", (3, 30)),
            ("Renters Car", (20, 200)),
            ("Airbnb", (50, 500)),
            ("Booking.com", (50, 400)),
            ("TAP Portugal", (50, 800)),
            ("Ryanair", (20, 300)),
            ("Easyjet", (20, 300)),
            ("CP Comboios", (5, 100)),
            ("Metro Lisboa", (1, 5)),
            ("Supermercado El Corte", (20, 300)),
            ("Sport Lisboa e Benfica", (10, 100)),
            ("Sporting CP", (10, 100)),
            ("Cinema NOS", (5, 30)),
            ("Museu Nacional", (3, 15)),
        ],
    },
}

MONTHS = list(range(1, 13))
AMOUNT_BUCKETS = ["0-50", "51-200", "201-1000", "1000+"]


def amount_to_bucket(amount: float) -> str:
    if amount <= 50:
        return "0-50"
    elif amount <= 200:
        return "51-200"
    elif amount <= 1000:
        return "201-1000"
    return "1000+"


def generate_deduction_dataset(n_samples: int = 800) -> list[dict]:
    rows = []
    deduction_types = list(MERCHANTS.keys())
    # distribuição proporcional: nao_dedutivel tem mais amostras (realismo)
    weights = [1.5, 1.2, 0.8, 1.0, 0.8, 3.0]

    for _ in range(n_samples):
        deduction_type = random.choices(deduction_types, weights=weights, k=1)[0]
        info = MERCHANTS[deduction_type]
        merchant_name, (amt_min, amt_max) = random.choice(info["patterns"])

        # variações de nome para robustez do modelo
        name_variants = [
            merchant_name,
            merchant_name.upper(),
            merchant_name.lower(),
            merchant_name + " Lisboa",
            merchant_name + " Porto",
            merchant_name + " Lda",
            "MB " + merchant_name,
            merchant_name[:max(4, len(merchant_name) - 3)],
        ]
        merchant = random.choice(name_variants[:3] if amt_min > 200 else name_variants)

        amount = round(random.uniform(amt_min, min(amt_max, amt_max)), 2)
        month = random.choice(MONTHS)

        rows.append({
            "merchant": merchant,
            "amount": amount,
            "month": month,
            "amount_bucket": amount_to_bucket(amount),
            "deduction_type": deduction_type,
            "legal_article": info["article"],
            "deduction_rate": info["rate"],
            "deduction_limit_eur": info["limit"],
        })

    return rows


def generate_predictor_dataset(n_profiles: int = 400) -> list[dict]:
    rows = []
    categories = ["saude", "educacao", "habitacao", "restauracao", "ppr"]
    limits = {"saude": 1000, "educacao": 800, "habitacao": 296, "restauracao": 250, "ppr": 400}

    for _ in range(n_profiles):
        month_of_year = random.randint(3, 11)
        profile_type = random.choice(["conservative", "moderate", "aggressive", "zero"])

        row: dict = {"month_of_year": month_of_year}

        for cat in categories:
            limit = limits[cat]

            if profile_type == "zero":
                monthly_base = 0.0
            elif profile_type == "conservative":
                monthly_base = random.uniform(0, limit * 0.05)
            elif profile_type == "moderate":
                monthly_base = random.uniform(limit * 0.04, limit * 0.09)
            else:
                monthly_base = random.uniform(limit * 0.07, limit * 0.15)

            monthly_values = []
            trend = random.uniform(-0.02, 0.03)
            for m in range(1, month_of_year + 1):
                noise = random.gauss(0, monthly_base * 0.2)
                val = max(0, monthly_base * (1 + trend * m) + noise)
                # PPR normalmente em pagamento único no final do ano
                if cat == "ppr" and m != month_of_year:
                    val = 0.0 if random.random() > 0.05 else val
                monthly_values.append(round(val, 2))

            cumulative = sum(monthly_values)
            avg_monthly = cumulative / month_of_year if month_of_year > 0 else 0

            # tendência dos últimos 3 meses (slope linear simplificada)
            if len(monthly_values) >= 3:
                last3 = monthly_values[-3:]
                trend_slope = (last3[2] - last3[0]) / 2
            else:
                trend_slope = 0.0

            # valor real fim-de-ano (o que queremos prever)
            months_remaining = 12 - month_of_year
            noise_factor = random.gauss(1.0, 0.15)
            year_end_actual = round(min(limit * 1.2, cumulative + avg_monthly * months_remaining * noise_factor), 2)

            # sempre 12 colunas mensais — futuros = 0
            all_months = monthly_values + [0.0] * (12 - len(monthly_values))
            for m_idx, val in enumerate(all_months, 1):
                row[f"{cat}_m{m_idx:02d}"] = val
            row[f"{cat}_cumulative"] = round(cumulative, 2)
            row[f"{cat}_avg_monthly"] = round(avg_monthly, 2)
            row[f"{cat}_trend_slope"] = round(trend_slope, 4)
            row[f"{cat}_year_end_actual"] = year_end_actual

        rows.append(row)

    return rows


def write_csv(filepath: str, rows: list[dict]) -> None:
    if not rows:
        return
    Path(filepath).parent.mkdir(parents=True, exist_ok=True)
    with open(filepath, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=rows[0].keys())
        writer.writeheader()
        writer.writerows(rows)


if __name__ == "__main__":
    base_dir = Path(__file__).parent.parent / "data"

    print("A gerar dataset de deduções (DeductionAgent)...")
    deduction_rows = generate_deduction_dataset(n_samples=820)
    deduction_path = str(base_dir / "deduction_training.csv")
    write_csv(deduction_path, deduction_rows)
    print(f"  ✓ {len(deduction_rows)} amostras → {deduction_path}")

    dist: dict = {}
    for r in deduction_rows:
        dist[r["deduction_type"]] = dist.get(r["deduction_type"], 0) + 1
    for k, v in sorted(dist.items()):
        print(f"    {k}: {v}")

    print()
    print("A gerar dataset de previsão (PredictorAgent)...")
    predictor_rows = generate_predictor_dataset(n_profiles=400)
    predictor_path = str(base_dir / "predictor_training.csv")
    write_csv(predictor_path, predictor_rows)
    print(f"  ✓ {len(predictor_rows)} perfis → {predictor_path}")

    print()
    print("Concluído. Próximo passo: arrancar o ml-service e chamar POST /fiscal-assistant/train")
