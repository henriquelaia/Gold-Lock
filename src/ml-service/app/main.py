"""
Gold Lock ML Service
==================
API Flask para categorização automática de transações financeiras
usando TF-IDF + Random Forest.
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
import os

from app.categorizer import TransactionCategorizer

app = Flask(__name__)
CORS(app)

# Inicializar o categorizador
categorizer = TransactionCategorizer()


@app.route('/health', methods=['GET'])
def health():
    """Health check endpoint."""
    return jsonify({
        'status': 'ok',
        'service': 'goldlock-ml-service',
        'model_loaded': categorizer.is_loaded(),
    })


@app.route('/categorize', methods=['POST'])
def categorize():
    """
    Categorizar uma ou mais transações.

    Body:
        transactions: list of { description: str, amount: float }

    Returns:
        predictions: list of { category: str, confidence: float }
    """
    data = request.get_json()

    if not data or 'transactions' not in data:
        return jsonify({'error': 'Campo "transactions" é obrigatório'}), 400

    transactions = data['transactions']

    try:
        predictions = categorizer.predict(transactions)
        return jsonify({'predictions': predictions})
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/retrain', methods=['POST'])
def retrain():
    """
    Re-treinar o modelo com dados corrigidos pelo utilizador.

    Body:
        corrections: list of { description: str, amount: float, category: str }
    """
    data = request.get_json()

    if not data or 'corrections' not in data:
        return jsonify({'error': 'Campo "corrections" é obrigatório'}), 400

    try:
        metrics = categorizer.retrain(data['corrections'])
        return jsonify({
            'status': 'model retrained',
            'metrics': metrics,
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500


if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=True)
