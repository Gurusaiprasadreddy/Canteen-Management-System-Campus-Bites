"""
recommendation_apriori.py
--------------------------
Apriori-based food recommendation engine for Campus Bites.

Two public functions:
  - get_apriori_recommendations()  → for students: "you might also like"
  - get_frequent_combos()          → for management analytics: top item pairs
"""

import logging
from typing import List, Dict, Any, Optional

logger = logging.getLogger(__name__)


def _run_apriori(orders: List[List[str]], min_support: float, min_confidence: float):
    """
    Internal helper that encodes transactions and runs Apriori + association rules.
    Returns (frequent_itemsets_df, rules_df) or (None, None) on failure/insufficient data.
    """
    try:
        from mlxtend.frequent_patterns import apriori, association_rules
        from mlxtend.preprocessing import TransactionEncoder
        import pandas as pd
    except ImportError:
        logger.error("mlxtend is not installed. Run: pip install mlxtend")
        return None, None

    if len(orders) < 10:
        logger.info("Apriori: Not enough transactions (%d < 10), skipping.", len(orders))
        return None, None

    # Encode transactions into a boolean DataFrame
    te = TransactionEncoder()
    te_array = te.fit(orders).transform(orders)
    df = pd.DataFrame(te_array, columns=te.columns_)

    # Find frequent itemsets
    frequent_itemsets = apriori(df, min_support=min_support, use_colnames=True)
    if frequent_itemsets.empty:
        return frequent_itemsets, None

    # Generate association rules
    rules = association_rules(frequent_itemsets, metric="confidence", min_threshold=min_confidence)
    return frequent_itemsets, rules


def get_apriori_recommendations(
    orders: List[List[str]],
    current_items: List[str],
    min_support: float = 0.03,
    min_confidence: float = 0.25,
    top_n: int = 5,
) -> List[Dict[str, Any]]:
    """
    Given a list of historical order transactions and the user's current cart items,
    return up to `top_n` recommended item names with confidence/support/lift scores.

    Args:
        orders:          List of orders; each order is a list of item names.
                         e.g. [["Masala Dosa", "Filter Coffee"], ["Idli", "Sambar"]]
        current_items:   Items currently in the student's cart.
        min_support:     Minimum fraction of orders that must contain an itemset.
        min_confidence:  Minimum P(consequent | antecedent) threshold.
        top_n:           Maximum number of recommendations to return.

    Returns:
        List of dicts: [{"item_name": str, "confidence": float, "support": float, "lift": float}]
    """
    if not current_items:
        return []

    _, rules = _run_apriori(orders, min_support, min_confidence)
    if rules is None or rules.empty:
        return []

    current_set = set(current_items)
    recommendations: Dict[str, Dict[str, Any]] = {}

    for _, rule in rules.iterrows():
        antecedents = set(rule["antecedents"])
        consequents = set(rule["consequents"])

        # Keep only rules whose antecedent is fully covered by the cart
        if antecedents.issubset(current_set):
            new_items = consequents - current_set
            for item in new_items:
                # Keep only the highest-confidence rule for each recommended item
                if item not in recommendations or rule["confidence"] > recommendations[item]["confidence"]:
                    recommendations[item] = {
                        "item_name": item,
                        "confidence": round(float(rule["confidence"]), 3),
                        "support": round(float(rule["support"]), 3),
                        "lift": round(float(rule["lift"]), 3),
                    }

    # Sort by lift (quality of association) then by confidence
    sorted_recs = sorted(
        recommendations.values(),
        key=lambda x: (-x["lift"], -x["confidence"])
    )
    return sorted_recs[:top_n]


def get_frequent_combos(
    orders: List[List[str]],
    min_support: float = 0.03,
    min_confidence: float = 0.25,
    top_n: int = 10,
) -> List[Dict[str, Any]]:
    """
    Returns the top-N most frequent item-pair combinations from order history.
    Used for management analytics (combo analytics dashboard).

    Returns:
        List of dicts: [{"item1": str, "item2": str, "frequency_pct": float,
                          "confidence": float, "lift": float}]
    """
    _, rules = _run_apriori(orders, min_support, min_confidence)
    if rules is None or rules.empty:
        return []

    combos = []
    seen_pairs = set()

    # Sort by lift descending so we get the most interesting combos first
    sorted_rules = rules.sort_values("lift", ascending=False)

    for _, rule in sorted_rules.iterrows():
        ants = sorted(rule["antecedents"])
        cons = sorted(rule["consequents"])

        # Only include simple 1→1 pairs for the management view
        if len(ants) == 1 and len(cons) == 1:
            pair = (ants[0], cons[0])
            reverse = (cons[0], ants[0])
            if pair not in seen_pairs and reverse not in seen_pairs:
                seen_pairs.add(pair)
                combos.append({
                    "item1": ants[0],
                    "item2": cons[0],
                    "frequency_pct": round(float(rule["support"]) * 100, 1),
                    "confidence": round(float(rule["confidence"]), 3),
                    "lift": round(float(rule["lift"]), 3),
                })
                if len(combos) >= top_n:
                    break

    return combos
